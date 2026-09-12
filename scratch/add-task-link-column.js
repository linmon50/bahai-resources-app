import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function run() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        console.log('Connected to PostgreSQL database.');
        
        // Add link column to session_tasks
        const query = `ALTER TABLE public.session_tasks ADD COLUMN IF NOT EXISTS link text;`;
        await client.query(query);
        console.log('Successfully added "link" column to public.session_tasks table.');
    } catch (err) {
        console.error('Error modifying table:', err);
    } finally {
        await client.end();
    }
}

run();
