import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function verifyFunctions() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        console.log('Checking for RPC functions...');
        const { rows } = await client.query(`
            SELECT proname, pg_get_function_arguments(p.oid) as args, prorettype::regtype as rettype
            FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' 
            AND p.proname IN ('consume_invite', 'join_community_by_code');
        `);

        console.log(`Found ${rows.length} functions:`);
        rows.forEach(r => {
            console.log(`- ${r.proname}(${r.args}) -> ${r.rettype}`);
        });

    } catch (err) {
        console.error('❌ Error checking functions:', err);
    } finally {
        await client.end();
    }
}

verifyFunctions();
