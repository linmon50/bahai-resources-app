/**
 * Fixes INSERT RLS policies for likes and comments to allow Global Admins 
 * to participate even if they aren't members of the specific community.
 */
import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function fixGlobalAdminInsertRLS() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Updating INSERT RLS policies for Global Admin access...');

        await client.query(`
            -- ── Fix bulletin_post_likes INSERT policy ──────────────────────────
            DROP POLICY IF EXISTS "Members can like posts" ON public.bulletin_post_likes;
            CREATE POLICY "Members can like posts"
            ON public.bulletin_post_likes FOR INSERT
            WITH CHECK (
                user_id = auth.uid()
                AND (
                    public.is_global_admin(auth.uid())
                    OR EXISTS (
                        SELECT 1
                        FROM public.bulletin_posts bp
                        JOIN public.memberships m ON m.community_id = bp.community_id
                        WHERE bp.id = post_id
                          AND m.user_id = auth.uid()
                          AND m.approved = true
                    )
                )
            );

            -- ── Fix bulletin_post_comments INSERT policy ───────────────────────
            DROP POLICY IF EXISTS "Members can add comments" ON public.bulletin_post_comments;
            CREATE POLICY "Members can add comments"
            ON public.bulletin_post_comments FOR INSERT
            WITH CHECK (
                author_id = auth.uid()
                AND (
                    public.is_global_admin(auth.uid())
                    OR EXISTS (
                        SELECT 1
                        FROM public.bulletin_posts bp
                        JOIN public.memberships m ON m.community_id = bp.community_id
                        WHERE bp.id = post_id
                          AND m.user_id = auth.uid()
                          AND m.approved = true
                    )
                )
            );

            -- Reload PostgREST schema cache
            NOTIFY pgrst, 'reload schema';
        `);

        console.log('✅  INSERT policies updated to include Global Admin access.');
    } catch (err) {
        console.error('❌ Error updating INSERT policies:', err);
    } finally {
        await client.end();
    }
}

fixGlobalAdminInsertRLS();
