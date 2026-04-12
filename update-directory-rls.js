import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function updateDirectoryRLS() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();

    try {
        console.log('Applying Directory Visibility Fixes...');

        // 1. Add is_private column to profiles
        await client.query(`
            ALTER TABLE public.profiles 
            ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
        `);
        console.log('✅ Added is_private column to profiles');

        // 2. Update memberships SELECT policy
        // We want: Approved members can see other approved members in the same community.
        await client.query(`
            DROP POLICY IF EXISTS "View memberships" ON public.memberships;
            CREATE POLICY "View memberships" ON public.memberships
            FOR SELECT
            USING (
                is_global_admin(auth.uid()) 
                OR (user_id = auth.uid()) 
                OR (community_id IN (
                    SELECT m.community_id FROM public.memberships m 
                    WHERE m.user_id = auth.uid() AND m.approved = true
                ))
            );
        `);
        console.log('✅ Updated memberships SELECT policy');

        // 3. Update profiles SELECT policy
        // We want: Same logic as before, but also respect is_private flag for others.
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
                        JOIN public.memberships m2 ON m1.community_id = m2.community_id
                        WHERE m1.user_id = auth.uid() AND m1.approved = true
                        AND m2.user_id = public.profiles.user_id AND m2.approved = true
                    )
                )
            );
        `);
        console.log('✅ Updated profiles SELECT policy');

        // 4. Update directory_view to filter private profiles
        await client.query(`
            DROP VIEW IF EXISTS public.directory_view;
            CREATE VIEW public.directory_view AS
            SELECT 
                p.user_id,
                p.display_name,
                p.avatar_url,
                p.is_private,
                CASE WHEN (p.show_bio OR p.user_id = auth.uid() OR is_global_admin(auth.uid())) THEN p.bio ELSE NULL END as bio,
                CASE WHEN (p.show_contact_info OR p.user_id = auth.uid() OR is_global_admin(auth.uid())) THEN p.phone ELSE NULL END as phone,
                CASE WHEN (p.show_contact_info OR p.user_id = auth.uid() OR is_global_admin(auth.uid())) THEN p.contact_email ELSE NULL END as contact_email,
                CASE WHEN (p.show_contact_info OR p.user_id = auth.uid() OR is_global_admin(auth.uid())) THEN p.contact_preferences ELSE NULL END as contact_preferences,
                p.show_bio,
                p.show_contact_info,
                p.show_skills,
                p.show_experiences,
                CASE WHEN (p.show_skills OR p.user_id = auth.uid() OR is_global_admin(auth.uid())) THEN p.experience_roles ELSE '[]'::jsonb END as experience_roles,
                CASE WHEN (p.show_skills OR p.user_id = auth.uid() OR is_global_admin(auth.uid())) THEN p.talents_and_abilities ELSE '[]'::jsonb END as talents_and_abilities,
                CASE WHEN (p.show_skills OR p.user_id = auth.uid() OR is_global_admin(auth.uid())) THEN p.materials ELSE '[]'::jsonb END as materials,
                COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                        'community_id', m.community_id,
                        'communities', jsonb_build_object('name', c.name)
                    ))
                    FROM public.memberships m
                    JOIN public.communities c ON m.community_id = c.id
                    WHERE m.user_id = p.user_id AND m.approved = true
                ), '[]'::jsonb) as memberships
            FROM public.profiles p
            WHERE p.is_private = false OR p.user_id = auth.uid() OR is_global_admin(auth.uid());
        `);
        console.log('✅ Updated directory_view');

    } catch (e) {
        console.error('❌ Update failed:', e);
    } finally {
        await client.end();
    }
}
updateDirectoryRLS();
