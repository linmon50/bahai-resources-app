import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres', ssl: { rejectUnauthorized: false } });
async function run() {
    try {
        await client.connect();
        const res = await client.query("SELECT routine_definition FROM information_schema.routines WHERE routine_name = 'get_my_membership_status'");
        console.log(res.rows[0]?.routine_definition);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
run();
