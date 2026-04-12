import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function testWithRealUser() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();

    try {
        const userId = 'cf31243c-c0d5-431f-a896-4a1e9c735ddd'; // linmon8803+testtestl@gmail.com
        const userEmail = 'linmon8803+testtestl@gmail.com';
        const code = 'U0MRQ0Y2';

        console.log(`Attempting to consume invite ${code} for user ${userEmail}...`);
        
        // Mock auth context for the transaction
        await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: userId, email: userEmail })]);
        await client.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [userId]);
        await client.query(`SELECT set_config('request.jwt.claim.email', $1, true)`, [userEmail]);

        const { rows, error } = await client.query('SELECT public.consume_invite($1) as result', [code]);
        if (error) {
            console.error('RPC Error:', error);
        } else {
            console.log('RPC Result:', rows[0].result);
        }

    } catch (e) {
        console.error('Caught Exception:', e.message);
    } finally {
        await client.end();
    }
}
testWithRealUser();
