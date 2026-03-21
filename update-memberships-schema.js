import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function updateSchema() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        console.log('Adding email column to memberships and updating existing rows...');
        await client.query(`
            -- 1. Add email column
            ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS email text;

            -- 2. Populate existing memberships from auth.users
            UPDATE public.memberships m
            SET email = (SELECT u.email FROM auth.users u WHERE u.id = m.user_id)
            WHERE m.email IS NULL;

            -- 3. Create a trigger function to keep email in sync (SECURITY DEFINER)
            CREATE OR REPLACE FUNCTION public.sync_membership_email()
            RETURNS TRIGGER AS $$
            BEGIN
              SELECT email INTO NEW.email FROM auth.users WHERE id = NEW.user_id;
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;

            -- 4. Add trigger for new inserts
            DROP TRIGGER IF EXISTS membership_email_sync ON public.memberships;
            CREATE TRIGGER membership_email_sync
            BEFORE INSERT ON public.memberships
            FOR EACH ROW
            EXECUTE FUNCTION public.sync_membership_email();

            -- 5. Refined check_user_exists to check for ACTIVE users
            -- (Returns true only if user exists AND has an existing membership)
            CREATE OR REPLACE FUNCTION public.check_user_active(p_email TEXT)
            RETURNS BOOLEAN
            LANGUAGE plpgsql
            SECURITY DEFINER
            AS $$
            BEGIN
              RETURN EXISTS (
                SELECT 1 
                FROM auth.users u
                JOIN memberships m ON u.id = m.user_id
                WHERE u.email = p_email
              );
            END;
            $$;
        `);

        console.log('✅ Schema updated successfully.');
    } catch (err) {
        console.error('❌ Error updating schema:', err);
    } finally {
        await client.end();
    }
}

updateSchema();
