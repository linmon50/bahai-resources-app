import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function test() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        
        // Find a post and user to test
        const {rows: users} = await client.query('SELECT id FROM auth.users LIMIT 1');
        const uid = users[0].id;
        
        const {rows: posts} = await client.query('SELECT id FROM bulletin_posts LIMIT 1');
        const pid = posts[0].id;
        
        console.log('User:', uid, 'Post:', pid);

        // create a dummy comment
        const {rows: comments} = await client.query('INSERT INTO bulletin_post_comments (post_id, author_id, content) VALUES ($1, $2, $3) RETURNING id', [pid, uid, 'test fix trigger']);
        const cid = comments[0].id;
        
        console.log('Comment created:', cid);

        try {
            await client.query('INSERT INTO bulletin_comment_likes (comment_id, user_id) VALUES ($1, $2)', [cid, uid]);
            console.log('SUCCESS: Like inserted without trigger error');
        } catch (err) {
            console.error('TRIGGER ERROR:', err);
        }
        
        // cleanup
        await client.query('DELETE FROM bulletin_post_comments WHERE id = $1', [cid]);
    } catch(e) {
        console.error('ERROR:', e);
    } finally {
        await client.end();
    }
}

test();
