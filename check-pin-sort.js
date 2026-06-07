import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres', ssl: { rejectUnauthorized: false } });
async function run() {
    try {
        await client.connect();
        
        console.log("CHECKING is_pinned values:");
        const res = await client.query("SELECT is_pinned, count(*) FROM bulletin_posts GROUP BY is_pinned");
        console.table(res.rows);

        console.log("\nCHECKING SORT ORDER (DESC):");
        const res2 = await client.query("SELECT id, is_pinned, created_at FROM bulletin_posts ORDER BY is_pinned DESC, created_at DESC LIMIT 5");
        console.table(res2.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
run();
