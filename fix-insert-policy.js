import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function fixInsertPolicy() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        
        console.log('Fixing Bulletin Board INSERT RLS policy...');
        
        await client.query(`
            DROP POLICY IF EXISTS "Users can create posts in their communities" ON public.bulletin_posts;
            
            -- Recreate the policy, this time explicitly allowing global admins
            CREATE POLICY "Users can create posts in their communities" 
            ON public.bulletin_posts FOR INSERT 
            WITH CHECK (
              author_id = auth.uid()
              AND (
                public.is_global_admin(auth.uid()) 
                OR EXISTS (
                  SELECT 1 FROM public.memberships m
                  WHERE m.user_id = auth.uid() 
                    AND m.community_id = bulletin_posts.community_id
                    AND m.approved = true
                    AND (m.role = 'admin' OR bulletin_posts.status = 'pending')
                )
              )
            );

            -- Notify PostgREST to reload schema
            NOTIFY pgrst, 'reload schema';
        `);

        console.log('✅ INSERT policy successfully updated to allow global admins.');
    } catch (err) {
        console.error('❌ Error updating policy:', err);
    } finally {
        await client.end();
    }
}

fixInsertPolicy();
