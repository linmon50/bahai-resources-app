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
            CREATE OR REPLACE FUNCTION check_pending_request(p_email TEXT, p_community_id UUID)
            RETURNS BOOLEAN
            LANGUAGE plpgsql
            SECURITY DEFINER
            AS $$
            BEGIN
              RETURN EXISTS (
                SELECT 1 
                FROM invite_requests 
                WHERE email = p_email 
                  AND (
                    (p_community_id IS NULL AND community_id IS NULL)
                    OR (p_community_id IS NOT NULL AND community_id = p_community_id)
                  )
                  AND status = 'pending'
              );
            END;
            $$;
        `);

        console.log('✅ check_pending_request RPC created/updated.');
    } catch (err) {
        console.error('❌ Error creating RPC:', err);
    } finally {
        await client.end();
    }
}

createRPC();
