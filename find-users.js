import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function findUsers() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        
        console.log('Searching for users matching linmon8803...');
        const userRes = await client.query(`SELECT id, email FROM auth.users WHERE email LIKE '%linmon8803%'`);
        console.log(userRes.rows);
        
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

findUsers();
