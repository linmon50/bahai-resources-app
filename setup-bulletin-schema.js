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
        
        console.log('Applying Bulletin Board schema updates...');
        
        await client.query(`
            -- 1. Create bulletin_posts table
            CREATE TABLE IF NOT EXISTS public.bulletin_posts (
                id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
                author_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
                content text NOT NULL,
                image_url text,
                link_url text,
                status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
                rejection_reason text,
                is_pinned boolean DEFAULT false,
                created_at timestamp with time zone DEFAULT now()
            );

            -- 2. Enable RLS
            ALTER TABLE public.bulletin_posts ENABLE ROW LEVEL SECURITY;

            -- 3. SELECT Policy
            DROP POLICY IF EXISTS "Users can view approved posts and their own posts" ON public.bulletin_posts;
            CREATE POLICY "Users can view approved posts and their own posts" 
            ON public.bulletin_posts FOR SELECT 
            USING (
              public.is_global_admin(auth.uid()) 
              OR author_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM public.memberships m
                WHERE m.user_id = auth.uid() 
                  AND m.community_id = bulletin_posts.community_id
                  AND m.approved = true
                  -- If viewer is admin, they can see all statuses. If not, only 'approved'.
                  AND (m.role = 'admin' OR bulletin_posts.status = 'approved')
              )
            );

            -- 4. INSERT Policy
            -- Users can only insert into their own communities, and standard users MUST force status=pending.
            DROP POLICY IF EXISTS "Users can create posts in their communities" ON public.bulletin_posts;
            CREATE POLICY "Users can create posts in their communities" 
            ON public.bulletin_posts FOR INSERT 
            WITH CHECK (
              author_id = auth.uid()
              AND EXISTS (
                SELECT 1 FROM public.memberships m
                WHERE m.user_id = auth.uid() 
                  AND m.community_id = bulletin_posts.community_id
                  AND m.approved = true
                  -- Normal users must insert 'pending', Admins can insert any valid status.
                  AND (m.role = 'admin' OR bulletin_posts.status = 'pending')
              )
            );

            -- 5. UPDATE Policy
            -- Only Admins can update a post (to approve, reject, pin).
            DROP POLICY IF EXISTS "Admins can update posts" ON public.bulletin_posts;
            CREATE POLICY "Admins can update posts" 
            ON public.bulletin_posts FOR UPDATE 
            USING (
              public.is_global_admin(auth.uid()) 
              OR EXISTS (
                SELECT 1 FROM public.memberships m
                WHERE m.user_id = auth.uid() 
                  AND m.community_id = bulletin_posts.community_id
                  AND m.approved = true
                  AND m.role = 'admin'
              )
            );

            -- 6. DELETE Policy
            -- Authors can delete their own posts, Admins can delete any post.
            DROP POLICY IF EXISTS "Authors and Admins can delete posts" ON public.bulletin_posts;
            CREATE POLICY "Authors and Admins can delete posts" 
            ON public.bulletin_posts FOR DELETE 
            USING (
              author_id = auth.uid()
              OR public.is_global_admin(auth.uid()) 
              OR EXISTS (
                SELECT 1 FROM public.memberships m
                WHERE m.user_id = auth.uid() 
                  AND m.community_id = bulletin_posts.community_id
                  AND m.approved = true
                  AND m.role = 'admin'
              )
            );

            -- 7. Create storage bucket for bulletin images
            INSERT INTO storage.buckets (id, name, public) 
            VALUES ('bulletin_images', 'bulletin_images', true) 
            ON CONFLICT (id) DO NOTHING;

            -- 8. Storage bucket policies (bulletin_images)
            -- SELECT (Public read allowed for images)
            DROP POLICY IF EXISTS "Bulletin images are publicly accessible." ON storage.objects;
            CREATE POLICY "Bulletin images are publicly accessible." 
            ON storage.objects FOR SELECT 
            USING (bucket_id = 'bulletin_images');

            -- INSERT (Authenticated users can upload)
            DROP POLICY IF EXISTS "Anyone can upload a bulletin image." ON storage.objects;
            CREATE POLICY "Anyone can upload a bulletin image." 
            ON storage.objects FOR INSERT 
            WITH CHECK (bucket_id = 'bulletin_images' AND auth.role() = 'authenticated');

            -- DELETE (Only the owner/uploader can delete their image)
            DROP POLICY IF EXISTS "Anyone can delete their own bulletin image." ON storage.objects;
            CREATE POLICY "Anyone can delete their own bulletin image." 
            ON storage.objects FOR DELETE 
            USING (bucket_id = 'bulletin_images' AND auth.uid() = owner);

            -- Notify PostgREST to reload schema
            NOTIFY pgrst, 'reload schema';
        `);

        console.log('✅ Bulletin Board schema successfully applied.');
    } catch (err) {
        console.error('❌ Error updating bulletin schema:', err);
    } finally {
        await client.end();
    }
}

updateSchema();
