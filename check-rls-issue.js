import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function checkRLS() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();

    try {
        console.log('--- ALL Policies on memberships ---');
        const { rows: p1 } = await client.query(`
            SELECT polname, polcmd, pg_get_expr(polqual, polrelid) as USING_expr
            FROM pg_policy
            WHERE polrelid = 'public.memberships'::regclass;
        `);
        console.log(JSON.stringify(p1, null, 2));

        console.log('\n--- Checking row existence for a known member ---');
        // Let's check permissions for a regular member
        const userId = 'cf31243c-c0d5-431f-a896-4a1e9c735ddd'; // linmon8803+testtestl@gmail.com
        const { rows: memberships } = await client.query(`
            SELECT * FROM public.memberships WHERE user_id = $1;
        `, [userId]);
        console.log('Memberships for test user:', memberships);

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
checkRLS();
