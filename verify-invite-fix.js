import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function verify() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        console.log('--- Verifying Invite Flow ---');

        // 1. Create a test community if none exists
        const { rows: communities } = await client.query('SELECT id FROM public.communities LIMIT 1');
        if (communities.length === 0) {
            console.log('No communities found. Creating test community...');
            await client.query("INSERT INTO public.communities (name, slug) VALUES ('Test Community', 'test-comm')");
        }
        const communityId = communities[0]?.id || (await client.query("SELECT id FROM public.communities WHERE slug='test-comm'")).rows[0].id;

        // 2. Create a test invite
        const testCode = 'TEST-' + Math.random().toString(36).substring(2, 7).toUpperCase();
        const testEmail = 'test-' + Math.random().toString(36).substring(2, 7) + '@example.com';
        
        console.log(`Creating test invite: ${testCode} for ${testEmail}`);
        await client.query(`
            INSERT INTO public.invites (code, email, community_id, role, admin_level)
            VALUES ($1, $2, $3, 'member', 0)
        `, [testCode, testEmail, communityId]);

        // 3. Test validate_invite_pre_signup
        console.log('Testing validate_invite_pre_signup...');
        const { rows: valRows } = await client.query('SELECT public.validate_invite_pre_signup($1, $2) as result', [testCode, testEmail]);
        console.log('Validation Result:', valRows[0].result);
        if (valRows[0].result !== 'valid') throw new Error('Pre-signup validation failed');

        // 4. Test consume_invite logic (simulating auth context if possible, or just testing the function behavior)
        // Since consume_invite uses auth.uid(), we can't easily call it directly from pg client without setting session variables.
        console.log('Simulating invite consumption in a transaction...');
        
        // We'll set the claiming user to an existing user if possible
        const { rows: users } = await client.query('SELECT id, email FROM auth.users LIMIT 1');
        if (users.length === 0) {
            console.log('No users in auth.users. Skipping functional test of consume_invite.');
        } else {
            const testUserId = users[0].id;
            const testUserEmail = users[0].email;
            
            // Re-update invite to match this user's email for the test
            await client.query('UPDATE public.invites SET email = $1 WHERE code = $2', [testUserEmail, testCode]);

            console.log(`Consuming invite for user: ${testUserEmail} (${testUserId})`);
            
            // Set session variables to simulate Supabase auth
            await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: testUserId, email: testUserEmail })]);
            await client.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [testUserId]);
            await client.query(`SELECT set_config('request.jwt.claim.email', $1, true)`, [testUserEmail]);
            
            const { rows: consumeRows } = await client.query('SELECT public.consume_invite($1) as result', [testCode]);
            console.log('Consume Result:', consumeRows[0].result);

            // Verify membership
            const { rows: memberRows } = await client.query('SELECT * FROM public.memberships WHERE user_id = $1 AND community_id = $2', [testUserId, communityId]);
            console.log('Membership created:', memberRows.length > 0);
            
            // Verify invite marked as used
            const { rows: inviteRows } = await client.query('SELECT active, used_at FROM public.invites WHERE code = $1', [testCode]);
            console.log('Invite marked inactive:', !inviteRows[0].active);
        }

        console.log('✅ Verification complete.');

    } catch (err) {
        console.error('❌ Verification failed:', err);
    } finally {
        await client.end();
    }
}

verify();
