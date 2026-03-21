import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function execute() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();

    try {
        console.log("Details for linmon8803+testz@gmail.com:");
        const { rows: uRows } = await client.query(`SELECT id, email FROM auth.users WHERE email = 'linmon8803+testz@gmail.com'`);
        if (uRows.length > 0) {
            console.log(uRows[0]);
            const { rows: mRows } = await client.query(`SELECT * FROM memberships WHERE user_id = $1`, [uRows[0].id]);
            console.log("Memberships:", mRows);
        } else {
            console.log("User not found.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
execute();
