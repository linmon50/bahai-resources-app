import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function patchPolicies() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        console.log('🔧 Patching Planning Sessions RLS policies for global admins...\n');

        // Fix planning_sessions INSERT — allow global admins to create sessions
        await client.query(`
            DROP POLICY IF EXISTS "Members can create sessions" ON public.planning_sessions;

            CREATE POLICY "Members can create sessions"
            ON public.planning_sessions FOR INSERT
            WITH CHECK (
                is_global_admin(auth.uid())
                OR (
                    community_id IN (
                        SELECT community_id FROM public.memberships
                        WHERE user_id = auth.uid() AND approved = true
                    )
                    AND created_by = auth.uid()
                )
            );
        `);
        console.log('✅  planning_sessions INSERT policy updated');

        // Fix session_tasks INSERT/UPDATE/DELETE — global admin already covered in the
        // USING clause via is_global_admin(), but the WITH CHECK was implicit.
        // Re-drop and re-create to be explicit:
        await client.query(`
            DROP POLICY IF EXISTS "Editors can manage tasks" ON public.session_tasks;

            CREATE POLICY "Editors can manage tasks"
            ON public.session_tasks FOR ALL
            USING (
                is_global_admin(auth.uid())
                OR EXISTS (
                    SELECT 1 FROM public.planning_sessions ps
                    WHERE ps.id = session_id
                        AND (
                            ps.created_by = auth.uid()
                            OR is_community_admin(auth.uid(), ps.community_id)
                            OR EXISTS (
                                SELECT 1 FROM public.session_access sa
                                WHERE sa.session_id = ps.id
                                    AND sa.user_id = auth.uid()
                                    AND sa.role = 'editor'
                            )
                        )
                )
            )
            WITH CHECK (
                is_global_admin(auth.uid())
                OR EXISTS (
                    SELECT 1 FROM public.planning_sessions ps
                    WHERE ps.id = session_id
                        AND (
                            ps.created_by = auth.uid()
                            OR is_community_admin(auth.uid(), ps.community_id)
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
        console.log('✅  session_tasks ALL policy updated');

        // Fix session_access management — global admin already in USING, add WITH CHECK
        await client.query(`
            DROP POLICY IF EXISTS "Creator or admin can manage access" ON public.session_access;

            CREATE POLICY "Creator or admin can manage access"
            ON public.session_access FOR ALL
            USING (
                is_global_admin(auth.uid())
                OR EXISTS (
                    SELECT 1 FROM public.planning_sessions ps
                    WHERE ps.id = session_id
                        AND (
                            ps.created_by = auth.uid()
                            OR is_community_admin(auth.uid(), ps.community_id)
                        )
                )
            )
            WITH CHECK (
                is_global_admin(auth.uid())
                OR EXISTS (
                    SELECT 1 FROM public.planning_sessions ps
                    WHERE ps.id = session_id
                        AND (
                            ps.created_by = auth.uid()
                            OR is_community_admin(auth.uid(), ps.community_id)
                        )
                )
            );
        `);
        console.log('✅  session_access ALL policy updated');

        await client.query(`NOTIFY pgrst, 'reload schema';`);
        console.log('\n🎉 Patch applied — global admins can now create and manage planning sessions!');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await client.end();
    }
}

patchPolicies();
