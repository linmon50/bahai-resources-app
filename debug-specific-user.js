import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function checkUser() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();

    try {
        const userId = 'cf31243c-c0d5-431f-a896-4a1e9c735ddd'; // linmon8803+testtestl@gmail.com
        
        console.log(`Checking memberships for ${userId}...`);
        const { rows: members } = await client.query('SELECT * FROM public.memberships WHERE user_id = $1', [userId]);
        console.log('Memberships:', members);

        const { rows: profiles } = await client.query('SELECT * FROM public.profiles WHERE user_id = $1', [userId]);
        console.log('Profiles:', profiles);

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
checkUser();
