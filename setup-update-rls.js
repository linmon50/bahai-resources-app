/**
 * Adds UPDATE RLS policies for bulletin_posts and bulletin_post_comments.
 * This allows authors to edit their own content and Global Admins to moderate.
 */
import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function setupUpdateRLS() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Setting up UPDATE RLS policies...');

        await client.query(`
            -- ── bulletin_posts UPDATE policy ───────────────────────────────
            DROP POLICY IF EXISTS "Authors can update their own posts" ON public.bulletin_posts;
            CREATE POLICY "Authors can update their own posts"
            ON public.bulletin_posts FOR UPDATE
            USING (auth.uid() = author_id OR public.is_global_admin(auth.uid()))
            WITH CHECK (auth.uid() = author_id OR public.is_global_admin(auth.uid()));

            -- ── bulletin_post_comments UPDATE policy ────────────────────────
            DROP POLICY IF EXISTS "Authors can update their own comments" ON public.bulletin_post_comments;
            CREATE POLICY "Authors can update their own comments"
            ON public.bulletin_post_comments FOR UPDATE
            USING (auth.uid() = author_id OR public.is_global_admin(auth.uid()))
            WITH CHECK (auth.uid() = author_id OR public.is_global_admin(auth.uid()));

            -- Reload PostgREST schema cache
            NOTIFY pgrst, 'reload schema';
        `);

        console.log('✅  UPDATE policies successfully applied.');
    } catch (err) {
        console.error('❌ Error applying UPDATE policies:', err);
    } finally {
        await client.end();
    }
}

setupUpdateRLS();
