import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function setupLikesAndComments() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Setting up Likes & Comments schema...');

        // ── 1. bulletin_post_likes ───────────────────────────────────────────
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.bulletin_post_likes (
                id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                post_id     uuid REFERENCES public.bulletin_posts(id) ON DELETE CASCADE NOT NULL,
                user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
                created_at  timestamp with time zone DEFAULT now(),
                CONSTRAINT bulletin_post_likes_unique UNIQUE (post_id, user_id)
            );

            ALTER TABLE public.bulletin_post_likes ENABLE ROW LEVEL SECURITY;

            -- SELECT: any community member can see likes on posts in their community
            DROP POLICY IF EXISTS "Members can view likes" ON public.bulletin_post_likes;
            CREATE POLICY "Members can view likes"
            ON public.bulletin_post_likes FOR SELECT
            USING (
                EXISTS (
                    SELECT 1
                    FROM public.bulletin_posts bp
                    JOIN public.memberships m ON m.community_id = bp.community_id
                    WHERE bp.id = bulletin_post_likes.post_id
                      AND m.user_id = auth.uid()
                      AND m.approved = true
                )
            );

            -- INSERT: community members can like (only their own user_id)
            DROP POLICY IF EXISTS "Members can like posts" ON public.bulletin_post_likes;
            CREATE POLICY "Members can like posts"
            ON public.bulletin_post_likes FOR INSERT
            WITH CHECK (
                user_id = auth.uid()
                AND EXISTS (
                    SELECT 1
                    FROM public.bulletin_posts bp
                    JOIN public.memberships m ON m.community_id = bp.community_id
                    WHERE bp.id = post_id
                      AND m.user_id = auth.uid()
                      AND m.approved = true
                )
            );

            -- DELETE: users can only unlike their own likes
            DROP POLICY IF EXISTS "Users can remove their own likes" ON public.bulletin_post_likes;
            CREATE POLICY "Users can remove their own likes"
            ON public.bulletin_post_likes FOR DELETE
            USING (user_id = auth.uid());
        `);
        console.log('✅  bulletin_post_likes table and policies created.');

        // ── 2. bulletin_post_comments ────────────────────────────────────────
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.bulletin_post_comments (
                id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                post_id     uuid REFERENCES public.bulletin_posts(id) ON DELETE CASCADE NOT NULL,
                author_id   uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
                content     text NOT NULL,
                created_at  timestamp with time zone DEFAULT now()
            );

            ALTER TABLE public.bulletin_post_comments ENABLE ROW LEVEL SECURITY;

            -- SELECT: community members can view comments on posts in their community
            DROP POLICY IF EXISTS "Members can view comments" ON public.bulletin_post_comments;
            CREATE POLICY "Members can view comments"
            ON public.bulletin_post_comments FOR SELECT
            USING (
                EXISTS (
                    SELECT 1
                    FROM public.bulletin_posts bp
                    JOIN public.memberships m ON m.community_id = bp.community_id
                    WHERE bp.id = bulletin_post_comments.post_id
                      AND m.user_id = auth.uid()
                      AND m.approved = true
                )
            );

            -- INSERT: community members can post comments immediately (no moderation)
            DROP POLICY IF EXISTS "Members can add comments" ON public.bulletin_post_comments;
            CREATE POLICY "Members can add comments"
            ON public.bulletin_post_comments FOR INSERT
            WITH CHECK (
                author_id = auth.uid()
                AND EXISTS (
                    SELECT 1
                    FROM public.bulletin_posts bp
                    JOIN public.memberships m ON m.community_id = bp.community_id
                    WHERE bp.id = post_id
                      AND m.user_id = auth.uid()
                      AND m.approved = true
                )
            );

            -- DELETE: comment author OR community admin can delete
            DROP POLICY IF EXISTS "Authors and admins can delete comments" ON public.bulletin_post_comments;
            CREATE POLICY "Authors and admins can delete comments"
            ON public.bulletin_post_comments FOR DELETE
            USING (
                author_id = auth.uid()
                OR public.is_global_admin(auth.uid())
                OR EXISTS (
                    SELECT 1
                    FROM public.bulletin_posts bp
                    JOIN public.memberships m ON m.community_id = bp.community_id
                    WHERE bp.id = bulletin_post_comments.post_id
                      AND m.user_id = auth.uid()
                      AND m.approved = true
                      AND m.role = 'admin'
                )
            );
        `);
        console.log('✅  bulletin_post_comments table and policies created.');

        // ── 3. Reload PostgREST schema cache ────────────────────────────────
        await client.query(`NOTIFY pgrst, 'reload schema';`);
        console.log('✅  Schema reload notified.');

        console.log('\n🎉 Likes & Comments schema fully applied!');
    } catch (err) {
        console.error('❌ Error setting up Likes & Comments schema:', err);
    } finally {
        await client.end();
    }
}

setupLikesAndComments();
