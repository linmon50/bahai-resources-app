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
        const res = await client.query(`
            SELECT pg_get_functiondef(oid) 
            FROM pg_proc 
            WHERE proname = 'is_global_admin';
        `);
        console.log(res.rows[0].pg_get_functiondef);
    } catch (e) {
        console.error("Failed:", e);
    } finally {
        await client.end();
    }
}
run();
