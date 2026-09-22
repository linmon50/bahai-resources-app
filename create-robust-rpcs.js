import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function execute() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        console.log('Creating robust invite consumption RPCs...');
        
        await client.query(`
            -- Clean up old functions
            DROP FUNCTION IF EXISTS public.consume_invite(TEXT);
            DROP FUNCTION IF EXISTS public.consume_invite(UUID);
            DROP FUNCTION IF EXISTS public.join_community_by_code(TEXT, UUID);

            -- Robust consume_invite function
            CREATE OR REPLACE FUNCTION public.consume_invite(p_code TEXT)
            RETURNS BOOLEAN
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = public, auth
            AS $$
            DECLARE
                v_invite record;
                v_user_id uuid;
                v_user_email text;
            BEGIN
                -- 1. Identify User
                v_user_id := auth.uid();
                IF v_user_id IS NULL THEN
                    RAISE EXCEPTION 'You must be logged in to join a community.';
                END IF;

                -- Get email from auth.users (more reliable than JWT in some contexts)
                SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
                IF v_user_email IS NULL THEN
                    RAISE EXCEPTION 'Could not determine your email address. Please try logging out and back in.';
                END IF;

                -- 2. Find Invite (Case-insensitive)
                SELECT * INTO v_invite 
                FROM public.invites 
                WHERE lower(trim(code)) = lower(trim(p_code))
                LIMIT 1;

                IF v_invite IS NULL THEN
                    RAISE EXCEPTION 'Invalid invite code: %', p_code;
                END IF;

                -- 3. Validate Invite
                IF v_invite.used_at IS NOT NULL OR NOT v_invite.active THEN
                    -- Idempotency check: If it was already used by this exact user, return success
                    IF v_invite.used_by = v_user_id THEN
                        RETURN TRUE;
                    END IF;
                    RAISE EXCEPTION 'This invite code has already been used.';
                END IF;

                IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
                    RAISE EXCEPTION 'This invite code has expired.';
                END IF;

                -- Case-insensitive email check
                IF lower(trim(v_invite.email)) <> lower(trim(v_user_email)) THEN
                    RAISE EXCEPTION 'This invite code belongs to a different email address (Invite: %, You: %).', v_invite.email, v_user_email;
                END IF;

                -- 4. Create Profile (if missing)
                INSERT INTO public.profiles (user_id, display_name)
                VALUES (v_user_id, split_part(v_user_email, '@', 1))
                ON CONFLICT (user_id) DO NOTHING;

                -- 5. Join Community
                INSERT INTO public.memberships (user_id, community_id, role, admin_level, approved, member_tier)
                VALUES (v_user_id, v_invite.community_id, v_invite.role, v_invite.admin_level, true, COALESCE(v_invite.member_tier, 'full'))
                ON CONFLICT (user_id, community_id) DO UPDATE SET
                    role = EXCLUDED.role,
                    admin_level = GREATEST(public.memberships.admin_level, EXCLUDED.admin_level),
                    member_tier = COALESCE(EXCLUDED.member_tier, public.memberships.member_tier, 'full'),
                    approved = true;

                -- 6. Mark as Used
                UPDATE public.invites 
                SET used_at = now(), 
                    used_by = v_user_id, 
                    active = false 
                WHERE id = v_invite.id;

                RETURN TRUE;
            END;
            $$;

            -- Forward compatibility wrapper
            CREATE OR REPLACE FUNCTION public.join_community_by_code(invite_code TEXT, uid UUID DEFAULT NULL)
            RETURNS BOOLEAN
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = public, auth
            AS $$
            BEGIN
                RETURN public.consume_invite(invite_code);
            END;
            $$;

            -- Auto-consume invite function strictly bound to authenticated user's email
            CREATE OR REPLACE FUNCTION public.auto_consume_invite_for_user()
            RETURNS BOOLEAN
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = public, auth
            AS $$
            DECLARE
                v_user_id uuid;
                v_user_email text;
                v_invite record;
            BEGIN
                v_user_id := auth.uid();
                IF v_user_id IS NULL THEN
                    RETURN FALSE;
                END IF;

                IF EXISTS (SELECT 1 FROM public.memberships WHERE user_id = v_user_id AND approved = true) THEN
                    RETURN TRUE;
                END IF;

                SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
                IF v_user_email IS NULL THEN
                    RETURN FALSE;
                END IF;

                SELECT * INTO v_invite
                FROM public.invites
                WHERE lower(trim(email)) = lower(trim(v_user_email))
                  AND active = true
                  AND used_at IS NULL
                  AND (expires_at IS NULL OR expires_at > now())
                ORDER BY created_at DESC
                LIMIT 1;

                IF v_invite IS NULL THEN
                    RETURN FALSE;
                END IF;

                RETURN public.consume_invite(v_invite.code);
            END;
            $$;

            -- Updated get_my_membership_status to auto-resolve pending invites for invited emails
            CREATE OR REPLACE FUNCTION public.get_my_membership_status()
            RETURNS TABLE(has_membership boolean, is_admin boolean, is_global_admin boolean)
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = public, auth
            AS $$
            DECLARE
                global_admin_flag boolean;
                has_mem boolean;
            BEGIN
                SELECT EXISTS (
                    SELECT 1 FROM global_admins 
                    WHERE user_id = auth.uid()
                ) INTO global_admin_flag;

                SELECT EXISTS (
                    SELECT 1 FROM memberships 
                    WHERE user_id = auth.uid() AND approved = true
                ) INTO has_mem;

                IF NOT global_admin_flag AND NOT has_mem THEN
                    PERFORM public.auto_consume_invite_for_user();
                END IF;

                RETURN QUERY
                SELECT 
                    (global_admin_flag OR EXISTS (
                        SELECT 1 FROM memberships 
                        WHERE user_id = auth.uid() AND approved = true
                    )) AS has_membership,
                    (global_admin_flag OR EXISTS (
                        SELECT 1 FROM memberships 
                        WHERE user_id = auth.uid() AND approved = true AND admin_level > 0
                    )) AS is_admin,
                    global_admin_flag AS is_global_admin;
            END;
            $$;

            -- Grant permissions
            GRANT EXECUTE ON FUNCTION public.consume_invite(TEXT) TO authenticated;
            GRANT EXECUTE ON FUNCTION public.join_community_by_code(TEXT, UUID) TO authenticated;
            GRANT EXECUTE ON FUNCTION public.auto_consume_invite_for_user() TO authenticated;
            GRANT EXECUTE ON FUNCTION public.get_my_membership_status() TO authenticated;

            -- Reload schema cache
            NOTIFY pgrst, 'reload schema';
        `);

        console.log('✅ Robust RPCs created successfully.');

    } catch (err) {
        console.error('❌ Error creating RPCs:', err);
    } finally {
        await client.end();
    }
}

execute();
