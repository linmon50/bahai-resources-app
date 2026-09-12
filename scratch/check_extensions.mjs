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
            SELECT extname, extversion FROM pg_extension;
        `);
        console.log("Installed Extensions:", JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error("Failed:", e);
    } finally {
        await client.end();
    }
}
run();
