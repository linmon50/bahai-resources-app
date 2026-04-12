import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function refineAdminHelpers() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();

    try {
        console.log('Refining Administrative Helper Functions...');

        // 1. Update is_community_admin to include admin_level
        await client.query(`
            CREATE OR REPLACE FUNCTION public.is_community_admin(uid uuid, cid uuid)
            RETURNS boolean
            LANGUAGE sql
            SECURITY DEFINER
            SET search_path TO 'public'
            AS $function$
              SELECT EXISTS (
                SELECT 1
                FROM memberships
                WHERE user_id = uid
                  AND community_id = cid
                  AND (role IN ('admin', 'global_admin') OR admin_level > 0)
                  AND approved = true
              );
            $function$;
        `);
        console.log('✅ Updated is_community_admin (now includes admin_level)');

        // 2. Update is_admin_of_user to include admin_level
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
                  AND (m_admin.role IN ('admin', 'global_admin') OR m_admin.admin_level > 0)
                  AND m_admin.approved = true
                  AND m_target.user_id = p_target_uid
                  AND m_target.approved = true
              );
            $function$;
        `);
        console.log('✅ Updated is_admin_of_user (now includes admin_level)');

        // 3. Re-apply policies to be safe (they already reference these functions by name, but let's be explicit)
        console.log('Synchronizing RLS policies...');
        await client.query(`
            -- Profiles
            DROP POLICY IF EXISTS "View profiles" ON public.profiles;
            CREATE POLICY "View profiles" ON public.profiles
            FOR SELECT
            USING (
                (auth.uid() = user_id) 
                OR is_global_admin(auth.uid()) 
                OR is_admin_of_user(auth.uid(), user_id)
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

            -- Bulletin Posts
            DROP POLICY IF EXISTS "Users can view approved posts and their own posts" ON public.bulletin_posts;
            CREATE POLICY "Users can view approved posts and their own posts" ON public.bulletin_posts
            FOR SELECT
            USING (
                is_global_admin(auth.uid()) 
                OR (author_id = auth.uid()) 
                OR is_community_admin(auth.uid(), community_id)
                OR (status = 'approved' AND EXISTS (
                    SELECT 1 FROM memberships m 
                    WHERE m.user_id = auth.uid() 
                    AND m.community_id = bulletin_posts.community_id 
                    AND m.approved = true
                ))
            );
        `);
        console.log('✅ RLS synchronization complete');

    } catch (e) {
        console.error('❌ Update failed:', e);
    } finally {
        await client.end();
    }
}
refineAdminHelpers();
