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
                INSERT INTO public.memberships (user_id, community_id, role, admin_level, approved)
                VALUES (v_user_id, v_invite.community_id, v_invite.role, v_invite.admin_level, true)
                ON CONFLICT (user_id, community_id) DO UPDATE SET
                    role = EXCLUDED.role,
                    admin_level = GREATEST(public.memberships.admin_level, EXCLUDED.admin_level),
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

            -- Grant permissions
            GRANT EXECUTE ON FUNCTION public.consume_invite(TEXT) TO authenticated;
            GRANT EXECUTE ON FUNCTION public.join_community_by_code(TEXT, UUID) TO authenticated;

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
