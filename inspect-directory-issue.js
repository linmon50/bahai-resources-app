import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function inspectSchema() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();

    try {
        console.log('--- Columns in profiles ---');
        const { rows: columns } = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'profiles'
            ORDER BY ordinal_position;
        `);
        console.log(JSON.stringify(columns, null, 2));

        console.log('\n--- directory_view definition ---');
        const { rows: views } = await client.query(`
            SELECT view_definition 
            FROM information_schema.views 
            WHERE table_name = 'directory_view';
        `);
        if (views.length > 0) {
            console.log(views[0].view_definition);
        } else {
            console.log('directory_view NOT FOUND');
        }

        console.log('\n--- ALL Policies on memberships ---');
        const { rows: p1 } = await client.query(`
            SELECT polname, polcmd, pg_get_expr(polqual, polrelid) as USING_expr
            FROM pg_policy
            WHERE polrelid = 'public.memberships'::regclass;
        `);
        console.log(JSON.stringify(p1, null, 2));

        console.log('\n--- ALL Policies on profiles ---');
        const { rows: p2 } = await client.query(`
            SELECT polname, polcmd, pg_get_expr(polqual, polrelid) as USING_expr
            FROM pg_policy
            WHERE polrelid = 'public.profiles'::regclass;
        `);
        console.log(JSON.stringify(p2, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
inspectSchema();
