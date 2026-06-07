import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres', ssl: { rejectUnauthorized: false } });
async function run() {
    try {
        await client.connect();
        console.log("PINNING ONE POST MANUALLY...");
        const res = await client.query("UPDATE bulletin_posts SET is_pinned = true WHERE status = 'approved' AND is_pinned = false LIMIT 1 RETURNING id");
        console.log("PINNED POST ID:", res.rows[0]?.id);
        
        console.log("FETCHING PINNED POSTS...");
        const res2 = await client.query("SELECT id, is_pinned, community_id FROM bulletin_posts WHERE is_pinned = true");
        console.table(res2.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
run();
