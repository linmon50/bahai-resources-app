import pg from 'pg';

const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function checkMemberships() {
    const client = new pg.Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    const res = await client.query(`
    SELECT user_id, community_id, role, admin_level 
    FROM memberships 
    WHERE user_id = 'c51f2492-978d-4f26-aa57-3dcfcc949f89'
  `);
    console.log(res.rows);
    await client.end();
}

checkMemberships();
