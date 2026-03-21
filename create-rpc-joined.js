import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function execute() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        console.log('Drop get_community_members RPC...');
        await client.query(`DROP FUNCTION IF EXISTS public.get_community_members(uuid);`);

        console.log('Create get_community_members RPC...');
        await client.query(`
            CREATE OR REPLACE FUNCTION public.get_community_members(p_community_id uuid)
            RETURNS TABLE(user_id uuid, email text, display_name text, role text, admin_level integer, joined_at timestamp with time zone)
            LANGUAGE sql
            SECURITY DEFINER
            AS $$
              SELECT m.user_id, u.email, p.display_name, m.role, m.admin_level, m.joined_at
              FROM public.memberships m
              JOIN auth.users u ON u.id = m.user_id
              LEFT JOIN public.profiles p ON p.user_id = m.user_id
              WHERE m.community_id = p_community_id
              ORDER BY m.admin_level DESC, m.joined_at DESC;
            $$;
        `);

        console.log('✅ RPC updated successfully.');
    } catch (err) {
        console.error('❌ Error updating RPC:', err);
    } finally {
        await client.end();
    }
}

execute();
