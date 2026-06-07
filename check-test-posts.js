import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres', ssl: { rejectUnauthorized: false } });
async function run() {
    try {
        await client.connect();
        const res = await client.query(`
            SELECT id, community_id, content, status, is_pinned 
            FROM bulletin_posts 
            WHERE community_id IN ('3401431b-5120-4c0c-9eca-f8bcf6388803', '8213ca0d-f81b-45d8-929d-d8a43d84e682')
        `);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
run();
