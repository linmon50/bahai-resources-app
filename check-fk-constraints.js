import pg from 'pg';
const { Client } = pg;
const client = new Client({
    connectionString: 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});
await client.connect();

// Check FK constraints on the new tables
const { rows: fks } = await client.query(`
  SELECT tc.table_name, kcu.column_name, ccu.table_schema AS foreign_schema,
         ccu.table_name AS foreign_table, ccu.column_name AS foreign_col
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('bulletin_post_likes', 'bulletin_post_comments')
  ORDER BY tc.table_name, kcu.column_name;
`);
console.log('FK Constraints:');
console.table(fks);

// Check if authenticated role can select from auth.users
const { rows: authAccess } = await client.query(`
  SELECT has_table_privilege('authenticated', 'auth.users', 'SELECT') AS can_select_auth_users;
`);
console.log('\nauthenticated can SELECT auth.users:', authAccess[0].can_select_auth_users);

await client.end();
