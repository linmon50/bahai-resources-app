import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function setGlobalAdmin() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        
        const userId = 'fac109c9-4e7d-4d16-90f7-3a0a4e466ff2'; // The ID we just found

        const adminRes = await client.query('SELECT user_id FROM public.global_admins WHERE user_id = $1', [userId]);
        
        if (adminRes.rows.length === 0) {
            console.log('User is not in global_admins, adding now...');
            await client.query('INSERT INTO public.global_admins (user_id) VALUES ($1)', [userId]);
            console.log('✅ User successfully added to global_admins.');
        } else {
            console.log('✅ User is already in global_admins.');
        }
        
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

setGlobalAdmin();
