-- Fix the name shadowing bug in user_can_view_session SECURITY DEFINER helper function
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

-- Create update policy for assignees on session_tasks table
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

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
