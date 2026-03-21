// test-events-rls-all.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vlztrffenluumhpsthyn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__nIFnjGZ_V3LDQu_3xOZAQ_7pKdiXHz';

// ✅ List all test users
const TEST_USERS = [
  {
    name: 'Test User 1',
    email: 'linon8803@gmail.com',
    password: 'Scissors789'
  },
  {
    name: 'Test User 2',
    email: 'linmon8802@gmail.com',
    password: 'Pencil789'
  },
  {
    name: 'Test User 3',
    email: 'linmon8801@gmail.com',
    password: 'Test8801'
  },
  {
    name: 'Test User 4',
    email: 'linmon8800@gmail.com',
    password: 'Test8800'
  },
  {
    name: 'Test User 5',
    email: 'linmon880@gmail.com',
    password: 'Test880'
  }
];

// Example community for creating a test event
const TEST_COMMUNITY_ID = 'f2e41fc7-fbef-4b9c-b583-8a85a40055e7'; // Community A

async function runTest() {
  for (const user of TEST_USERS) {
    console.log('\n==============================');
    console.log(`🔹 Testing as ${user.name} (${user.email})`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 1️⃣ Log in
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: user.password
    });

    if (loginError) {
      console.error('❌ Login failed:', loginError.message);
      continue;
    }

    console.log('✅ Logged in as:', loginData.user.id);

    // 2️⃣ Create a client using the user's session (for RLS)
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${loginData.session.access_token}`
        }
      }
    });

    // 3️⃣ View events
    const { data: events, error: selectError } = await supabaseUser.from('events').select('*');
    if (selectError) {
      console.error('❌ Error selecting events:', selectError.message);
    } else {
      console.log('✅ Events visible to this user:', events.map(e => `${e.title} (${e.community_id})`));
    }

    // 4️⃣ Test creating a new event in Community A
    const { data: inserted, error: insertError } = await supabaseUser
      .from('events')
      .insert({
        community_id: TEST_COMMUNITY_ID,
        created_by: loginData.user.id,
        title: 'Test Event Creation',
        description: 'Testing RLS insert',
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // +1 hour
        location: 'Test Location'
      })
      .select();

    if (insertError) {
      console.log('❌ Insert blocked by RLS:', insertError.message);
    } else {
      console.log('✅ Insert succeeded:', inserted.map(e => e.title));
    }

    // 5️⃣ Test updating the first visible event (should be allowed only if creator or admin)
    if (events && events.length > 0) {
      const firstEventId = events[0].id;
      const { data: updated, error: updateError } = await supabaseUser
        .from('events')
        .update({ title: 'Updated by RLS Test' })
        .eq('id', firstEventId)
        .select();

      if (updateError) {
        console.log('❌ Update blocked by RLS:', updateError.message);
      } else {
        console.log('✅ Update succeeded:', updated.map(e => e.title));
      }
    } else {
      console.log('⚠ No events to test update for this user.');
    }
  }
}

runTest();
