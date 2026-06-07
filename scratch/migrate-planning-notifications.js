import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function run() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    console.log('Connecting to database...');
    await client.connect();

    // 1. Update handle_new_task_assignment
    console.log('Updating handle_new_task_assignment trigger function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.handle_new_task_assignment()
      RETURNS trigger AS $$
      DECLARE
        v_session_title TEXT;
      BEGIN
        IF NEW.assigned_to IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
          IF NEW.assigned_to != auth.uid() THEN
            SELECT title INTO v_session_title FROM public.planning_sessions WHERE id = NEW.session_id;

            INSERT INTO public.notifications (user_id, actor_id, type, reference_id, metadata)
            VALUES (
              NEW.assigned_to,
              auth.uid(),
              'task_assigned',
              NEW.session_id,
              jsonb_build_object('session_title', COALESCE(v_session_title, 'Untitled Session'))
            );
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    // 2. Create handle_new_session_access
    console.log('Creating handle_new_session_access trigger function and trigger...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.handle_new_session_access()
      RETURNS trigger AS $$
      DECLARE
        v_session_title TEXT;
      BEGIN
        -- Don't notify if the user is granting access to themselves
        IF NEW.user_id = auth.uid() THEN
          RETURN NEW;
        END IF;

        SELECT title INTO v_session_title FROM public.planning_sessions WHERE id = NEW.session_id;

        INSERT INTO public.notifications (user_id, actor_id, type, reference_id, metadata)
        VALUES (
          NEW.user_id,
          COALESCE(NEW.granted_by, auth.uid()),
          'session_access',
          NEW.session_id,
          jsonb_build_object('session_title', COALESCE(v_session_title, 'Untitled Session'))
        );

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      DROP TRIGGER IF EXISTS on_session_access_granted ON public.session_access;
      CREATE TRIGGER on_session_access_granted
        AFTER INSERT ON public.session_access
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_session_access();
    `);

    // 3. Reload schema cache for PostgREST
    await client.query(`NOTIFY pgrst, 'reload schema';`);
    console.log('🎉 Database migrations for planning notifications completed successfully!');

  } catch (err) {
    console.error('❌ Migration error:', err.message);
  } finally {
    await client.end();
  }
}

run();
