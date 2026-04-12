import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function manualJoin() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();

    try {
        const userId = 'cf31243c-c0d5-431f-a896-4a1e9c735ddd'; // linmon8803+testtestl@gmail.com
        const inviteCode = 'U0MRQ0Y2';
        const communityId = 'f2e41fc7-fbef-4b9c-b583-8a85a40055e7';

        console.log(`Manually joining user ${userId} to community ${communityId}...`);

        await client.query('BEGIN');

        // 1. Create profile
        await client.query(`
            INSERT INTO public.profiles (user_id, display_name)
            VALUES ($1, 'linmon8803+testtestl')
            ON CONFLICT (user_id) DO NOTHING;
        `, [userId]);

        // 2. Create membership
        await client.query(`
            INSERT INTO public.memberships (user_id, community_id, role, admin_level, approved)
            VALUES ($1, $2, 'member', 0, true)
            ON CONFLICT (user_id, community_id) DO UPDATE SET approved = true;
        `, [userId, communityId]);

        // 3. Mark invite as used
        await client.query(`
            UPDATE public.invites 
            SET used_at = now(), used_by = $1, active = false 
            WHERE lower(code) = lower($2);
        `, [userId, inviteCode]);

        await client.query('COMMIT');
        console.log('✅ Manual join successful!');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Manual join failed:', e);
    } finally {
        await client.end();
    }
}
manualJoin();
