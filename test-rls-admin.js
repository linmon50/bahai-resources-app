
const { createClient } = require('@supabase/supabase-js');


const supabaseUrl = 'https://vlztrffenluumhpsthyn.supabase.co';
const supabaseKey = 'sb_publishable__nIFnjGZ_V3LDQu_3xOZAQ_7pKdiXHz';

// Test users
const testUsers = [
  { name: 'Test User 1', email: 'linon8803@gmail.com', password: 'Scissors789', role: 'member' },
  { name: 'Test User 2', email: 'linmon8802@gmail.com', password: 'Pencil789', role: 'community_admin' },
  { name: 'Test User 3', email: 'linmon8801@gmail.com', password: 'Test8801', role: 'multi_community_admin' },
  { name: 'Test User 4', email: 'linmon8800@gmail.com', password: 'Test8800', role: 'global_admin' },
  { name: 'Test User 5', email: 'linmon880@gmail.com', password: 'Test880', role: 'member' }
];

// Create Supabase client (unauthenticated)
const supabase = createClient(supabaseUrl, supabaseKey);

async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session.access_token;
}

async function testMemberships(client) {
  const { data } = await client.from('memberships').select('*');
  return (data || []).map(m => ` - User ${m.user_id}, Community ${m.community_id}, Role ${m.role}, Approved ${m.approved}`);
}

async function testProfiles(client) {
  const { data } = await client.from('profiles').select('*');
  return (data || []).map(p => ` - ${p.display_name} (${p.user_id})`);
}

async function testEvents(client) {
  const { data } = await client.from('events').select('*');
  return (data || []).map(e => ` - ${e.title} (${e.community_id})`);
}

async function updateOwnProfile(client, userId) {
  const { data, error } = await client
    .from('profiles')
    .update({ bio: `Updated by test for ${userId}` })
    .eq('user_id', userId)
    .select();
  if (error) return null;
  return data;
}

async function runTests() {
  for (const user of testUsers) {
    console.log('==============================');
    console.log(`🔹 Testing as ${user.role} (${user.email})`);

    try {
      const token = await signIn(user.email, user.password);

      // Create an authenticated Supabase client for this user
      const client = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: `Bearer ${token}` } } });

      // Test memberships
      const memberships = await testMemberships(client);
      console.log('✅ Memberships visible:', memberships);

      // Test profiles
      const profiles = await testProfiles(client);
      console.log('✅ Profiles visible:', profiles);

      // Test events
      const events = await testEvents(client);
      console.log('✅ Events visible:', events);

      // Test updating own profile
      const updatedProfile = await updateOwnProfile(client, memberships.length ? memberships[0].user_id : user.user_id);
      console.log('✅ Updated own profile successfully:', updatedProfile);

    } catch (err) {
      console.error('❌ Error testing', user.name, ':', err.message);
    }
  }
}

runTests();






