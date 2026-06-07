import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres', ssl: { rejectUnauthorized: false } });
async function run() {
    try {
        await client.connect();
        
        // Find an approved post to pin
        const { rows } = await client.query("SELECT id FROM bulletin_posts WHERE status = 'approved' LIMIT 1");
        
        if (rows.length > 0) {
            const postId = rows[0].id;
            console.log(`PINNING POST: ${postId}`);
            await client.query("UPDATE bulletin_posts SET is_pinned = true WHERE id = $1", [postId]);
            console.log("PIN SUCCESSFUL");
        } else {
            console.log("No approved posts found to pin.");
        }

    } catch (err) {
        console.error("DATABASE ERROR:", err);
    } finally {
        await client.end();
    }
}
run();
