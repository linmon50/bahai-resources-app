import pg from 'pg';
const { Client } = pg;
const client = new Client({
    connectionString: 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});
await client.connect();

// 1. bulletin_posts schema
const { rows: columns } = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bulletin_posts'
    ORDER BY ordinal_position;
`);
console.log('\n--- bulletin_posts columns ---');
console.table(columns);

// 2. bulletin_posts RLS policies
const { rows: postPolicies } = await client.query(`
    SELECT policyname, cmd, roles, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'bulletin_posts';
`);
console.log('\n--- bulletin_posts RLS ---');
console.table(postPolicies.map(p => ({
    name: p.policyname,
    cmd: p.cmd,
    roles: p.roles
})));

// 3. bulletin_post_comments RLS policies
const { rows: commentPolicies } = await client.query(`
    SELECT policyname, cmd, roles, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'bulletin_post_comments';
`);
console.log('\n--- bulletin_post_comments RLS ---');
console.table(commentPolicies.map(p => ({
    name: p.policyname,
    cmd: p.cmd,
    roles: p.roles
})));

await client.end();
