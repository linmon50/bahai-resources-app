import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function fixRelationship() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Adding foreign key constraint from memberships to profiles...');
        
        await client.query(`
            -- First, check if there's any orphaned data (unlikely if they all reference auth.users)
            
            -- Add the foreign key constraint
            ALTER TABLE public.memberships
            ADD CONSTRAINT fk_memberships_profile
            FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) NOT VALID;
        `);

        // We must notify PostgREST to reload its schema cache!
        await client.query(`NOTIFY pgrst, 'reload schema'`);

        console.log('✅ Relationship added and schema cache reloaded.');
    } catch (err) {
        if (err.code === '42710') {
            console.log('✅ Constraint fk_memberships_profile already exists.');
        } else {
            console.error('❌ Error adding relationship:', err);
        }
    } finally {
        await client.end();
    }
}

fixRelationship();
