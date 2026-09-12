import pg from 'pg';
const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function run() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        
        console.log("--- RLS status of communities ---");
        const rlsRes = await client.query(`
            SELECT relname, relrowsecurity 
            FROM pg_class 
            WHERE relname IN ('communities', 'memberships');
        `);
        console.log(rlsRes.rows);

        console.log("--- policies on communities ---");
        const res = await client.query(`
            SELECT policyname, permissive, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename = 'communities';
        `);
        console.log(res.rows);

        console.log("--- policies on memberships ---");
        const resMem = await client.query(`
            SELECT policyname, permissive, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename = 'memberships';
        `);
        console.log(resMem.rows);

    } catch (e) {
        console.error("Failed:", e);
    } finally {
        await client.end();
    }
}
run();
