import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres', ssl: { rejectUnauthorized: false } });
async function run() {
    try {
        await client.connect();
        console.log("PINNING A POST IN TESTTEST4 COMMUNITY...");
        const res = await client.query(`
            UPDATE bulletin_posts 
            SET is_pinned = true 
            WHERE id = (
                SELECT id FROM bulletin_posts 
                WHERE community_id = '3401431b-5120-4c0c-9eca-f8bcf6388803' 
                AND status = 'approved' 
                LIMIT 1
            )
            RETURNING id
        `);
        
        if (res.rows.length > 0) {
            console.log("SUCCESS: Pinned post " + res.rows[0].id);
        } else {
            console.log("No approved posts found in community 3401431b-5120-4c0c-9eca-f8bcf6388803.");
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
run();
