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

        console.log('Creating check_user_exists_raw RPC...');
        await client.query(`
            CREATE OR REPLACE FUNCTION public.check_user_exists_raw(p_email TEXT)
            RETURNS BOOLEAN
            LANGUAGE plpgsql
            SECURITY DEFINER
            AS $$
            BEGIN
              RETURN EXISTS (
                SELECT 1 
                FROM auth.users
                WHERE email = p_email
              );
            END;
            $$;
        `);

        console.log('Creating check_active_invites_bulk RPC...');
        await client.query(`
            CREATE OR REPLACE FUNCTION public.check_active_invites_bulk(p_emails TEXT[], p_community_id UUID)
            RETURNS TABLE(email TEXT)
            LANGUAGE plpgsql
            SECURITY DEFINER
            AS $$
            BEGIN
              RETURN QUERY 
              SELECT i.email
              FROM invites i
              WHERE i.email = ANY(p_emails)
                AND i.community_id = p_community_id
                AND i.active = true
                AND i.used_at IS NULL
                AND (i.expires_at IS NULL OR i.expires_at > now());
            END;
            $$;
        `);

        console.log('✅ RPCs created successfully.');
    } catch (err) {
        console.error('❌ Error creating RPCs:', err);
    } finally {
        await client.end();
    }
}

execute();
