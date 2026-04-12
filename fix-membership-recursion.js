import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function fixMembershipRecursion() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();

    try {
        console.log('Fixing Membership RLS Recursion...');

        // 1. Create a helper function that bypasses RLS (SECURITY DEFINER)
        await client.query(`
            CREATE OR REPLACE FUNCTION public.is_approved_member_of_community(p_uid uuid, p_cid uuid)
            RETURNS boolean
            LANGUAGE sql
            SECURITY DEFINER
            SET search_path TO 'public'
            AS $function$
              SELECT EXISTS (
                SELECT 1
                FROM memberships
                WHERE user_id = p_uid
                  AND community_id = p_cid
                  AND approved = true
              );
            $function$;
        `);
        console.log('✅ Created is_approved_member_of_community function');

        // 2. Update Memberships RLS to avoid recursion
        // We use the new function for cross-member visibility
        await client.query(`
            DROP POLICY IF EXISTS "View memberships" ON public.memberships;
            CREATE POLICY "View memberships" ON public.memberships
            FOR SELECT
            USING (
                is_global_admin(auth.uid()) 
                OR (user_id = auth.uid()) 
                OR is_approved_member_of_community(auth.uid(), community_id)
            );
        `);
        console.log('✅ Updated memberships SELECT policy (Recursion Fixed)');

        // 3. Update Profiles RLS for consistency
        await client.query(`
            DROP POLICY IF EXISTS "View profiles" ON public.profiles;
            CREATE POLICY "View profiles" ON public.profiles
            FOR SELECT
            USING (
                (auth.uid() = user_id) 
                OR is_global_admin(auth.uid()) 
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
        console.log('✅ Updated profiles SELECT policy');

    } catch (e) {
        console.error('❌ Fix failed:', e);
    } finally {
        await client.end();
    }
}
fixMembershipRecursion();
