import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function fixNotifications() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();

        // 1. Add Foreign Keys to profiles to allow PostgREST to join them
        console.log('Adding foreign keys to profiles...');
        
        // Remove existing auth.users FKs if they exist so we can cleanly point to profiles
        await client.query(`
            ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
            ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_actor_id_fkey;
            ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_actor_profile_fk;
            ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_profile_fk;
            
            ALTER TABLE public.notifications 
            ADD CONSTRAINT notifications_actor_profile_fk FOREIGN KEY (actor_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;
            
            ALTER TABLE public.notifications 
            ADD CONSTRAINT notifications_user_profile_fk FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
        `);
        console.log('Foreign keys added successfully.');

        // 2. Enable Real-Time
        console.log('Enabling realtime...');
        await client.query(`
            ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
        `);
        console.log('Realtime enabled successfully.');

        // Reload schema cache for PostgREST
        await client.query(`NOTIFY pgrst, 'reload schema';`);
        console.log('Schema cache reloaded.');

    } catch(e) {
        // It might fail if the table is already in the publication
        if (e.message.includes('already in publication')) {
            console.log('Table already in publication.');
        } else {
            console.error('ERROR:', e);
        }
    } finally {
        await client.end();
    }
}

fixNotifications();
