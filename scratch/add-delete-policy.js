import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function run() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Adding DELETE policy to public.notifications...');
    await client.query(`
      DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
      CREATE POLICY "Users can delete their own notifications" 
        ON public.notifications FOR DELETE 
        USING (auth.uid() = user_id);
    `);
    console.log('Policy added successfully!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
