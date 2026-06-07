import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres', ssl: { rejectUnauthorized: false } });
async function run() {
    try {
        await client.connect();
        console.log("--- PINNED POSTS ---");
        const res = await client.query("SELECT id, content, is_pinned, community_id, status FROM bulletin_posts WHERE is_pinned = true");
        console.table(res.rows);

        console.log("\n--- TESTTEST4 COMMUNITIES ---");
        const res2 = await client.query("SELECT community_id FROM memberships WHERE user_id = (SELECT user_id FROM profiles WHERE display_name = 'Testtest4' LIMIT 1)");
        console.table(res2.rows);

        console.log("\n--- POST ORDER CHECK ---");
        const res3 = await client.query("SELECT id, is_pinned, created_at FROM bulletin_posts ORDER BY is_pinned DESC, created_at DESC LIMIT 10");
        console.table(res3.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
run();
