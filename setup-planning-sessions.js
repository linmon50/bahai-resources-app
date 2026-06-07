import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function setupPlanningSessions() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        console.log('🔧 Setting up Planning Sessions schema...\n');

        // ── Table 1: planning_sessions ─────────────────────────────────────────
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.planning_sessions (
                id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                community_id  uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
                title         text NOT NULL,
                description   text,
                status        text NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'completed', 'archived')),
                starts_at     timestamptz,
                ends_at       timestamptz,
                is_hidden     boolean NOT NULL DEFAULT false,
                notes         text,
                links         jsonb NOT NULL DEFAULT '[]'::jsonb,
                created_by    uuid NOT NULL REFERENCES auth.users(id),
                created_at    timestamptz NOT NULL DEFAULT now(),
                archived_at   timestamptz
            );
        `);
        console.log('✅  planning_sessions table');

        // ── Table 2: session_tasks ─────────────────────────────────────────────
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.session_tasks (
                id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                session_id        uuid NOT NULL REFERENCES public.planning_sessions(id) ON DELETE CASCADE,
                parent_task_id    uuid REFERENCES public.session_tasks(id) ON DELETE CASCADE,
                title             text NOT NULL,
                description       text,
                assigned_to       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
                assigned_to_name  text,
                status            text NOT NULL DEFAULT 'not_started'
                                    CHECK (status IN ('not_started', 'in_progress', 'done')),
                due_date          date,
                sort_order        integer NOT NULL DEFAULT 0,
                created_at        timestamptz NOT NULL DEFAULT now()
            );
        `);
        console.log('✅  session_tasks table');

        // ── Table 3: session_access ────────────────────────────────────────────
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.session_access (
                id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                session_id uuid NOT NULL REFERENCES public.planning_sessions(id) ON DELETE CASCADE,
                user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                role       text NOT NULL DEFAULT 'viewer'
                             CHECK (role IN ('editor', 'viewer')),
                granted_by uuid REFERENCES auth.users(id),
                granted_at timestamptz NOT NULL DEFAULT now(),
                CONSTRAINT session_access_unique UNIQUE (session_id, user_id)
            );
        `);
        console.log('✅  session_access table');

        // ── RLS ───────────────────────────────────────────────────────────────
        await client.query(`
            ALTER TABLE public.planning_sessions ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.session_tasks     ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.session_access    ENABLE ROW LEVEL SECURITY;
        `);
        console.log('✅  RLS enabled');

        // ── planning_sessions policies ────────────────────────────────────────
        await client.query(`
            DROP POLICY IF EXISTS "Members can view sessions"         ON public.planning_sessions;
            DROP POLICY IF EXISTS "Members can create sessions"       ON public.planning_sessions;
            DROP POLICY IF EXISTS "Editors can update session"        ON public.planning_sessions;
            DROP POLICY IF EXISTS "Creator or admin can delete session" ON public.planning_sessions;

            CREATE POLICY "Members can view sessions"
            ON public.planning_sessions FOR SELECT
            USING (
                is_global_admin(auth.uid())
                OR (
                    community_id IN (
                        SELECT community_id FROM public.memberships
                        WHERE user_id = auth.uid() AND approved = true
                    )
                    AND (
                        is_hidden = false
                        OR created_by = auth.uid()
                        OR is_community_admin(auth.uid(), community_id)
                        OR EXISTS (
                            SELECT 1 FROM public.session_access sa
                            WHERE sa.session_id = id AND sa.user_id = auth.uid()
                        )
                    )
                )
            );

            CREATE POLICY "Members can create sessions"
            ON public.planning_sessions FOR INSERT
            WITH CHECK (
                community_id IN (
                    SELECT community_id FROM public.memberships
                    WHERE user_id = auth.uid() AND approved = true
                )
                AND created_by = auth.uid()
            );

            CREATE POLICY "Editors can update session"
            ON public.planning_sessions FOR UPDATE
            USING (
                created_by = auth.uid()
                OR is_community_admin(auth.uid(), community_id)
                OR is_global_admin(auth.uid())
                OR EXISTS (
                    SELECT 1 FROM public.session_access sa
                    WHERE sa.session_id = id AND sa.user_id = auth.uid() AND sa.role = 'editor'
                )
            );

            CREATE POLICY "Creator or admin can delete session"
            ON public.planning_sessions FOR DELETE
            USING (
                created_by = auth.uid()
                OR is_community_admin(auth.uid(), community_id)
                OR is_global_admin(auth.uid())
            );
        `);
        console.log('✅  planning_sessions RLS policies');

        // ── session_tasks policies ─────────────────────────────────────────────
        await client.query(`
            DROP POLICY IF EXISTS "Session members can view tasks" ON public.session_tasks;
            DROP POLICY IF EXISTS "Editors can manage tasks"       ON public.session_tasks;

            CREATE POLICY "Session members can view tasks"
            ON public.session_tasks FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.planning_sessions ps
                    WHERE ps.id = session_id
                        AND (
                            is_global_admin(auth.uid())
                            OR (
                                ps.community_id IN (
                                    SELECT community_id FROM public.memberships
                                    WHERE user_id = auth.uid() AND approved = true
                                )
                                AND (
                                    ps.is_hidden = false
                                    OR ps.created_by = auth.uid()
                                    OR is_community_admin(auth.uid(), ps.community_id)
                                    OR EXISTS (
                                        SELECT 1 FROM public.session_access sa
                                        WHERE sa.session_id = ps.id AND sa.user_id = auth.uid()
                                    )
                                )
                            )
                        )
                )
            );

            CREATE POLICY "Editors can manage tasks"
            ON public.session_tasks FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM public.planning_sessions ps
                    WHERE ps.id = session_id
                        AND (
                            ps.created_by = auth.uid()
                            OR is_community_admin(auth.uid(), ps.community_id)
                            OR is_global_admin(auth.uid())
                            OR EXISTS (
                                SELECT 1 FROM public.session_access sa
                                WHERE sa.session_id = ps.id
                                    AND sa.user_id = auth.uid()
                                    AND sa.role = 'editor'
                            )
                        )
                )
            );
        `);
        console.log('✅  session_tasks RLS policies');

        // ── session_access policies ────────────────────────────────────────────
        await client.query(`
            DROP POLICY IF EXISTS "Creator or admin can view access list" ON public.session_access;
            DROP POLICY IF EXISTS "Creator or admin can manage access"    ON public.session_access;

            CREATE POLICY "Creator or admin can view access list"
            ON public.session_access FOR SELECT
            USING (
                user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.planning_sessions ps
                    WHERE ps.id = session_id
                        AND (
                            ps.created_by = auth.uid()
                            OR is_community_admin(auth.uid(), ps.community_id)
                            OR is_global_admin(auth.uid())
                        )
                )
            );

            CREATE POLICY "Creator or admin can manage access"
            ON public.session_access FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM public.planning_sessions ps
                    WHERE ps.id = session_id
                        AND (
                            ps.created_by = auth.uid()
                            OR is_community_admin(auth.uid(), ps.community_id)
                            OR is_global_admin(auth.uid())
                        )
                )
            );
        `);
        console.log('✅  session_access RLS policies');

        await client.query(`NOTIFY pgrst, 'reload schema';`);
        console.log('\n🎉 Planning Sessions schema fully applied!');

    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error(err);
    } finally {
        await client.end();
    }
}

setupPlanningSessions();
