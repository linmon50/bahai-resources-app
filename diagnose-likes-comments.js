/**
 * Diagnostic: checks table existence, grants, and policies for likes/comments tables.
 */
import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function diagnose() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();

    // 1. Check tables exist
    const { rows: tables } = await client.query(`
        SELECT table_name, table_type
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('bulletin_post_likes', 'bulletin_post_comments', 'bulletin_posts')
        ORDER BY table_name;
    `);
    console.log('\n── Tables found ──');
    console.table(tables);

    // 2. Check grants on the new tables
    const { rows: grants } = await client.query(`
        SELECT grantee, table_name, privilege_type, is_grantable
        FROM information_schema.role_table_grants
        WHERE table_schema = 'public'
          AND table_name IN ('bulletin_post_likes', 'bulletin_post_comments')
        ORDER BY table_name, grantee, privilege_type;
    `);
    console.log('\n── Grants on new tables ──');
    if (grants.length === 0) {
        console.log('⚠️  NO GRANTS FOUND — this is the problem!');
    } else {
        console.table(grants);
    }

    // 3. Check RLS policies
    const { rows: policies } = await client.query(`
        SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
        FROM pg_policies
        WHERE tablename IN ('bulletin_post_likes', 'bulletin_post_comments')
        ORDER BY tablename, policyname;
    `);
    console.log('\n── RLS Policies ──');
    console.table(policies.map(p => ({
        table: p.tablename,
        policy: p.policyname,
        cmd: p.cmd,
        roles: p.roles
    })));

    // 4. Check if RLS is enabled on the tables
    const { rows: rlsStatus } = await client.query(`
        SELECT relname AS table, relrowsecurity AS rls_enabled, relforcerowsecurity AS rls_forced
        FROM pg_class
        WHERE relname IN ('bulletin_post_likes', 'bulletin_post_comments')
          AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    `);
    console.log('\n── RLS Status ──');
    console.table(rlsStatus);

    // 5. Check bulletin_posts table grants for comparison
    const { rows: bpGrants } = await client.query(`
        SELECT grantee, privilege_type
        FROM information_schema.role_table_grants
        WHERE table_schema = 'public'
          AND table_name = 'bulletin_posts'
        ORDER BY grantee, privilege_type;
    `);
    console.log('\n── bulletin_posts grants (for comparison) ──');
    console.table(bpGrants);

    await client.end();
}

diagnose().catch(console.error);
