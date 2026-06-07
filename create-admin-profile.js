import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function setupGlobalAdminProfile() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        
        console.log('Finding user in auth.users by email...');
        const email = 'linmon8803+testtest6@gmail.com'; // lowercase
        
        const userRes = await client.query('SELECT id FROM auth.users WHERE email = $1', [email]);
        
        if (userRes.rows.length === 0) {
            console.log(`❌ User with email ${email} not found in auth.users.`);
            return;
        }
        
        const userId = userRes.rows[0].id;
        console.log(`✅ Found user ID: ${userId}`);

        // Check if profile exists
        const profileRes = await client.query('SELECT user_id FROM public.profiles WHERE user_id = $1', [userId]);
        
        if (profileRes.rows.length === 0) {
            console.log('Profile not found, creating new profile record...');
            await client.query(`
                INSERT INTO public.profiles (user_id, contact_email, display_name) 
                VALUES ($1, $2, $3)
            `, [userId, email, 'Global Admin']);
            console.log('✅ Profile inserted successfully.');
        } else {
            console.log('✅ Profile already exists.');
        }

        const funcRes = await client.query(`
            SELECT pg_get_functiondef(oid) 
            FROM pg_proc 
            WHERE proname = 'is_global_admin'
        `);
        if (funcRes.rows.length > 0) {
            console.log('\\n--- is_global_admin definition ---');
            console.log(funcRes.rows[0].pg_get_functiondef);
        } else {
            console.log('is_global_admin function not found.');
        }
        
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

setupGlobalAdminProfile();
