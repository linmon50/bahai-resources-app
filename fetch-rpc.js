import pg from 'pg';

const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function getRPC() {
  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query(`
    SELECT proname, prosecdef, pg_get_function_arguments(p.oid) as arguments, prosrc 
    FROM pg_proc p
    WHERE proname IN ('is_global_admin', 'is_community_admin');
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

getRPC();
