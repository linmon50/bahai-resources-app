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

        console.log('Creating validate_invite_pre_signup RPC...');
        await client.query(`
            CREATE OR REPLACE FUNCTION public.validate_invite_pre_signup(p_code TEXT, p_email TEXT)
            RETURNS text
            LANGUAGE plpgsql
            SECURITY DEFINER
            AS $$
            DECLARE
              v_invite record;
            BEGIN
              -- 1. Find the invite by code
              SELECT * INTO v_invite 
              FROM public.invites
              WHERE lower(code) = lower(p_code);

              -- 2. Does it exist?
              IF NOT FOUND THEN
                RETURN 'invalid';
              END IF;

              -- 3. Is it meant for a different email?
              IF lower(v_invite.email) <> lower(p_email) THEN
                RETURN 'email_mismatch';
              END IF;

              -- 4. Is it already used?
              IF v_invite.active = false OR v_invite.used_at IS NOT NULL THEN
                RETURN 'used';
              END IF;

              -- 5. Is it expired?
              IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
                RETURN 'expired';
              END IF;

              -- 6. All good
              RETURN 'valid';
            END;
            $$;
        `);

        console.log('✅ RPC created successfully.');
    } catch (err) {
        console.error('❌ Error creating RPC:', err);
    } finally {
        await client.end();
    }
}

execute();
