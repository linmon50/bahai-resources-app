import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres', ssl: { rejectUnauthorized: false } });
async function run() {
    try {
        await client.connect();
        console.log("TESTTEST4 MEMBERSHIPS:");
        const res = await client.query("SELECT * FROM memberships WHERE user_id = 'd3de9095-ecae-40f7-91e6-d722b1950914'");
        console.table(res.rows);

        console.log("\nPINNED POSTS COMMUNITIES:");
        const res2 = await client.query("SELECT community_id, is_pinned FROM bulletin_posts WHERE is_pinned = true");
        console.table(res2.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
run();
