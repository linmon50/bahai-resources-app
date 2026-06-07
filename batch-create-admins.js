import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function setupMultipleGlobalAdmins() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    const emailsToProcess = [
        'linmon8803+1989@gmail.com',
        'linmon8803+testtest4@gmail.com',
        'linmon8803+testtest2@gmail.com',
        'linmon8803+testtest5@gmail.com',
        'linmon8803+testtest3@gmail.com',
        'linmon8803+Testtest6@gmail.com'
    ];

    try {
        await client.connect();
        
        for (const rawEmail of emailsToProcess) {
            const email = rawEmail.toLowerCase();
            console.log(`\\n--- Processing ${email} ---`);
            
            const userRes = await client.query('SELECT id FROM auth.users WHERE email = $1', [email]);
            
            if (userRes.rows.length === 0) {
                console.log(`❌ User not found in auth.users.`);
                continue;
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

            // Set global admin
            const adminRes = await client.query('SELECT user_id FROM public.global_admins WHERE user_id = $1', [userId]);
            
            if (adminRes.rows.length === 0) {
                console.log('User is not in global_admins, adding now...');
                await client.query('INSERT INTO public.global_admins (user_id) VALUES ($1)', [userId]);
                console.log('✅ User successfully added to global_admins.');
            } else {
                console.log('✅ User is already in global_admins.');
            }
        }
        
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

setupMultipleGlobalAdmins();
