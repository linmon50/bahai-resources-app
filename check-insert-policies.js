import pg from 'pg';
const { Client } = pg;
const client = new Client({
    connectionString: 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});
await client.connect();

const { rows: policies } = await client.query(`
    SELECT policyname, tablename, cmd, with_check
    FROM pg_policies
    WHERE tablename IN ('bulletin_post_likes', 'bulletin_post_comments')
      AND cmd = 'INSERT';
`);

console.log('Current INSERT Policies:');
console.table(policies);

await client.end();
