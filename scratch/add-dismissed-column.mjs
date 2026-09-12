import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function run() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("Connected to DB. Adding column 'dismissed' to table 'invites'...");
        await client.query(`
            ALTER TABLE public.invites 
            ADD COLUMN IF NOT EXISTS dismissed BOOLEAN DEFAULT false;
        `);
        console.log("Column 'dismissed' successfully added (or already existed).");
    } catch (e) {
        console.error("Failed to add column:", e);
    } finally {
        await client.end();
    }
}

run();
