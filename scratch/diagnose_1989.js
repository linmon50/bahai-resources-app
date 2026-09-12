import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.vlztrffenluumhpsthyn:9FkRwsDtZw3eRGHp@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function diagnose() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        console.log('🔍 Running Viewer 1989 Diagnostics...\n');

        // 1. Find User 1989
        const userRes = await client.query(`
            SELECT id, email, created_at 
            FROM auth.users 
            WHERE email ILIKE '%1989%'
        `);
        if (userRes.rows.length === 0) {
            console.log('❌ User 1989 not found in auth.users');
            return;
        }
        const user = userRes.rows[0];
        const userId = user.id;
        console.log(`👤 User Found:`);
        console.log(`   ID: ${userId}`);
        console.log(`   Email: ${user.email}`);

        // 2. Find Profile
        const profileRes = await client.query(`
            SELECT * FROM public.profiles WHERE user_id = $1
        `, [userId]);
        if (profileRes.rows.length > 0) {
            console.log(`✅ Profile:`, profileRes.rows[0]);
        } else {
            console.log(`❌ No profile found for user.`);
        }

        // 3. Memberships
        const membershipsRes = await client.query(`
            SELECT m.*, c.name as community_name 
            FROM public.memberships m
            JOIN public.communities c ON c.id = m.community_id
            WHERE m.user_id = $1
        `, [userId]);
        console.log(`\n📋 Memberships (${membershipsRes.rows.length}):`);
        membershipsRes.rows.forEach(row => {
            console.log(`   - Community: ${row.community_name} (${row.community_id}), Approved: ${row.approved}, Role: ${row.role}`);
        });

        // 4. Session Access
        const accessRes = await client.query(`
            SELECT sa.*, ps.title as session_title, ps.community_id as session_community_id
            FROM public.session_access sa
            JOIN public.planning_sessions ps ON ps.id = sa.session_id
            WHERE sa.user_id = $1
        `, [userId]);
        console.log(`\n🔑 Session Access (${accessRes.rows.length}):`);
        accessRes.rows.forEach(row => {
            console.log(`   - Session: "${row.session_title}" (${row.session_id}), Role: ${row.role}`);
            console.log(`     Session Community ID: ${row.session_community_id}`);
        });

        if (accessRes.rows.length === 0) {
            console.log('❌ User has no session access rows.');
        } else {
            const sessionId = accessRes.rows[0].session_id;

            // 5. Test security functions for the first session they have access to
            console.log(`\n🧪 Testing SQL security functions for Session "${accessRes.rows[0].session_title}":`);
            
            // Print session details
            const sessionDetails = await client.query(`SELECT * FROM public.planning_sessions WHERE id = $1`, [sessionId]);
            console.log('Session Details:', sessionDetails.rows[0]);

            const funcRes1 = await client.query(`
                SELECT public.user_has_session_access($1, $2) as has_access
            `, [sessionId, userId]);
            console.log(`   - user_has_session_access(): ${funcRes1.rows[0].has_access}`);

            const funcRes2 = await client.query(`
                SELECT public.user_can_view_session($1, $2) as can_view
            `, [sessionId, userId]);
            console.log(`   - user_can_view_session(): ${funcRes2.rows[0].can_view}`);

            // Corrected query test
            const correctedViewRes = await client.query(`
                SELECT EXISTS (
                    SELECT 1 FROM public.planning_sessions ps
                    WHERE ps.id = $1
                      AND (
                          is_global_admin($2)
                          OR (
                              ps.community_id IN (
                                  SELECT community_id FROM public.memberships
                                  WHERE user_id = $2 AND approved = true
                              )
                              AND (
                                  ps.is_hidden = false
                                  OR ps.created_by = $2
                                  OR is_community_admin($2, ps.community_id)
                                  OR EXISTS (
                                      SELECT 1 FROM public.session_access sa
                                      WHERE sa.session_id = ps.id AND sa.user_id = $2
                                  )
                              )
                          )
                      )
                ) as corrected_can_view
            `, [sessionId, userId]);
            console.log(`   - Corrected query view check: ${correctedViewRes.rows[0].corrected_can_view}`);

            const funcRes3 = await client.query(`
                SELECT public.user_can_edit_session($1, $2) as can_edit
            `, [sessionId, userId]);
            console.log(`   - user_can_edit_session(): ${funcRes3.rows[0].can_edit}`);

            // Check planning session RLS visibility
            // Simulate user in transaction
            await client.query('BEGIN');
            await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: userId, role: 'authenticated' })]);
            
            const rlsSessionRes = await client.query(`
                SELECT id, title, community_id FROM public.planning_sessions WHERE id = $1
            `, [sessionId]);
            console.log(`\n👁️ RLS - planning_sessions visibility (simulated as 1989):`);
            if (rlsSessionRes.rows.length > 0) {
                console.log(`   - YES, can see session: "${rlsSessionRes.rows[0].title}"`);
            } else {
                console.log(`   - NO, blocked by RLS`);
            }

            const rlsTasksRes = await client.query(`
                SELECT id, title, assigned_to FROM public.session_tasks WHERE session_id = $1
            `, [sessionId]);
            console.log(`\n👁️ RLS - session_tasks count (simulated as 1989): ${rlsTasksRes.rows.length}`);
            rlsTasksRes.rows.forEach(t => {
                console.log(`     Task: "${t.title}", Assigned To: ${t.assigned_to}`);
            });

            await client.query('ROLLBACK');
        }

    } catch (err) {
        console.error('❌ Error during diagnostics:', err);
    } finally {
        await client.end();
    }
}

diagnose();
