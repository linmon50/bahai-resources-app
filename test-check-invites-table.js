import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function execute() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();

    try {
        console.log("Looking at invites...");
        const { rows: iRows } = await client.query(`SELECT id, code, community_id, email, active, used_at FROM invites`);
        console.log(iRows);
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
execute();
