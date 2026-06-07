import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function updateRPC() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        
        await client.query(`
            CREATE OR REPLACE FUNCTION public.get_my_membership_status()
            RETURNS TABLE(has_membership boolean, is_admin boolean, is_global_admin boolean)
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path TO 'public'
            AS $function$
            DECLARE
                global_admin_flag boolean;
            BEGIN
                SELECT EXISTS (
                    SELECT 1 FROM global_admins 
                    WHERE user_id = auth.uid()
                ) INTO global_admin_flag;

                RETURN QUERY
                SELECT 
                    (global_admin_flag OR EXISTS (
                        SELECT 1 FROM memberships 
                        WHERE user_id = auth.uid() AND approved = true
                    )) AS has_membership,
                    (global_admin_flag OR EXISTS (
                        SELECT 1 FROM memberships 
                        WHERE user_id = auth.uid() AND approved = true AND admin_level > 0
                    )) AS is_admin,
                    global_admin_flag AS is_global_admin;
            END;
            $function$;
        `);
        console.log('✅ RPC successfully updated');
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

updateRPC();
