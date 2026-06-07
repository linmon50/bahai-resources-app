import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function patchCommentLikesPolicies() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Patching bulletin_comment_likes RLS policies...');

        await client.query(`
            -- Drop and recreate SELECT policy to allow global admins
            DROP POLICY IF EXISTS "Members can view comment likes" ON public.bulletin_comment_likes;
            CREATE POLICY "Members can view comment likes"
            ON public.bulletin_comment_likes FOR SELECT
            USING (
                public.is_global_admin(auth.uid())
                OR EXISTS (
                    SELECT 1
                    FROM public.bulletin_post_comments c
                    JOIN public.bulletin_posts bp ON bp.id = c.post_id
                    JOIN public.memberships m ON m.community_id = bp.community_id
                    WHERE c.id = bulletin_comment_likes.comment_id
                      AND m.user_id = auth.uid()
                      AND m.approved = true
                )
            );

            -- Drop and recreate INSERT policy to allow global admins
            DROP POLICY IF EXISTS "Members can like comments" ON public.bulletin_comment_likes;
            CREATE POLICY "Members can like comments"
            ON public.bulletin_comment_likes FOR INSERT
            WITH CHECK (
                user_id = auth.uid()
                AND (
                    public.is_global_admin(auth.uid())
                    OR EXISTS (
                        SELECT 1
                        FROM public.bulletin_post_comments c
                        JOIN public.bulletin_posts bp ON bp.id = c.post_id
                        JOIN public.memberships m ON m.community_id = bp.community_id
                        WHERE c.id = comment_id
                          AND m.user_id = auth.uid()
                          AND m.approved = true
                    )
                )
            );

            -- DELETE policy already uses user_id = auth.uid(), which works fine for global admins too.
            -- Recreating for clarity.
            DROP POLICY IF EXISTS "Users can remove their own comment likes" ON public.bulletin_comment_likes;
            CREATE POLICY "Users can remove their own comment likes"
            ON public.bulletin_comment_likes FOR DELETE
            USING (user_id = auth.uid());
        `);

        console.log('✅  bulletin_comment_likes RLS policies patched successfully.');
        await client.query(`NOTIFY pgrst, 'reload schema';`);
        console.log('✅  Schema reload notified.');
    } catch (err) {
        console.error('❌ Error patching policies:', err);
    } finally {
        await client.end();
    }
}

patchCommentLikesPolicies();
