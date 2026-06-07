import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function fixTriggers() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();

        await client.query(`
        CREATE OR REPLACE FUNCTION handle_new_comment_like()
        RETURNS trigger AS $$
        DECLARE
          v_comment_author UUID;
          v_post_id UUID;
        BEGIN
          SELECT author_id, post_id INTO v_comment_author, v_post_id FROM public.bulletin_post_comments WHERE id = NEW.comment_id;
          IF v_comment_author != NEW.user_id THEN
            INSERT INTO public.notifications (user_id, actor_id, type, reference_id)
            VALUES (v_comment_author, NEW.user_id, 'comment_like', v_post_id);
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        `);
        console.log('Fixed comment like trigger');

        await client.query(`
        CREATE OR REPLACE FUNCTION handle_new_post_comment()
        RETURNS trigger AS $$
        DECLARE
          v_post_author UUID;
        BEGIN
          SELECT author_id INTO v_post_author FROM public.bulletin_posts WHERE id = NEW.post_id;
          IF v_post_author != NEW.author_id THEN
            INSERT INTO public.notifications (user_id, actor_id, type, reference_id)
            VALUES (v_post_author, NEW.author_id, 'post_comment', NEW.post_id);
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        `);
        console.log('Fixed post comment trigger');

    } catch(e) {
        console.error('ERROR:', e);
    } finally {
        await client.end();
    }
}

fixTriggers();
