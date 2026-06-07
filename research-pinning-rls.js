import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres', ssl: { rejectUnauthorized: false } });
async function run() {
    try {
        await client.connect();
        console.log("POLICIES FOR bulletin_posts:");
        const res = await client.query("SELECT * FROM pg_policies WHERE tablename = 'bulletin_posts'");
        console.log(JSON.stringify(res.rows, null, 2));

        console.log("\nADMIN CHECK FUNCTION:");
        const func = await client.query("SELECT routine_definition FROM information_schema.routines WHERE routine_name = 'is_global_admin'");
        console.log(func.rows[0]?.routine_definition);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
run();
