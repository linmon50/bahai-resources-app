import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function createMembershipRPC() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();

    try {
        console.log('Creating Secure Membership Status RPC...');

        // This RPC is SECURITY DEFINER, meaning it bypasses RLS.
        // It is secured by only checking auth.uid() (the caller).
        await client.query(`
            CREATE OR REPLACE FUNCTION public.get_my_membership_status()
            RETURNS TABLE (
                has_membership BOOLEAN,
                is_admin BOOLEAN,
                is_global_admin BOOLEAN
            )
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path TO 'public'
            AS $function$
            BEGIN
                RETURN QUERY
                SELECT 
                    EXISTS (
                        SELECT 1 FROM memberships 
                        WHERE user_id = auth.uid() AND approved = true
                    ),
                    EXISTS (
                        SELECT 1 FROM memberships 
                        WHERE user_id = auth.uid() AND approved = true AND admin_level > 0
                    ),
                    EXISTS (
                        SELECT 1 FROM global_admins 
                        WHERE user_id = auth.uid()
                    );
            END;
            $function$;
        `);
        console.log('✅ Created get_my_membership_status RPC');

    } catch (e) {
        console.error('❌ RPC creation failed:', e);
    } finally {
        await client.end();
    }
}
createMembershipRPC();
