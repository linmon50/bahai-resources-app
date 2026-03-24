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

        console.log('Applying User Profiles schema updates...');
        
        await client.query(`
            -- 1. Alter profiles table
            ALTER TABLE public.profiles
              DROP COLUMN IF EXISTS accessibility_needs,
              ADD COLUMN IF NOT EXISTS contact_email text,
              ADD COLUMN IF NOT EXISTS phone text,
              ADD COLUMN IF NOT EXISTS contact_preferences text,
              ADD COLUMN IF NOT EXISTS show_contact_info boolean DEFAULT true,
              ADD COLUMN IF NOT EXISTS show_bio boolean DEFAULT true,
              ADD COLUMN IF NOT EXISTS show_skills boolean DEFAULT true,
              ADD COLUMN IF NOT EXISTS show_experiences boolean DEFAULT true,
              ADD COLUMN IF NOT EXISTS experience_roles jsonb DEFAULT '[]'::jsonb,
              ADD COLUMN IF NOT EXISTS talents_and_abilities jsonb DEFAULT '[]'::jsonb,
              ADD COLUMN IF NOT EXISTS materials jsonb DEFAULT '[]'::jsonb;

            -- 2. Create profile_experiences table
            CREATE TABLE IF NOT EXISTS public.profile_experiences (
                id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                user_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
                title text NOT NULL,
                description text,
                related_event_id uuid,
                start_date date,
                end_date date,
                is_visible boolean DEFAULT true,
                created_at timestamp with time zone DEFAULT now()
            );

            -- 3. RLS for profile_experiences
            ALTER TABLE public.profile_experiences ENABLE ROW LEVEL SECURITY;

            DROP POLICY IF EXISTS "Users can manage their own experiences" ON public.profile_experiences;
            CREATE POLICY "Users can manage their own experiences" 
            ON public.profile_experiences FOR ALL 
            USING (auth.uid() = user_id) 
            WITH CHECK (auth.uid() = user_id);

            DROP POLICY IF EXISTS "Users can view community experiences" ON public.profile_experiences;
            CREATE POLICY "Users can view community experiences" 
            ON public.profile_experiences FOR SELECT 
            USING (
              (auth.uid() = user_id) 
              OR is_global_admin(auth.uid()) 
              OR EXISTS (
                SELECT 1 FROM memberships m1 
                JOIN memberships m2 ON m1.community_id = m2.community_id 
                WHERE m1.user_id = auth.uid() 
                  AND m1.approved = true 
                  AND m2.user_id = profile_experiences.user_id 
                  AND m2.approved = true
              )
            );

            -- 4. Create avatars storage bucket
            INSERT INTO storage.buckets (id, name, public) 
            VALUES ('avatars', 'avatars', true) 
            ON CONFLICT (id) DO NOTHING;

            -- 5. Storage bucket policies (avatars)
            -- SELECT
            DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
            CREATE POLICY "Avatar images are publicly accessible." 
            ON storage.objects FOR SELECT 
            USING (bucket_id = 'avatars');

            -- INSERT
            DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;
            CREATE POLICY "Anyone can upload an avatar." 
            ON storage.objects FOR INSERT 
            WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

            -- UPDATE
            DROP POLICY IF EXISTS "Anyone can update their own avatar." ON storage.objects;
            CREATE POLICY "Anyone can update their own avatar." 
            ON storage.objects FOR UPDATE 
            USING (bucket_id = 'avatars' AND auth.uid() = owner)
            WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

            -- DELETE
            DROP POLICY IF EXISTS "Anyone can delete their own avatar." ON storage.objects;
            CREATE POLICY "Anyone can delete their own avatar." 
            ON storage.objects FOR DELETE 
            USING (bucket_id = 'avatars' AND auth.uid() = owner);
        `);

        console.log('✅ Schema updated successfully.');
    } catch (err) {
        console.error('❌ Error updating schema:', err);
    } finally {
        await client.end();
    }
}

updateSchema();
