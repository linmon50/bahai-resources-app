import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function createRPC() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        await client.query(`
            CREATE OR REPLACE FUNCTION public.check_active_invite(p_email text, p_community_id uuid)
            RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
            BEGIN
                RETURN EXISTS (
                    SELECT 1 FROM public.invites
                    WHERE lower(email) = lower(p_email)
                      AND (
                        (p_community_id IS NULL AND community_id IS NULL)
                        OR (p_community_id IS NOT NULL AND community_id = p_community_id)
                      )
                      AND active = true
                      AND used_at IS NULL
                      AND (expires_at IS NULL OR expires_at > now())
                );
            END; $$;
        `);

        console.log('✅ check_active_invite RPC created/updated.');
    } catch (err) {
        console.error('❌ Error creating RPC:', err);
    } finally {
        await client.end();
    }
}

createRPC();
