/**
 * Fixes RLS policies for likes and comments to ensure Global Admins can see them.
 * This script updates the SELECT policies for both bulletin_post_likes and 
 * bulletin_post_comments to explicitly include public.is_global_admin(auth.uid()).
 */
import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function fixGlobalAdminRLS() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Updating RLS policies for Global Admin access...');

        await client.query(`
            -- ── Fix bulletin_post_likes SELECT policy ──────────────────────────
            DROP POLICY IF EXISTS "Members can view likes" ON public.bulletin_post_likes;
            CREATE POLICY "Members can view likes"
            ON public.bulletin_post_likes FOR SELECT
            USING (
                public.is_global_admin(auth.uid()) -- Global Admins see everything
                OR (
                    auth.uid() IS NOT NULL
                    AND EXISTS (
                        SELECT 1
                        FROM public.bulletin_posts bp
                        JOIN public.memberships m ON m.community_id = bp.community_id
                        WHERE bp.id = bulletin_post_likes.post_id
                          AND m.user_id = auth.uid()
                          AND m.approved = true
                    )
                )
            );

            -- ── Fix bulletin_post_comments SELECT policy ───────────────────────
            DROP POLICY IF EXISTS "Members can view comments" ON public.bulletin_post_comments;
            CREATE POLICY "Members can view comments"
            ON public.bulletin_post_comments FOR SELECT
            USING (
                public.is_global_admin(auth.uid()) -- Global Admins see everything
                OR (
                    auth.uid() IS NOT NULL
                    AND EXISTS (
                        SELECT 1
                        FROM public.bulletin_posts bp
                        JOIN public.memberships m ON m.community_id = bp.community_id
                        WHERE bp.id = bulletin_post_comments.post_id
                          AND m.user_id = auth.uid()
                          AND m.approved = true
                    )
                )
            );

            -- Reload PostgREST schema cache
            NOTIFY pgrst, 'reload schema';
        `);

        console.log('✅  RLS policies updated to include Global Admin access.');
    } catch (err) {
        console.error('❌ Error updating RLS policies:', err);
    } finally {
        await client.end();
    }
}

fixGlobalAdminRLS();
