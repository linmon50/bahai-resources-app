import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function applySecurityPatches() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        
        console.log('1. Patching profile_experiences RLS...');
        await client.query(`
            DROP POLICY IF EXISTS "Users can view community experiences" ON public.profile_experiences;
            CREATE POLICY "Users can view community experiences" 
            ON public.profile_experiences FOR SELECT 
            USING (
              (auth.uid() = user_id) 
              OR public.is_global_admin(auth.uid()) 
              OR (
                is_visible = true AND EXISTS (
                  SELECT 1 FROM public.memberships m1 
                  JOIN public.memberships m2 ON m1.community_id = m2.community_id 
                  WHERE m1.user_id = auth.uid() 
                    AND m1.approved = true 
                    AND m2.user_id = profile_experiences.user_id 
                    AND m2.approved = true
                )
              )
            );
        `);

        console.log('2. Creating strict sanitized view public.directory_view...');
        await client.query(`
            CREATE OR REPLACE VIEW public.directory_view WITH (security_invoker=true) AS
            SELECT 
                p.user_id,
                p.display_name,
                p.avatar_url,
                CASE WHEN p.show_bio OR p.user_id = auth.uid() OR public.is_global_admin(auth.uid()) THEN p.bio ELSE null END AS bio,
                CASE WHEN p.show_contact_info OR p.user_id = auth.uid() OR public.is_global_admin(auth.uid()) THEN p.phone ELSE null END AS phone,
                CASE WHEN p.show_contact_info OR p.user_id = auth.uid() OR public.is_global_admin(auth.uid()) THEN p.contact_email ELSE null END AS contact_email,
                CASE WHEN p.show_contact_info OR p.user_id = auth.uid() OR public.is_global_admin(auth.uid()) THEN p.contact_preferences ELSE null END AS contact_preferences,
                p.show_bio,
                p.show_contact_info,
                p.show_skills,
                p.show_experiences,
                CASE WHEN p.show_skills OR p.user_id = auth.uid() OR public.is_global_admin(auth.uid()) THEN p.experience_roles ELSE '[]'::jsonb END AS experience_roles,
                CASE WHEN p.show_skills OR p.user_id = auth.uid() OR public.is_global_admin(auth.uid()) THEN p.talents_and_abilities ELSE '[]'::jsonb END AS talents_and_abilities,
                CASE WHEN p.show_skills OR p.user_id = auth.uid() OR public.is_global_admin(auth.uid()) THEN p.materials ELSE '[]'::jsonb END AS materials,
                COALESCE(
                  (
                     SELECT jsonb_agg(jsonb_build_object('community_id', m.community_id, 'communities', jsonb_build_object('name', c.name)))
                     FROM public.memberships m
                     JOIN public.communities c ON m.community_id = c.id
                     WHERE m.user_id = p.user_id AND m.approved = true
                  ), '[]'::jsonb
                ) AS memberships
            FROM public.profiles p;

            -- Notify PostgREST to reload schema to recognize the new view
            NOTIFY pgrst, 'reload schema';
        `);

        console.log('✅ Security patches applied successfully.');
    } catch (err) {
        console.error('❌ Error applying security patches:', err);
    } finally {
        await client.end();
    }
}

applySecurityPatches();
