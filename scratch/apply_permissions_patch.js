import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

const SQL_MIGRATION = `
-- 1. Fix user_can_view_session name shadowing (change sa.session_id = id to sa.session_id = p_session_id)
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
                          WHERE sa.session_id = p_session_id AND sa.user_id = p_user_id
                      )
                  )
              )
          )
    );
$$;

-- 2. Drop existing assignee update policy if any, and create the assignee update policy
DROP POLICY IF EXISTS "Users can update tasks assigned to them" ON public.session_tasks;
CREATE POLICY "Users can update tasks assigned to them"
ON public.session_tasks
FOR UPDATE
TO authenticated
USING (
    assigned_to = auth.uid()
    AND user_can_view_session(session_id, auth.uid())
)
WITH CHECK (
    assigned_to = auth.uid()
    AND user_can_view_session(session_id, auth.uid())
);

NOTIFY pgrst, 'reload schema';
`;

async function runPatch() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        console.log('🔧 Connecting to database and running patch...');
        await client.query(SQL_MIGRATION);
        console.log('🎉 Database RLS and SQL function patch applied successfully!');
    } catch (err) {
        console.error('❌ Error applying patch:', err);
    } finally {
        await client.end();
    }
}

runPatch();
