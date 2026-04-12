import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function checkBulletinRLS() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();

    try {
        console.log('--- ALL Policies on bulletin_posts ---');
        const { rows: policies } = await client.query(`
            SELECT polname, polcmd, pg_get_expr(polqual, polrelid) as USING_expr, pg_get_expr(polwithcheck, polrelid) as WITH_CHECK_expr
            FROM pg_policy
            WHERE polrelid = 'public.bulletin_posts'::regclass;
        `);
        console.log(JSON.stringify(policies, null, 2));

        console.log('\n--- Sample of pending posts ---');
        const { rows: pending } = await client.query(`
            SELECT id, community_id, status, content 
            FROM public.bulletin_posts 
            WHERE status = 'pending' 
            LIMIT 5;
        `);
        console.log('Pending posts found locally (as postgres):', pending.length);

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
checkBulletinRLS();
