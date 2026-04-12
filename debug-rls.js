import pg from 'pg';

const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function checkRLS() {
    const client = new pg.Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        
        console.log('--- USER PROFILE ---');
        const userRes = await client.query(`
            SELECT user_id, display_name, contact_email 
            FROM profiles 
            WHERE contact_email = 'linmon8800@gmail.com'
        `);
        console.log(userRes.rows);
        if (userRes.rows.length === 0) return;
        const userId = userRes.rows[0].user_id;

        console.log('\n--- COMMUNITIES ---');
        const commRes = await client.query(`
            SELECT id, name FROM communities WHERE name = 'Test Community A'
        `);
        console.log(commRes.rows);
        if (commRes.rows.length === 0) return;
        const communityId = commRes.rows[0].id;

        console.log('\n--- MEMBERSHIP ---');
        const memRes = await client.query(`
            SELECT * FROM memberships 
            WHERE user_id = $1 AND community_id = $2
        `, [userId, communityId]);
        console.log(memRes.rows);

        console.log('\n--- BULLETIN POSTS INSERT POLICY ---');
        const polResPol = await client.query(`
            SELECT qual, with_check 
            FROM pg_policies 
            WHERE tablename = 'bulletin_posts' AND cmd = 'INSERT'
        `);
        console.log(polResPol.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkRLS();
