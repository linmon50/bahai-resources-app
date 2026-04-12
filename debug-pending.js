import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function debugPendingPosts() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();

    try {
        console.log('--- Checking all PENDING posts ---');
        const { rows: posts } = await client.query(`
            SELECT b.id, b.community_id, b.content, b.status, c.name as community_name
            FROM public.bulletin_posts b
            LEFT JOIN public.communities c ON b.community_id = c.id
            WHERE b.status = 'pending';
        `);
        console.table(posts);

        if (posts.length > 0) {
            const cid = posts[0].community_id;
            console.log(`\n--- Checking Admins for Community: ${cid} ---`);
            const { rows: admins } = await client.query(`
                SELECT m.user_id, p.display_name, m.role, m.admin_level, m.approved
                FROM public.memberships m
                JOIN public.profiles p ON m.user_id = p.user_id
                WHERE m.community_id = $1 AND (m.role = 'admin' OR m.admin_level > 0);
            `, [cid]);
            console.table(admins);

            // Check if is_community_admin matches
            console.log('\n--- Testing is_community_admin for these users ---');
            for (const admin of admins) {
                const { rows: check } = await client.query(`
                    SELECT public.is_community_admin($1, $2) as is_admin;
                `, [admin.user_id, cid]);
                console.log(`User ${admin.display_name}: is_admin = ${check[0].is_admin}`);
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
debugPendingPosts();
