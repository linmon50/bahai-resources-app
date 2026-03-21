// test-admins.js
import { createClient } from '@supabase/supabase-js';

// --------------------
// 1️⃣ Supabase config
// --------------------
const SUPABASE_URL = 'https://vlztrffenluumhpsthyn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__nIFnjGZ_V3LDQu_3xOZAQ_7pKdiXHz';

// --------------------
// 2️⃣ Test users
// Replace with your actual test users
// --------------------

// Regular member (User 5 - not an admin of the target community)
const REGULAR_USER = { email: 'linmon880@gmail.com', password: 'Test880' };

// Community admin (User 2 - admin for Community A)
const COMMUNITY_ADMIN = { email: 'linmon8802@gmail.com', password: 'Pencil789' };

// Multi-community admin (User 3 - admin for various, including A)
const MULTI_COMMUNITY_ADMIN = { email: 'linmon8801@gmail.com', password: 'Test8801' };

// Global admin (User 4)
const GLOBAL_ADMIN = { email: 'linmon8800@gmail.com', password: 'Test8800' };

// Test membership target (user to be approved)
const TARGET_MEMBER_ID = 'd63a1675-bb92-4157-b3c5-cb1e50629a4d'; // replace with a real member UUID

// Target community
const TARGET_COMMUNITY_ID = 'f2e41fc7-fbef-4b9c-b583-8a85a40055e7'; // replace with real community UUID

// --------------------
// 3️⃣ Helper to log in
// --------------------
async function login(user) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.signInWithPassword(user);
  if (error) throw error;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });
}

// --------------------
// 4️⃣ Test approval attempt
// --------------------
async function attemptApproval(supabaseUser, adminName) {
  try {
    const { data, error } = await supabaseUser
      .from('memberships')
      .update({ approved: true })
      .eq('user_id', TARGET_MEMBER_ID)
      .eq('community_id', TARGET_COMMUNITY_ID)
      .select();

    if (error) {
      console.log(`❌ ${adminName} cannot approve:`, error.message);
    } else if (data.length === 0) {
      console.log(`❌ ${adminName} cannot approve: no rows updated`);
    } else {
      console.log(`✅ ${adminName} approved member successfully:`, data);
    }
  } catch (err) {
    console.error(`Error for ${adminName}:`, err.message);
  }
}

// --------------------
// 5️⃣ Run tests
// --------------------
async function runTests() {
  console.log('--- Testing Membership Approval ---');

  const regular = await login(REGULAR_USER);
  await attemptApproval(regular, 'Regular member');

  const commAdmin = await login(COMMUNITY_ADMIN);
  await attemptApproval(commAdmin, 'Community admin');

  const multiAdmin = await login(MULTI_COMMUNITY_ADMIN);
  await attemptApproval(multiAdmin, 'Multi-community admin');

  const globalAdmin = await login(GLOBAL_ADMIN);
  await attemptApproval(globalAdmin, 'Global admin');

  console.log('--- Test Complete ---');
}

runTests();
