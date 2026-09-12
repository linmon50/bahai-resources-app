import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function testRls() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        console.log('🧪 Starting viewer RLS update verification tests...\n');

        const viewerEmail = 'linmon8803+1989@gmail.com';
        const userRes = await client.query('SELECT id FROM auth.users WHERE email = $1', [viewerEmail]);
        const viewerId = userRes.rows[0].id;
        
        // Find tasks in the Random Meet Up session
        const sessionRes = await client.query("SELECT id FROM public.planning_sessions WHERE title = 'Random Meet Up'");
        const sessionId = sessionRes.rows[0].id;

        const tasksRes = await client.query("SELECT id, title, assigned_to FROM public.session_tasks WHERE session_id = $1", [sessionId]);
        const selfTask = tasksRes.rows.find(t => t.assigned_to === viewerId);
        const otherTask = tasksRes.rows.find(t => t.assigned_to !== viewerId);

        console.log(`Self Task: "${selfTask?.title}" (ID: ${selfTask?.id})`);
        console.log(`Other Task: "${otherTask?.title}" (ID: ${otherTask?.id})`);

        // Begin transaction to test simulated RLS
        await client.query('BEGIN');
        await client.query('SET ROLE authenticated');
        await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: viewerId, role: 'authenticated' })]);

        // TEST 1: Update self-task status (Should SUCCEED)
        console.log('\nTest 1: Updating own task status to "in_progress"...');
        await client.query('SAVEPOINT t1');
        try {
            const res1 = await client.query(
                "UPDATE public.session_tasks SET status = 'in_progress' WHERE id = $1 RETURNING status", 
                [selfTask.id]
            );
            if (res1.rows.length > 0) {
                console.log(`✅ Success! Updated status to: ${res1.rows[0].status}`);
            } else {
                console.log('❌ Failed: No rows updated (blocked by RLS)');
            }
        } catch (e) {
            console.log(`❌ Error: ${e.message}`);
            await client.query('ROLLBACK TO t1');
        }

        // TEST 2: Update self-task title (Should SUCCEED)
        console.log('\nTest 2: Updating own task title...');
        await client.query('SAVEPOINT t2');
        try {
            const res2 = await client.query(
                "UPDATE public.session_tasks SET title = 'Bring Cold Drinks' WHERE id = $1 RETURNING title", 
                [selfTask.id]
            );
            if (res2.rows.length > 0) {
                console.log(`✅ Success! Updated title to: ${res2.rows[0].title}`);
            } else {
                console.log('❌ Failed: No rows updated (blocked by RLS)');
            }
        } catch (e) {
            console.log(`❌ Error: ${e.message}`);
            await client.query('ROLLBACK TO t2');
        }

        // TEST 3: Update self-task assignee to someone else (Should FAIL)
        console.log('\nTest 3: Attempting to reassign own task to another user...');
        const otherUserId = 'ccf25a27-e419-4b59-838e-12394d2811df'; // creator id
        await client.query('SAVEPOINT t3');
        try {
            const res3 = await client.query(
                "UPDATE public.session_tasks SET assigned_to = $1 WHERE id = $2 RETURNING assigned_to", 
                [otherUserId, selfTask.id]
            );
            if (res3.rows.length > 0) {
                console.log('❌ Failure: Successfully changed assignee! (RLS WITH CHECK bypass!)');
            } else {
                console.log('✅ Success: RLS blocked the update (no rows updated)');
            }
        } catch (e) {
            console.log(`✅ Success: RLS blocked the update with error: ${e.message}`);
            await client.query('ROLLBACK TO t3');
        }

        // TEST 4: Update other-task status (Should FAIL)
        console.log('\nTest 4: Attempting to update status of a task assigned to someone else...');
        await client.query('SAVEPOINT t4');
        try {
            const res4 = await client.query(
                "UPDATE public.session_tasks SET status = 'done' WHERE id = $1 RETURNING status", 
                [otherTask.id]
            );
            if (res4.rows.length > 0) {
                console.log('❌ Failure: Successfully updated other task! (RLS bypass!)');
            } else {
                console.log('✅ Success: RLS blocked the update (no rows updated)');
            }
        } catch (e) {
            console.log(`✅ Success: RLS blocked the update with error: ${e.message}`);
            await client.query('ROLLBACK TO t4');
        }

        await client.query('ROLLBACK');
        console.log('\n🎉 Verification tests completed!');
    } catch (err) {
        console.error('❌ Error during testing:', err);
    } finally {
        await client.end();
    }
}

testRls();
