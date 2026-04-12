import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function diagnoseAdminAccess() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();

    try {
        console.log('--- Checking current profiles to find the admin ---');
        const { rows: profiles } = await client.query(`
            SELECT user_id, display_name, (SELECT email FROM auth.users WHERE id = user_id) as auth_email
            FROM public.profiles
            WHERE display_name ILIKE '%John%' OR display_name ILIKE '%Montgomery%';
        `);
        console.table(profiles);

        for (const p of profiles) {
            console.log(`\n--- Status for ${p.display_name} (${p.user_id}) ---`);
            
            // 1. Is global admin?
            const { rows: global } = await client.query('SELECT 1 FROM public.global_admins WHERE user_id = $1', [p.user_id]);
            console.log('Is Global Admin:', global.length > 0);

            // 2. Memberships
            const { rows: mems } = await client.query(`
                SELECT m.community_id, c.name as community_name, m.role, m.admin_level, m.approved
                FROM public.memberships m
                JOIN public.communities c ON m.community_id = c.id
                WHERE m.user_id = $1;
            `, [p.user_id]);
            console.table(mems);

            // 3. Pending posts for these communities
            if (mems.length > 0) {
                const cids = mems.map(m => m.community_id);
                const { rows: posts } = await client.query(`
                    SELECT id, community_id, status, content
                    FROM public.bulletin_posts
                    WHERE community_id = ANY($1) AND status = 'pending';
                `, [cids]);
                console.log(`Pending posts in your communities: ${posts.length}`);
                if (posts.length > 0) {
                    console.table(posts);
                }
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
diagnoseAdminAccess();
