import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres', ssl: { rejectUnauthorized: false } });
async function run() {
    try {
        await client.connect();
        const funcs = ['update_community_membership', 'grant_community_access', 'revoke_community_access'];
        for (const func of funcs) {
            console.log(`--- ${func.toUpperCase()} ---`);
            const res = await client.query("SELECT routine_definition FROM information_schema.routines WHERE routine_name = $1", [func]);
            console.log(res.rows[0]?.routine_definition);
            console.log("\n");
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
run();
