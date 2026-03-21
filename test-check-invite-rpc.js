import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function execute() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();

    try {
        const { rows } = await client.query(`
            SELECT pg_get_functiondef(p.oid)
            FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname IN ('check_invite');
        `);

        for (const r of rows) {
            console.log(r.pg_get_functiondef);
            console.log("------------------------");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
execute();
