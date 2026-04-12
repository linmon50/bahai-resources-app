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

        console.log('Creating/Updating invite RPCs...');
        
        await client.query(`
            -- Drop existing functions to handle signature/return type changes
            DROP FUNCTION IF EXISTS public.consume_invite(TEXT);
            DROP FUNCTION IF EXISTS public.consume_invite(UUID);
            DROP FUNCTION IF EXISTS public.join_community_by_code(TEXT, UUID);

            -- Unified consume_invite function
            CREATE OR REPLACE FUNCTION public.consume_invite(p_code TEXT)
            RETURNS BOOLEAN
            LANGUAGE plpgsql
            SECURITY DEFINER
            AS $$
            DECLARE
                v_invite RECORD;
                v_user_id UUID;
                v_user_email TEXT;
            BEGIN
                -- 1. Get current user ID and email from auth
                v_user_id := auth.uid();
                -- Attempt to get email from JWT or profiles if already exists
                v_user_email := auth.jwt() ->> 'email';

                IF v_user_id IS NULL THEN
                    RAISE EXCEPTION 'Not authenticated';
                END IF;

                -- 2. Find and Lock the invite
                SELECT * INTO v_invite
                FROM public.invites
                WHERE lower(code) = lower(p_code)
                FOR UPDATE;

                IF NOT FOUND THEN
                    RAISE EXCEPTION 'Invalid invite code';
                END IF;

                -- 3. Validation
                IF NOT v_invite.active OR v_invite.used_at IS NOT NULL THEN
                    RAISE EXCEPTION 'Invite code already used';
                END IF;

                IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
                    RAISE EXCEPTION 'Invite code expired';
                END IF;

                -- Case-insensitive email comparison
                IF lower(v_invite.email) <> lower(v_user_email) THEN
                    RAISE EXCEPTION 'Invite code was generated for a different email address.';
                END IF;

                -- 4. Create/Update Membership
                -- memberships table likely has (user_id, community_id) unique constraint or PK
                INSERT INTO public.memberships (user_id, community_id, role, admin_level, approved)
                VALUES (v_user_id, v_invite.community_id, v_invite.role, v_invite.admin_level, true)
                ON CONFLICT (user_id, community_id) DO UPDATE SET
                    role = EXCLUDED.role,
                    admin_level = GREATEST(public.memberships.admin_level, EXCLUDED.admin_level),
                    approved = true;

                -- 5. Ensure Profile exists
                INSERT INTO public.profiles (user_id, display_name)
                VALUES (v_user_id, split_part(v_user_email, '@', 1))
                ON CONFLICT (user_id) DO NOTHING;

                -- 6. Mark Invite as used
                UPDATE public.invites
                SET used_at = now(),
                    used_by = v_user_id,
                    active = false
                WHERE id = v_invite.id;

                RETURN TRUE;
            END;
            $$;

            -- Compatibility wrapper for JoinCommunity fallback in App.jsx
            CREATE OR REPLACE FUNCTION public.join_community_by_code(invite_code TEXT, uid UUID DEFAULT NULL)
            RETURNS BOOLEAN
            LANGUAGE plpgsql
            SECURITY DEFINER
            AS $$
            BEGIN
                -- We ignore the uid parameter and rely on auth.uid() inside consume_invite for security.
                -- This ensures a user can only join as themselves.
                RETURN public.consume_invite(invite_code);
            END;
            $$;
        `);

        console.log('✅ RPCs created successfully.');

        // Re-grant permissions (though SECURITY DEFINER handles most of it, public needs execute)
        await client.query(`
            GRANT EXECUTE ON FUNCTION public.consume_invite(TEXT) TO authenticated;
            GRANT EXECUTE ON FUNCTION public.join_community_by_code(TEXT, UUID) TO authenticated;
        `);
        
        console.log('✅ Permissions granted.');

    } catch (err) {
        console.error('❌ Error creating RPCs:', err);
    } finally {
        await client.end();
    }
}

execute();
