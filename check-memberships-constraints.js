import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function checkConstraints() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();

    try {
        console.log('Checking memberships constraints...');
        const { rows } = await client.query(`
            SELECT conname, pg_get_constraintdef(oid) as def
            FROM pg_constraint 
            WHERE conrelid = 'public.memberships'::regclass;
        `);
        console.log('Constraints:', rows);

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
checkConstraints();
