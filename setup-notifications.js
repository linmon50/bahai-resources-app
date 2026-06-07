import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function setupNotifications() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        console.log('🔧 Setting up Notifications schema...\n');

        // 1. Create notifications table
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.notifications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
                actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
                type TEXT NOT NULL,
                reference_id UUID,
                is_read BOOLEAN DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        console.log('✅ notifications table');

        // 2. Enable RLS and add Policies
        await client.query(`
            ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

            DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
            CREATE POLICY "Users can view their own notifications" 
              ON public.notifications FOR SELECT 
              USING (auth.uid() = user_id);

            DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
            CREATE POLICY "Users can update their own notifications" 
              ON public.notifications FOR UPDATE 
              USING (auth.uid() = user_id);

            DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
            CREATE POLICY "System can insert notifications" 
              ON public.notifications FOR INSERT 
              WITH CHECK (true);
        `);
        console.log('✅ RLS and Policies');

        // 3. Triggers for Planning Session Tasks
        await client.query(`
            CREATE OR REPLACE FUNCTION handle_new_task_assignment()
            RETURNS trigger AS $$
            BEGIN
              IF NEW.assigned_to IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
                IF NEW.assigned_to != auth.uid() THEN
                  INSERT INTO public.notifications (user_id, actor_id, type, reference_id)
                  VALUES (NEW.assigned_to, auth.uid(), 'task_assigned', NEW.session_id);
                END IF;
              END IF;
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;

            DROP TRIGGER IF EXISTS on_task_assigned ON public.session_tasks;
            CREATE TRIGGER on_task_assigned
              AFTER INSERT OR UPDATE ON public.session_tasks
              FOR EACH ROW EXECUTE PROCEDURE handle_new_task_assignment();
        `);
        console.log('✅ Task assignment trigger');

        // 4. Triggers for Bulletin Post Comments
        await client.query(`
            CREATE OR REPLACE FUNCTION handle_new_post_comment()
            RETURNS trigger AS $$
            DECLARE
              post_author UUID;
            BEGIN
              SELECT author_id INTO post_author FROM public.bulletin_posts WHERE id = NEW.post_id;
              IF post_author != NEW.author_id THEN
                INSERT INTO public.notifications (user_id, actor_id, type, reference_id)
                VALUES (post_author, NEW.author_id, 'post_comment', NEW.post_id);
              END IF;
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;

            DROP TRIGGER IF EXISTS on_post_comment ON public.bulletin_post_comments;
            CREATE TRIGGER on_post_comment
              AFTER INSERT ON public.bulletin_post_comments
              FOR EACH ROW EXECUTE PROCEDURE handle_new_post_comment();
        `);
        console.log('✅ Post comment trigger');

        // 5. Triggers for Comment Likes
        await client.query(`
            CREATE OR REPLACE FUNCTION handle_new_comment_like()
            RETURNS trigger AS $$
            DECLARE
              comment_author UUID;
              post_id UUID;
            BEGIN
              SELECT author_id, post_id INTO comment_author, post_id FROM public.bulletin_post_comments WHERE id = NEW.comment_id;
              IF comment_author != NEW.user_id THEN
                INSERT INTO public.notifications (user_id, actor_id, type, reference_id)
                VALUES (comment_author, NEW.user_id, 'comment_like', post_id);
              END IF;
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;

            DROP TRIGGER IF EXISTS on_comment_like ON public.bulletin_comment_likes;
            CREATE TRIGGER on_comment_like
              AFTER INSERT ON public.bulletin_comment_likes
              FOR EACH ROW EXECUTE PROCEDURE handle_new_comment_like();
        `);
        console.log('✅ Comment like trigger');

        await client.query(`NOTIFY pgrst, 'reload schema';`);
        console.log('\n🎉 Notifications schema fully applied!');

    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error(err);
    } finally {
        await client.end();
    }
}

setupNotifications();
