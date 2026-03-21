// test-rls-simple.js
import { createClient } from '@supabase/supabase-js';

// --------------------
// 1️⃣ Config — replace these
// --------------------
const SUPABASE_URL = 'https://vlztrffenluumhpsthyn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__nIFnjGZ_V3LDQu_3xOZAQ_7pKdiXHz';

const TEST_USER1 = { email: 'linon8803@gmail.com', password: 'Scissors789' };

// Replace with the real UUID of another test user
const TEST_USER2_ID = 'c51f2492-978d-4f26-aa57-3dcfcc949f89';

// --------------------
// 2️⃣ Main function
// --------------------
async function runTest() {
  // Create a client with your anon key
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // --- Step 1: Log in test user 1 ---
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword(TEST_USER1);

  if (loginError) {
    console.error('Login failed:', loginError);
    return;
  }

  console.log('✅ Logged in as test user 1:', loginData.user.id);

  // --- Step 2: Create a new client that uses the session token for RLS ---
  const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${loginData.session.access_token}`,
      },
    },
  });

  // --- Step 3: SELECT profiles visible to test user 1 ---
  const { data: profiles, error: selectError } = await supabaseUser.from('profiles').select('*');
  if (selectError) {
    console.error('Error selecting profiles:', selectError);
  } else {
    console.log('✅ Profiles visible to test user 1:', profiles);
  }

  // --- Step 4: Update own profile ---
  const { data: updatedSelf, error: updateSelfError } = await supabaseUser
    .from('profiles')
    .update({ bio: 'Updated bio from test script' })
    .eq('user_id', loginData.user.id)
    .select(); // return the updated row

  if (updateSelfError) {
    console.error('❌ Failed to update own profile:', updateSelfError);
  } else {
    console.log('✅ Updated own profile successfully:', updatedSelf);
  }

  // --- Step 5: Attempt to update another user's profile (should be blocked) ---
  const { data: hackedData, error: hackedError } = await supabaseUser
    .from('profiles')
    .update({ bio: 'Hacked bio' })
    .eq('user_id', TEST_USER2_ID)
    .select();

  if (hackedData.length === 0) {
  console.log('✅ RLS blocked updating another user (no rows updated)');
} else {
  console.log('❌ Unexpectedly updated another user:', hackedData);
}

}

// --------------------
// 3️⃣ Run the test
// --------------------
runTest();

