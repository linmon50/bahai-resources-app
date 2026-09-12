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
        console.log("Connected to DB. Running migration...");

        // 1. Add first_name and last_name columns
        await client.query(`
            ALTER TABLE public.invite_requests 
            ADD COLUMN IF NOT EXISTS first_name TEXT,
            ADD COLUMN IF NOT EXISTS last_name TEXT;
        `);
        console.log("Added first_name and last_name columns to public.invite_requests.");

        // 2. Drop existing functions (need to drop because signature changes due to RETURNS TABLE change)
        await client.query(`
            DROP FUNCTION IF EXISTS public.get_invite_requests();
            DROP FUNCTION IF EXISTS public.get_invite_requests(uuid);
        `);
        console.log("Dropped old get_invite_requests functions.");

        // 3. Recreate public.get_invite_requests()
        await client.query(`
            CREATE OR REPLACE FUNCTION public.get_invite_requests()
            RETURNS TABLE(
                id uuid, 
                email text, 
                zip_code text, 
                message text, 
                community_id uuid, 
                community_name text, 
                status text, 
                created_at timestamp with time zone,
                first_name text,
                last_name text
            )
            LANGUAGE plpgsql
            SECURITY DEFINER
            AS $$
            BEGIN
                RETURN QUERY
                SELECT ir.id, ir.email, ir.zip_code, ir.message, ir.community_id, c.name, ir.status, ir.created_at, ir.first_name, ir.last_name
                FROM public.invite_requests ir
                LEFT JOIN public.communities c ON ir.community_id = c.id
                WHERE is_global_admin(auth.uid()) 
                   OR is_community_admin(auth.uid(), ir.community_id)
                   OR (ir.community_id IS NULL AND is_global_admin(auth.uid()));
            END; $$;
        `);
        console.log("Recreated public.get_invite_requests().");

        // 4. Recreate public.get_invite_requests(uuid)
        await client.query(`
            CREATE OR REPLACE FUNCTION public.get_invite_requests(p_community_id uuid)
            RETURNS TABLE(
                id uuid, 
                email text, 
                zip_code text, 
                message text, 
                community_id uuid, 
                community_name text, 
                status text, 
                created_at timestamp with time zone,
                first_name text,
                last_name text
            )
            LANGUAGE plpgsql
            SECURITY DEFINER
            AS $$
            BEGIN
                RETURN QUERY
                SELECT ir.id, ir.email, ir.zip_code, ir.message, ir.community_id, c.name, ir.status, ir.created_at, ir.first_name, ir.last_name
                FROM public.invite_requests ir
                LEFT JOIN public.communities c ON ir.community_id = c.id
                WHERE (
                    -- Global admin can see requests for this community OR general requests
                    is_global_admin(auth.uid()) AND (ir.community_id = p_community_id OR ir.community_id IS NULL)
                ) OR (
                    -- Local admin can see requests ONLY for this community
                    is_community_admin(auth.uid(), p_community_id) AND ir.community_id = p_community_id
                );
            END; $$;
        `);
        console.log("Recreated public.get_invite_requests(uuid).");

        // 5. Grant execute permissions
        await client.query(`
            GRANT EXECUTE ON FUNCTION public.get_invite_requests() TO authenticated;
            GRANT EXECUTE ON FUNCTION public.get_invite_requests(uuid) TO authenticated;
        `);
        console.log("Granted execute permissions on functions to authenticated users.");

    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await client.end();
    }
}

run();
