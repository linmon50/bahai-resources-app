import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function setupCommentLikes() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Setting up Comment Likes schema...');

        await client.query(`
            CREATE TABLE IF NOT EXISTS public.bulletin_comment_likes (
                id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                comment_id  uuid REFERENCES public.bulletin_post_comments(id) ON DELETE CASCADE NOT NULL,
                user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
                created_at  timestamp with time zone DEFAULT now(),
                CONSTRAINT bulletin_comment_likes_unique UNIQUE (comment_id, user_id)
            );

            ALTER TABLE public.bulletin_comment_likes ENABLE ROW LEVEL SECURITY;

            -- SELECT: any authenticated user who can view comments can view comment likes
            DROP POLICY IF EXISTS "Members can view comment likes" ON public.bulletin_comment_likes;
            CREATE POLICY "Members can view comment likes"
            ON public.bulletin_comment_likes FOR SELECT
            USING (
                EXISTS (
                    SELECT 1
                    FROM public.bulletin_post_comments c
                    JOIN public.bulletin_posts bp ON bp.id = c.post_id
                    JOIN public.memberships m ON m.community_id = bp.community_id
                    WHERE c.id = bulletin_comment_likes.comment_id
                      AND m.user_id = auth.uid()
                      AND m.approved = true
                )
            );

            -- INSERT: community members can like comments
            DROP POLICY IF EXISTS "Members can like comments" ON public.bulletin_comment_likes;
            CREATE POLICY "Members can like comments"
            ON public.bulletin_comment_likes FOR INSERT
            WITH CHECK (
                user_id = auth.uid()
                AND EXISTS (
                    SELECT 1
                    FROM public.bulletin_post_comments c
                    JOIN public.bulletin_posts bp ON bp.id = c.post_id
                    JOIN public.memberships m ON m.community_id = bp.community_id
                    WHERE c.id = comment_id
                      AND m.user_id = auth.uid()
                      AND m.approved = true
                )
            );

            -- DELETE: users can only remove their own comment likes
            DROP POLICY IF EXISTS "Users can remove their own comment likes" ON public.bulletin_comment_likes;
            CREATE POLICY "Users can remove their own comment likes"
            ON public.bulletin_comment_likes FOR DELETE
            USING (user_id = auth.uid());
        `);
        console.log('✅  bulletin_comment_likes table and policies created.');

        // Reload schema cache
        await client.query(`NOTIFY pgrst, 'reload schema';`);
        console.log('✅  Schema reload notified.');

        console.log('\\n🎉 Comment Likes schema fully applied!');
    } catch (err) {
        console.error('❌ Error setting up Comment Likes schema:', err);
    } finally {
        await client.end();
    }
}

setupCommentLikes();
