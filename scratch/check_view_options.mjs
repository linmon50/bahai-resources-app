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
        
        console.log("--- directory_view details ---");
        const res = await client.query(`
            SELECT c.relname, pg_catalog.pg_get_userbyid(c.relowner) as owner, c.reloptions
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relname = 'directory_view';
        `);
        console.log(res.rows);

    } catch (e) {
        console.error("Failed:", e);
    } finally {
        await client.end();
    }
}
run();
