-- Migration: Resolve Supabase Security Definer warning on directory_view
-- Drop and recreate public.directory_view with security_invoker=true

DROP VIEW IF EXISTS public.directory_view;

CREATE VIEW public.directory_view WITH (security_invoker=true) AS
SELECT 
    p.user_id,
    p.display_name,
    p.avatar_url,
    p.is_private,
    CASE
        WHEN (p.show_bio OR (p.user_id = auth.uid()) OR public.is_global_admin(auth.uid())) THEN p.bio
        ELSE NULL::text
    END AS bio,
    CASE
        WHEN (p.show_contact_info OR (p.user_id = auth.uid()) OR public.is_global_admin(auth.uid())) THEN p.phone
        ELSE NULL::text
    END AS phone,
    CASE
        WHEN (p.show_contact_info OR (p.user_id = auth.uid()) OR public.is_global_admin(auth.uid())) THEN p.contact_email
        ELSE NULL::text
    END AS contact_email,
    CASE
        WHEN (p.show_contact_info OR (p.user_id = auth.uid()) OR public.is_global_admin(auth.uid())) THEN p.contact_preferences
        ELSE NULL::text
    END AS contact_preferences,
    p.show_bio,
    p.show_contact_info,
    p.show_skills,
    p.show_experiences,
    CASE
        WHEN (p.show_skills OR (p.user_id = auth.uid()) OR public.is_global_admin(auth.uid())) THEN p.experience_roles
        ELSE '[]'::jsonb
    END AS experience_roles,
    CASE
        WHEN (p.show_skills OR (p.user_id = auth.uid()) OR public.is_global_admin(auth.uid())) THEN p.talents_and_abilities
        ELSE '[]'::jsonb
    END AS talents_and_abilities,
    CASE
        WHEN (p.show_skills OR (p.user_id = auth.uid()) OR public.is_global_admin(auth.uid())) THEN p.materials
        ELSE '[]'::jsonb
    END AS materials,
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('community_id', m.community_id, 'communities', jsonb_build_object('name', c.name))) AS jsonb_agg
        FROM public.memberships m
        JOIN public.communities c ON m.community_id = c.id
        WHERE m.user_id = p.user_id 
          AND m.approved = true 
          AND (
            public.is_global_admin(auth.uid()) 
            OR p.user_id = auth.uid() 
            OR m.community_id IN (
              SELECT m_viewer.community_id
              FROM public.memberships m_viewer
              WHERE m_viewer.user_id = auth.uid() 
                AND m_viewer.approved = true
            )
          )
      ), 
      '[]'::jsonb
    ) AS memberships
FROM public.profiles p
WHERE (
  (
    p.is_private = false 
    AND (
      public.is_global_admin(auth.uid()) 
      OR EXISTS (
        SELECT 1
        FROM public.memberships m_viewer
        JOIN public.memberships m_target ON m_viewer.community_id = m_target.community_id
        WHERE m_viewer.user_id = auth.uid() 
          AND m_viewer.approved = true 
          AND m_target.user_id = p.user_id 
          AND m_target.approved = true
      )
    )
  ) 
  OR p.user_id = auth.uid() 
  OR public.is_global_admin(auth.uid())
);
