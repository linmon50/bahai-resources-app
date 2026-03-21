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

        console.log('Creating check_registered_users_bulk RPC...');
        await client.query(`
            CREATE OR REPLACE FUNCTION public.check_registered_users_bulk(p_emails TEXT[])
            RETURNS text[]
            LANGUAGE sql
            SECURITY DEFINER
            AS $$
              SELECT ARRAY(
                SELECT email
                FROM auth.users
                WHERE email = ANY(p_emails)
              );
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
