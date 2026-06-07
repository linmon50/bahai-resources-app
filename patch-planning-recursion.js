import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function fixRecursion() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        console.log('🔧 Fixing RLS infinite recursion in planning_sessions / session_access...\n');

        // ── Step 1: Create SECURITY DEFINER helper functions ─────────────────
        // These run as the DB owner, bypassing RLS, so they can safely read
        // each table without triggering the other table's policy.

        await client.query(`
            -- Checks if a user has any row in session_access for a given session
            -- Used by planning_sessions SELECT policy (reads session_access WITHOUT its RLS)
            CREATE OR REPLACE FUNCTION public.user_has_session_access(
                p_session_id uuid,
                p_user_id    uuid
            )
            RETURNS boolean
            LANGUAGE sql
            SECURITY DEFINER
            SET search_path = public
            STABLE
            AS $$
                SELECT EXISTS (
                    SELECT 1 FROM public.session_access
                    WHERE session_id = p_session_id
                      AND user_id    = p_user_id
                );
            $$;
        `);
        console.log('✅  user_has_session_access() SECURITY DEFINER function created');

        await client.query(`
            -- Checks if a user is the creator or an admin of a session
            -- Used by session_access SELECT policy (reads planning_sessions WITHOUT its RLS)
            CREATE OR REPLACE FUNCTION public.user_can_manage_session(
                p_session_id uuid,
                p_user_id    uuid
            )
            RETURNS boolean
            LANGUAGE sql
            SECURITY DEFINER
            SET search_path = public
            STABLE
            AS $$
                SELECT EXISTS (
                    SELECT 1 FROM public.planning_sessions
                    WHERE id = p_session_id
                      AND (
                          created_by = p_user_id
                          OR is_community_admin(p_user_id, community_id)
                          OR is_global_admin(p_user_id)
                      )
                );
            $$;
        `);
        console.log('✅  user_can_manage_session() SECURITY DEFINER function created');

        // ── Step 2: Rewrite planning_sessions SELECT policy ───────────────────
        // Replace the EXISTS (SELECT 1 FROM session_access ...) with the
        // SECURITY DEFINER function so it doesn't trigger session_access RLS.

        await client.query(`
            DROP POLICY IF EXISTS "Members can view sessions" ON public.planning_sessions;

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
                        OR user_has_session_access(id, auth.uid())
                    )
                )
            );
        `);
        console.log('✅  planning_sessions SELECT policy updated (no more direct session_access join)');

        // ── Step 3: Rewrite session_access SELECT policy ──────────────────────
        // Replace the EXISTS (SELECT 1 FROM planning_sessions ...) with the
        // SECURITY DEFINER function so it doesn't trigger planning_sessions RLS.

        await client.query(`
            DROP POLICY IF EXISTS "Creator or admin can view access list" ON public.session_access;

            CREATE POLICY "Creator or admin can view access list"
            ON public.session_access FOR SELECT
            USING (
                user_id = auth.uid()
                OR user_can_manage_session(session_id, auth.uid())
            );
        `);
        console.log('✅  session_access SELECT policy updated (no more direct planning_sessions join)');

        // ── Step 4: Also fix the ALL policy on session_access for the same reason
        await client.query(`
            DROP POLICY IF EXISTS "Creator or admin can manage access" ON public.session_access;

            CREATE POLICY "Creator or admin can manage access"
            ON public.session_access FOR ALL
            USING (user_can_manage_session(session_id, auth.uid()))
            WITH CHECK (user_can_manage_session(session_id, auth.uid()));
        `);
        console.log('✅  session_access ALL policy updated');

        // ── Step 5: Also fix session_tasks ALL policy for the same reason ─────
        // The old policy did an EXISTS on planning_sessions which could recurse too.
        await client.query(`
            DROP POLICY IF EXISTS "Editors can manage tasks" ON public.session_tasks;

            CREATE OR REPLACE FUNCTION public.user_can_edit_session(
                p_session_id uuid,
                p_user_id    uuid
            )
            RETURNS boolean
            LANGUAGE sql
            SECURITY DEFINER
            SET search_path = public
            STABLE
            AS $$
                SELECT EXISTS (
                    SELECT 1 FROM public.planning_sessions
                    WHERE id = p_session_id
                      AND (
                          created_by = p_user_id
                          OR is_community_admin(p_user_id, community_id)
                          OR is_global_admin(p_user_id)
                      )
                )
                OR EXISTS (
                    SELECT 1 FROM public.session_access
                    WHERE session_id = p_session_id
                      AND user_id    = p_user_id
                      AND role       = 'editor'
                );
            $$;

            CREATE POLICY "Editors can manage tasks"
            ON public.session_tasks FOR ALL
            USING (user_can_edit_session(session_id, auth.uid()))
            WITH CHECK (user_can_edit_session(session_id, auth.uid()));
        `);
        console.log('✅  session_tasks ALL policy updated with SECURITY DEFINER function');

        // ── Step 6: Fix session_tasks SELECT policy too ────────────────────────
        await client.query(`
            DROP POLICY IF EXISTS "Session members can view tasks" ON public.session_tasks;

            CREATE OR REPLACE FUNCTION public.user_can_view_session(
                p_session_id uuid,
                p_user_id    uuid
            )
            RETURNS boolean
            LANGUAGE sql
            SECURITY DEFINER
            SET search_path = public
            STABLE
            AS $$
                SELECT EXISTS (
                    SELECT 1 FROM public.planning_sessions
                    WHERE id = p_session_id
                      AND (
                          is_global_admin(p_user_id)
                          OR (
                              community_id IN (
                                  SELECT community_id FROM public.memberships
                                  WHERE user_id = p_user_id AND approved = true
                              )
                              AND (
                                  is_hidden = false
                                  OR created_by = p_user_id
                                  OR is_community_admin(p_user_id, community_id)
                                  OR EXISTS (
                                      SELECT 1 FROM public.session_access sa
                                      WHERE sa.session_id = id AND sa.user_id = p_user_id
                                  )
                              )
                          )
                      )
                );
            $$;

            CREATE POLICY "Session members can view tasks"
            ON public.session_tasks FOR SELECT
            USING (user_can_view_session(session_id, auth.uid()));
        `);
        console.log('✅  session_tasks SELECT policy updated');

        await client.query(`NOTIFY pgrst, 'reload schema';`);
        console.log('\n🎉 Infinite recursion fixed! All policies now use SECURITY DEFINER functions.');

    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error(err);
    } finally {
        await client.end();
    }
}

fixRecursion();
