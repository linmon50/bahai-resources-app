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
            SELECT 
                schemaname, 
                tablename, 
                rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY tablename;
        `);
        console.log("Database Tables RLS Status:");
        console.table(res.rows);
    } catch (e) {
        console.error("Failed:", e);
    } finally {
        await client.end();
    }
}
run();
