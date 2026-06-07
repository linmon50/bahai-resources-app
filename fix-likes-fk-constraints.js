/**
 * Fixes the FK constraints on bulletin_post_likes and bulletin_post_comments.
 * The original tables referenced auth.users(id) directly — but the `authenticated`
 * role has no SELECT on auth.users, causing every INSERT to fail with a FK violation.
 * 
 * Fix: drop the auth.users FKs and re-add them pointing to public.profiles(user_id)
 * (the same pattern used by bulletin_posts.author_id).
 */
import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function fixForeignKeys() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();
    console.log('Fixing FK constraints on likes/comments tables...');

    try {
        await client.query(`
            -- ── Find and drop existing auth.users FK constraints ─────────────────────
            DO $$
            DECLARE
                r RECORD;
            BEGIN
                -- Drop all FKs on bulletin_post_likes that reference auth schema
                FOR r IN
                    SELECT conname
                    FROM pg_constraint c
                    JOIN pg_class t ON t.oid = c.conrelid
                    JOIN pg_class f ON f.oid = c.confrelid
                    JOIN pg_namespace fn ON fn.oid = f.relnamespace
                    WHERE t.relname = 'bulletin_post_likes'
                      AND c.contype = 'f'
                      AND fn.nspname = 'auth'
                LOOP
                    EXECUTE 'ALTER TABLE public.bulletin_post_likes DROP CONSTRAINT ' || quote_ident(r.conname);
                    RAISE NOTICE 'Dropped constraint % from bulletin_post_likes', r.conname;
                END LOOP;

                -- Drop all FKs on bulletin_post_comments that reference auth schema
                FOR r IN
                    SELECT conname
                    FROM pg_constraint c
                    JOIN pg_class t ON t.oid = c.conrelid
                    JOIN pg_class f ON f.oid = c.confrelid
                    JOIN pg_namespace fn ON fn.oid = f.relnamespace
                    WHERE t.relname = 'bulletin_post_comments'
                      AND c.contype = 'f'
                      AND fn.nspname = 'auth'
                LOOP
                    EXECUTE 'ALTER TABLE public.bulletin_post_comments DROP CONSTRAINT ' || quote_ident(r.conname);
                    RAISE NOTICE 'Dropped constraint % from bulletin_post_comments', r.conname;
                END LOOP;
            END $$;
        `);
        console.log('✅  Dropped auth.users FK constraints (if any existed).');

        await client.query(`
            -- ── Add FKs pointing to public.profiles(user_id) instead ─────────────────
            -- This matches the pattern used by bulletin_posts.author_id
            ALTER TABLE public.bulletin_post_likes
                ADD CONSTRAINT bulletin_post_likes_user_id_fkey
                FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

            ALTER TABLE public.bulletin_post_comments
                ADD CONSTRAINT bulletin_post_comments_author_id_fkey
                FOREIGN KEY (author_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

            -- Reload PostgREST schema cache
            NOTIFY pgrst, 'reload schema';
        `);
        console.log('✅  Added FK constraints to public.profiles(user_id).');

        // Verify
        const { rows } = await client.query(`
            SELECT tc.table_name, kcu.column_name, ccu.table_schema AS foreign_schema,
                   ccu.table_name AS foreign_table, ccu.column_name AS foreign_col
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_name IN ('bulletin_post_likes', 'bulletin_post_comments')
            ORDER BY tc.table_name, kcu.column_name;
        `);
        console.log('\n✅  Final FK state:');
        console.table(rows);

        console.log('\n🎉  FK fix complete! Likes and comments should now work.');
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await client.end();
    }
}

fixForeignKeys();
