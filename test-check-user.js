import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function check() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();

    try {
        const { rows: rpcRows } = await client.query(`
            SELECT pg_get_functiondef(p.oid)
            FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname = 'check_existing_members';
        `);
        console.log("check_existing_members definition:");
        console.log(rpcRows[0]?.pg_get_functiondef);

        console.log("\nUser details:");
        const { rows: userRows } = await client.query(`
            SELECT id, email FROM auth.users WHERE email = 'linmon8803+testtestj@gmail.com'
        `);
        const user = userRows[0];
        if (user) {
            console.log(user);
            const { rows: memRows } = await client.query(`
                SELECT * FROM memberships WHERE user_id = $1
            `, [user.id]);
            console.log("\nMemberships:", memRows);
        } else {
            console.log("User not found in auth.users");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
check();
