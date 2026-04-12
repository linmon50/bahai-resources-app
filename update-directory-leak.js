import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function updateDirectoryLeak() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();

    try {
        console.log('Fixing Community Directory Privacy Leak...');

        // We drop and recreate the view with the community filter.
        // It now only shows profiles that:
        // 1. Are NOT private AND share an approved community with the viewer
        // 2. OR belong to the viewer (self)
        // 3. OR the viewer is a global admin
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
                
                -- We only show memberships for communities that both share (or all if admin/self)
                COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                        'community_id', m.community_id,
                        'communities', jsonb_build_object('name', c.name)
                    ))
                    FROM public.memberships m
                    JOIN public.communities c ON m.community_id = c.id
                    WHERE m.user_id = p.user_id 
                    AND m.approved = true
                    AND (
                        is_global_admin(auth.uid())
                        OR p.user_id = auth.uid()
                        OR m.community_id IN (
                            SELECT m_viewer.community_id 
                            FROM public.memberships m_viewer 
                            WHERE m_viewer.user_id = auth.uid() AND m_viewer.approved = true
                        )
                    )
                ), '[]'::jsonb) as memberships
            FROM public.profiles p
            WHERE (
                p.is_private = false 
                AND (
                    is_global_admin(auth.uid())
                    OR EXISTS (
                        SELECT 1 FROM public.memberships m_viewer
                        JOIN public.memberships m_target ON m_viewer.community_id = m_target.community_id
                        WHERE m_viewer.user_id = auth.uid() AND m_viewer.approved = true
                        AND m_target.user_id = p.user_id AND m_target.approved = true
                    )
                )
            )
            OR p.user_id = auth.uid() 
            OR is_global_admin(auth.uid());
        `);
        console.log('✅ Updated directory_view with community isolation');

    } catch (e) {
        console.error('❌ Update failed:', e);
    } finally {
        await client.end();
    }
}
updateDirectoryLeak();
