/**
 * Grants SELECT, INSERT, DELETE permissions on the new likes/comments tables
 * to the authenticated and anon Supabase roles.
 * Also simplifies the RLS policies to avoid potential RLS-within-RLS recursion.
 */
import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function fixPermissions() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Fixing permissions for likes & comments tables...');

        await client.query(`
            -- ── Grant base table access to Supabase roles ──────────────────────────
            GRANT SELECT, INSERT, DELETE ON public.bulletin_post_likes    TO authenticated;
            GRANT SELECT, INSERT, DELETE ON public.bulletin_post_comments  TO authenticated;
            GRANT SELECT                 ON public.bulletin_post_likes    TO anon;
            GRANT SELECT                 ON public.bulletin_post_comments  TO anon;

            -- ── Rebuild likes RLS policies (simpler, no RLS-within-RLS risk) ───────
            DROP POLICY IF EXISTS "Members can view likes"         ON public.bulletin_post_likes;
            DROP POLICY IF EXISTS "Members can like posts"         ON public.bulletin_post_likes;
            DROP POLICY IF EXISTS "Users can remove their own likes" ON public.bulletin_post_likes;

            -- SELECT: any authenticated user in the same community may see likes
            CREATE POLICY "Members can view likes"
            ON public.bulletin_post_likes FOR SELECT
            USING (
                auth.uid() IS NOT NULL
                AND EXISTS (
                    SELECT 1
                    FROM public.bulletin_posts bp
                    JOIN public.memberships m
                      ON m.community_id = bp.community_id
                     AND m.user_id = auth.uid()
                     AND m.approved = true
                    WHERE bp.id = bulletin_post_likes.post_id
                )
            );

            -- INSERT: members can insert their own likes only
            CREATE POLICY "Members can like posts"
            ON public.bulletin_post_likes FOR INSERT
            WITH CHECK (
                user_id = auth.uid()
                AND EXISTS (
                    SELECT 1
                    FROM public.bulletin_posts bp
                    JOIN public.memberships m
                      ON m.community_id = bp.community_id
                     AND m.user_id = auth.uid()
                     AND m.approved = true
                    WHERE bp.id = post_id
                )
            );

            -- DELETE: users can only delete their own likes
            CREATE POLICY "Users can remove their own likes"
            ON public.bulletin_post_likes FOR DELETE
            USING (user_id = auth.uid());


            -- ── Rebuild comments RLS policies ────────────────────────────────────────
            DROP POLICY IF EXISTS "Members can view comments"            ON public.bulletin_post_comments;
            DROP POLICY IF EXISTS "Members can add comments"             ON public.bulletin_post_comments;
            DROP POLICY IF EXISTS "Authors and admins can delete comments" ON public.bulletin_post_comments;

            -- SELECT: community members can read comments
            CREATE POLICY "Members can view comments"
            ON public.bulletin_post_comments FOR SELECT
            USING (
                auth.uid() IS NOT NULL
                AND EXISTS (
                    SELECT 1
                    FROM public.bulletin_posts bp
                    JOIN public.memberships m
                      ON m.community_id = bp.community_id
                     AND m.user_id = auth.uid()
                     AND m.approved = true
                    WHERE bp.id = bulletin_post_comments.post_id
                )
            );

            -- INSERT: community members can post comments immediately (no moderation)
            CREATE POLICY "Members can add comments"
            ON public.bulletin_post_comments FOR INSERT
            WITH CHECK (
                author_id = auth.uid()
                AND EXISTS (
                    SELECT 1
                    FROM public.bulletin_posts bp
                    JOIN public.memberships m
                      ON m.community_id = bp.community_id
                     AND m.user_id = auth.uid()
                     AND m.approved = true
                    WHERE bp.id = post_id
                )
            );

            -- DELETE: comment author OR community admin can delete
            CREATE POLICY "Authors and admins can delete comments"
            ON public.bulletin_post_comments FOR DELETE
            USING (
                author_id = auth.uid()
                OR public.is_global_admin(auth.uid())
                OR EXISTS (
                    SELECT 1
                    FROM public.bulletin_posts bp
                    JOIN public.memberships m
                      ON m.community_id = bp.community_id
                     AND m.user_id = auth.uid()
                     AND m.approved = true
                     AND m.role = 'admin'
                    WHERE bp.id = bulletin_post_comments.post_id
                )
            );

            -- Reload PostgREST schema cache
            NOTIFY pgrst, 'reload schema';
        `);

        console.log('✅  Permissions granted and policies rebuilt.');
        console.log('🎉  Fix complete!');
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

fixPermissions();
