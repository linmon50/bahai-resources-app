import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres', ssl: { rejectUnauthorized: false } });
async function run() {
    try {
        await client.connect();
        const res = await client.query("SELECT id, content, is_pinned, status, community_id FROM bulletin_posts WHERE is_pinned = true");
        console.log("PINNED POSTS:");
        console.table(res.rows);
        
        const res2 = await client.query("SELECT * FROM profiles WHERE display_name ILIKE '%Testtest4%'");
        console.log("USER SEARCH (Testtest4):");
        console.table(res2.rows);

        const res3 = await client.query("SELECT * FROM memberships WHERE user_id = '0f531d04-cb91-496e-bc3e-002f23f85890'"); // Assuming ID if found, or I'll run another step
        
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
run();
