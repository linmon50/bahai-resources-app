import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function inspectDB() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();

    try {
        console.log('--- Public Functions ---');
        const { rows: functions } = await client.query(`
            SELECT proname, pg_get_functiondef(pg_proc.oid) as definition
            FROM pg_proc 
            JOIN pg_namespace n ON n.oid = pg_proc.pronamespace 
            WHERE n.nspname = 'public'
            AND proname IN ('is_global_admin', 'is_community_admin', 'is_member', 'is_approved_member');
        `);
        console.log(JSON.stringify(functions, null, 2));

        console.log('\n--- Membership RLS Check ---');
        const { rows: p } = await client.query(`
            SELECT polname, pg_get_expr(polqual, polrelid) as USING_expr
            FROM pg_policy
            WHERE polrelid = 'public.memberships'::regclass;
        `);
        console.log(JSON.stringify(p, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
inspectDB();
