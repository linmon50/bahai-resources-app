import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function checkUser() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();

    try {
        const code = 'U0MRQ0Y2';

        console.log(`Checking matching users for linmon8803...`);
        const { rows: users } = await client.query("SELECT id, email FROM auth.users WHERE email ILIKE '%linmon8803%'");
        console.log('Users in auth.users:', users);

        for (const user of users) {
           console.log(`Checking memberships for ${user.email} (${user.id})...`);
           const { rows: members } = await client.query('SELECT * FROM public.memberships WHERE user_id = $1', [user.id]);
           console.log(`Memberships for ${user.email}:`, members);
        }

        console.log(`Checking invite: ${code}`);
        const { rows: invites } = await client.query('SELECT * FROM public.invites WHERE lower(code) = lower($1)', [code]);
        console.log('Invite info:', invites);

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
checkUser();
