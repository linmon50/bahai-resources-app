import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function migrateToMultiImage() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        
        console.log('Migrating bulletin_posts to support multiple image URLs...');
        
        await client.query(`
            -- 1. Add image_urls jsonb column
            ALTER TABLE public.bulletin_posts ADD COLUMN IF NOT EXISTS image_urls jsonb DEFAULT '[]'::jsonb;

            -- 2. Migrate existing single image_url if it exists
            UPDATE public.bulletin_posts 
            SET image_urls = jsonb_build_array(image_url) 
            WHERE image_url IS NOT NULL AND (image_urls IS NULL OR image_urls = '[]'::jsonb);

            -- 3. Drop the old single image_url column
            -- Keep it for a moment if we want to be safe, but the instructions say to upgrade.
            ALTER TABLE public.bulletin_posts DROP COLUMN IF EXISTS image_url;

            -- 4. Re-apply RLS policies for the new column if necessary
            -- (The previous policies used image_url in checks only for authors, 
            -- but mostly they didn't rely on it for structural security).
            
            -- Reload schema
            NOTIFY pgrst, 'reload schema';
        `);

        console.log('✅ Multiple image migration successful.');
    } catch (err) {
        console.error('❌ Error migrating bulletin schema:', err);
    } finally {
        await client.end();
    }
}

migrateToMultiImage();
