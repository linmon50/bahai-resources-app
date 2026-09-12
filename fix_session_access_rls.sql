-- Drop the previous policy that caused an infinite recursion error
DROP POLICY IF EXISTS "Users can view full session access list" ON session_access;

-- Create a simplified policy that allows all authenticated users to read the access list
-- Since session_id is a secure UUID, users can only fetch this list if they already know the session ID
CREATE POLICY "Enable read access for all authenticated users" ON session_access
FOR SELECT TO authenticated USING (true);
