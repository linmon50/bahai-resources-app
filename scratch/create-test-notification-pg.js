import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function createTestNotifications() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Fetching active profiles and sessions...');

    const res = await client.query('SELECT user_id, display_name FROM public.profiles');
    const profiles = res.rows;

    if (profiles.length === 0) {
      console.log('No profiles found in the database. Please sign up or add profiles first.');
      return;
    }

    // Try to get a real session
    const sessionRes = await client.query('SELECT id, title FROM public.planning_sessions LIMIT 1');
    const dbSession = sessionRes.rows[0];
    const sessionId = dbSession ? dbSession.id : '00000000-0000-0000-0000-000000000000';
    const sessionTitle = dbSession ? dbSession.title : 'Annual Community Gathering';

    console.log(`Using Session: "${sessionTitle}" (${sessionId})`);
    console.log(`Inserting test notifications for all ${profiles.length} profiles...`);

    for (const targetUser of profiles) {
      // Pick a different user as the actor if possible, otherwise use targetUser
      const actorUser = profiles.find(p => p.user_id !== targetUser.user_id) || targetUser;

      console.log(`- Recipient: ${targetUser.display_name} | Actor: ${actorUser.display_name}`);

      // 1. Insert post_like notification
      await client.query(`
        INSERT INTO public.notifications (user_id, actor_id, type, reference_id, metadata)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        targetUser.user_id,
        actorUser.user_id,
        'post_like',
        '00000000-0000-0000-0000-000000000000',
        JSON.stringify({ post_snippet: 'Salty Chips are the best food ever created' })
      ]);

      // 2. Insert comment_like notification
      await client.query(`
        INSERT INTO public.notifications (user_id, actor_id, type, reference_id, metadata)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        targetUser.user_id,
        actorUser.user_id,
        'comment_like',
        '00000000-0000-0000-0000-000000000000',
        JSON.stringify({
          post_author_name: 'Salty Chips Enthusiast',
          post_snippet: 'What are your favorite snacks?'
        })
      ]);

      // 3. Insert task_assigned notification
      await client.query(`
        INSERT INTO public.notifications (user_id, actor_id, type, reference_id, metadata)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        targetUser.user_id,
        actorUser.user_id,
        'task_assigned',
        sessionId,
        JSON.stringify({ session_title: sessionTitle })
      ]);

      // 4. Insert session_access notification
      await client.query(`
        INSERT INTO public.notifications (user_id, actor_id, type, reference_id, metadata)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        targetUser.user_id,
        actorUser.user_id,
        'session_access',
        sessionId,
        JSON.stringify({ session_title: sessionTitle })
      ]);
    }

    console.log('🎉 Successfully created test notifications for all users!');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

createTestNotifications();
