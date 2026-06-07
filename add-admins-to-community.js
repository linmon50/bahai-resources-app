import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function addGlobalAdminsToCommunity() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        
        console.log('Finding Test Community B...');
        const commRes = await client.query(`SELECT id FROM public.communities WHERE name = $1`, ['Test Community B']);
        
        if (commRes.rows.length === 0) {
            console.log('❌ "Test Community B" not found.');
            return;
        }
        
        const communityId = commRes.rows[0].id;
        console.log(`✅ Found Test Community B ID: ${communityId}`);

        console.log('Fetching all global admins...');
        const globalAdminsRes = await client.query('SELECT user_id FROM public.global_admins');
        
        if (globalAdminsRes.rows.length === 0) {
            console.log('No global admins found.');
            return;
        }

        console.log(`Found ${globalAdminsRes.rows.length} global admins. Adding them to memberships...`);

        for (const admin of globalAdminsRes.rows) {
            const userId = admin.user_id;

            // Check if they are already members
            const memberCheck = await client.query(`
                SELECT id FROM public.memberships 
                WHERE user_id = $1 AND community_id = $2
            `, [userId, communityId]);

            if (memberCheck.rows.length === 0) {
                // Insert membership
                await client.query(`
                    INSERT INTO public.memberships (user_id, community_id, role, admin_level, approved)
                    VALUES ($1, $2, 'admin', 3, true)
                `, [userId, communityId]);
                console.log(`✅ Added user ${userId} as admin to Test Community B.`);
            } else {
                // Update to admin if needed? Let's just make sure they are at least approved and admin
                await client.query(`
                    UPDATE public.memberships 
                    SET role = 'admin', admin_level = 3, approved = true
                    WHERE id = $1
                `, [memberCheck.rows[0].id]);
                console.log(`✅ Updated user ${userId} to be an approved admin in Test Community B.`);
            }
        }
        
        console.log('✅ Done adding all global admins to Test Community B.');
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

addGlobalAdminsToCommunity();
