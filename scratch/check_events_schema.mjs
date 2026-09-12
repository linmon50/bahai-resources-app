import pg from 'pg';
const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function run() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        
        console.log("Creating table public.session_events...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.session_events (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                session_id uuid NOT NULL REFERENCES public.planning_sessions(id) ON DELETE CASCADE,
                created_by uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
                created_at timestamp with time zone NOT NULL DEFAULT now(),
                title text NOT NULL,
                description text,
                start_time timestamp with time zone NOT NULL,
                end_time timestamp with time zone NOT NULL,
                location text
            );
        `);
        console.log("Table created.");

        console.log("Enabling RLS...");
        await client.query(`
            ALTER TABLE public.session_events ENABLE ROW LEVEL SECURITY;
        `);
        console.log("RLS enabled.");

        console.log("Creating policies...");
        await client.query(`
            DROP POLICY IF EXISTS "Session members can view events" ON public.session_events;
            CREATE POLICY "Session members can view events" ON public.session_events
                FOR SELECT USING (user_can_view_session(session_id, auth.uid()));

            DROP POLICY IF EXISTS "Editors can manage events" ON public.session_events;
            CREATE POLICY "Editors can manage events" ON public.session_events
                FOR ALL USING (user_can_edit_session(session_id, auth.uid()))
                WITH CHECK (user_can_edit_session(session_id, auth.uid()));
        `);
        console.log("Policies created successfully.");

    } catch (e) {
        console.error("Failed:", e);
    } finally {
        await client.end();
    }
}
run();
