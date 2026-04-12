import pg from 'pg';

const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function checkAdmin() {
    const client = new pg.Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const res = await client.query(`
            SELECT is_global_admin('95d79959-2a6d-417c-9719-51a06ab2ee78'::uuid) as admin;
        `);
        console.log("Is Global Admin:", res.rows[0].admin);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkAdmin();
