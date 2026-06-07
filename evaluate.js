import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function checkRPC() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const funcRes = await client.query(`
            SELECT pg_get_functiondef(oid) 
            FROM pg_proc 
            WHERE proname = 'get_my_membership_status'
        `);
        console.log(funcRes.rows[0].pg_get_functiondef);
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

checkRPC();
