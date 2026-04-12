import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function fixModerationRLS() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();

    try {
        console.log('Fixing Moderation RLS Policies...');

        // 1. Create a helper to check if an admin manages a user's community
        await client.query(`
            CREATE OR REPLACE FUNCTION public.is_admin_of_user(p_admin_uid uuid, p_target_uid uuid)
            RETURNS boolean
            LANGUAGE sql
            SECURITY DEFINER
            SET search_path TO 'public'
            AS $function$
              SELECT EXISTS (
                SELECT 1
                FROM memberships m_admin
                JOIN memberships m_target ON m_admin.community_id = m_target.community_id
                WHERE m_admin.user_id = p_admin_uid
                  AND m_admin.role IN ('admin', 'global_admin')
                  AND m_admin.approved = true
                  AND m_target.user_id = p_target_uid
                  AND m_target.approved = true
              );
            $function$;
        `);
        console.log('✅ Created is_admin_of_user function');

        // 2. Update profiles SELECT policy to allow admins to see their managed members
        await client.query(`
            DROP POLICY IF EXISTS "View profiles" ON public.profiles;
            CREATE POLICY "View profiles" ON public.profiles
            FOR SELECT
            USING (
                (auth.uid() = user_id) 
                OR is_global_admin(auth.uid()) 
                OR is_admin_of_user(auth.uid(), user_id) -- Admins see their members
                OR (
                    is_private = false AND
                    EXISTS (
                        SELECT 1 FROM public.memberships m1
                        WHERE m1.user_id = auth.uid() 
                        AND m1.approved = true
                        AND is_approved_member_of_community(public.profiles.user_id, m1.community_id)
                    )
                )
            );
        `);
        console.log('✅ Updated profiles SELECT policy (Admin access included)');

        // 3. Update bulletin_posts policies to use secure helper functions
        // This resolves the issue where admins couldn't see 'pending' posts.
        await client.query(`
            DROP POLICY IF EXISTS "Users can view approved posts and their own posts" ON public.bulletin_posts;
            CREATE POLICY "Users can view approved posts and their own posts" ON public.bulletin_posts
            FOR SELECT
            USING (
                is_global_admin(auth.uid()) 
                OR (author_id = auth.uid()) 
                OR is_community_admin(auth.uid(), community_id) -- Admins see pending AND approved
                OR (status = 'approved' AND EXISTS (
                    SELECT 1 FROM memberships m 
                    WHERE m.user_id = auth.uid() 
                    AND m.community_id = bulletin_posts.community_id 
                    AND m.approved = true
                ))
            );

            DROP POLICY IF EXISTS "Admins can update posts" ON public.bulletin_posts;
            CREATE POLICY "Admins can update posts" ON public.bulletin_posts
            FOR UPDATE
            USING (
                is_global_admin(auth.uid()) 
                OR is_community_admin(auth.uid(), community_id)
            );

            DROP POLICY IF EXISTS "Authors and Admins can delete posts" ON public.bulletin_posts;
            CREATE POLICY "Authors and Admins can delete posts" ON public.bulletin_posts
            FOR DELETE
            USING (
                (author_id = auth.uid()) 
                OR is_global_admin(auth.uid()) 
                OR is_community_admin(auth.uid(), community_id)
            );
        `);
        console.log('✅ Updated bulletin_posts policies (Hardened visibility)');

    } catch (e) {
        console.error('❌ Update failed:', e);
    } finally {
        await client.end();
    }
}
fixModerationRLS();
