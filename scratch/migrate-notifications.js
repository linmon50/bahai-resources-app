import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function migrate() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        console.log('🔄 Connecting to Supabase database...');
        await client.connect();
        console.log('🔄 Running notifications database migrations...');

        // 1. Add metadata column
        console.log('Adding metadata column if not exists...');
        await client.query(`
            ALTER TABLE public.notifications
            ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
        `);

        // 2. Update handle_new_post_comment function
        console.log('Updating handle_new_post_comment trigger function...');
        await client.query(`
            CREATE OR REPLACE FUNCTION public.handle_new_post_comment()
            RETURNS trigger AS $$
            DECLARE
              v_post_author_id   UUID;
              v_post_author_name TEXT;
              v_post_snippet     TEXT;
            BEGIN
              SELECT p.author_id,
                     pr.display_name,
                     LEFT(p.content, 60)
                INTO v_post_author_id, v_post_author_name, v_post_snippet
                FROM public.bulletin_posts p
                LEFT JOIN public.profiles pr ON pr.user_id = p.author_id
               WHERE p.id = NEW.post_id;

              -- Don't notify if commenter is the post author
              IF v_post_author_id IS NULL OR v_post_author_id = NEW.author_id THEN
                RETURN NEW;
              END IF;

              INSERT INTO public.notifications (user_id, actor_id, type, reference_id, metadata)
              VALUES (
                v_post_author_id,
                NEW.author_id,
                'post_comment',
                NEW.post_id,
                jsonb_build_object(
                  'post_author_name', COALESCE(v_post_author_name, 'Someone'),
                  'post_snippet',     v_post_snippet
                )
              );

              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
        `);

        // 3. Update handle_new_comment_like function
        console.log('Updating handle_new_comment_like trigger function...');
        await client.query(`
            CREATE OR REPLACE FUNCTION public.handle_new_comment_like()
            RETURNS trigger AS $$
            DECLARE
              v_comment_author_id UUID;
              v_post_author_name  TEXT;
              v_post_snippet      TEXT;
              v_post_id           UUID;
            BEGIN
              SELECT c.author_id,
                     pr.display_name,
                     LEFT(p.content, 60),
                     c.post_id
                INTO v_comment_author_id, v_post_author_name, v_post_snippet, v_post_id
                FROM public.bulletin_post_comments c
                JOIN public.bulletin_posts p ON p.id = c.post_id
                LEFT JOIN public.profiles pr ON pr.user_id = p.author_id
               WHERE c.id = NEW.comment_id;

              -- Don't notify if liker is the comment author
              IF v_comment_author_id IS NULL OR v_comment_author_id = NEW.user_id THEN
                RETURN NEW;
              END IF;

              INSERT INTO public.notifications (user_id, actor_id, type, reference_id, metadata)
              VALUES (
                v_comment_author_id,
                NEW.user_id,
                'comment_like',
                v_post_id,
                jsonb_build_object(
                  'post_author_name', COALESCE(v_post_author_name, 'Someone'),
                  'post_snippet',     v_post_snippet
                )
              );

              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
        `);

        // 4. Create new handle_new_post_like function and trigger
        console.log('Creating/updating handle_new_post_like trigger function and trigger...');
        await client.query(`
            CREATE OR REPLACE FUNCTION public.handle_new_post_like()
            RETURNS trigger AS $$
            DECLARE
              v_post_author_id UUID;
              v_post_snippet   TEXT;
            BEGIN
              SELECT p.author_id,
                     LEFT(p.content, 60)
                INTO v_post_author_id, v_post_snippet
                FROM public.bulletin_posts p
               WHERE p.id = NEW.post_id;

              -- Don't notify if liker is the post author
              IF v_post_author_id IS NULL OR v_post_author_id = NEW.user_id THEN
                RETURN NEW;
              END IF;

              INSERT INTO public.notifications (user_id, actor_id, type, reference_id, metadata)
              VALUES (
                v_post_author_id,
                NEW.user_id,
                'post_like',
                NEW.post_id,
                jsonb_build_object(
                  'post_snippet', v_post_snippet
                )
              );

              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;

            DROP TRIGGER IF EXISTS on_post_like ON public.bulletin_post_likes;
            CREATE TRIGGER on_post_like
              AFTER INSERT ON public.bulletin_post_likes
              FOR EACH ROW EXECUTE FUNCTION public.handle_new_post_like();
        `);

        // Reload schema cache
        await client.query(`NOTIFY pgrst, 'reload schema';`);
        console.log('🎉 Database migrations completed successfully!');
    } catch (err) {
        console.error('❌ Migration error:', err.message);
    } finally {
        await client.end();
    }
}

migrate();
