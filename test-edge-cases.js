// test-edge-cases.js
import { createClient } from '@supabase/supabase-js';

// Supabase project info
const SUPABASE_URL = 'https://vlztrffenluumhpsthyn.supabase.co';
const SUPABASE_KEY = 'sb_publishable__nIFnjGZ_V3LDQu_3xOZAQ_7pKdiXHz'; // anon/public key

// List of test users
const testUsers = [
  { role: 'Member Only', email: 'linon8803@gmail.com', password: 'Scissors789' },
  { role: 'Community Admin', email: 'linmon8802@gmail.com', password: 'Pencil789' },
  { role: 'Multi-Community Admin', email: 'linmon8801@gmail.com', password: 'Test8801' },
  { role: 'Global Admin', email: 'linmon8800@gmail.com', password: 'Test8800' },
];

// Helper to create a user client session
async function getUserClient(email, password) {
  const client = createClient(SUPABASE_URL, SUPABASE_KEY);

  const { data: sessionData, error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) throw signInError;

  // Create a new client that uses the user's session
  const userClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${sessionData.session.access_token}` } },
  });

  return userClient;
}

// Helper to test what the user can see
async function testUserAccess(user) {
  console.log(`\n🔹 Testing as ${user.role} (${user.email})`);

  try {
    const userClient = await getUserClient(user.email, user.password);

    const { data: memberships, error: mError } = await userClient
      .from('memberships')
      .select('*');

    const { data: profiles, error: pError } = await userClient
      .from('profiles')
      .select('*');

    const { data: events, error: eError } = await userClient
      .from('events')
      .select('*');

    console.log('✅ Memberships visible:', memberships, mError);
    console.log('✅ Profiles visible:', profiles, pError);
    console.log('✅ Events visible:', events, eError);
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

// Run all tests
async function runTests() {
  for (const user of testUsers) {
    await testUserAccess(user);
  }
  console.log('\n==============================\nAll tests done.');
}

runTests();
