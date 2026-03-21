import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vlztrffenluumhpsthyn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__nIFnjGZ_V3LDQu_3xOZAQ_7pKdiXHz';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const users = [
  {
    name: 'Test User 1',
    email: 'linon8803@gmail.com',
    password: 'Scissors789',
    role: 'member',
  },
  {
    name: 'Test User 2',
    email: 'linmon8802@gmail.com',
    password: 'Pencil789',
    role: 'community_admin',
  },
  {
    name: 'Test User 3',
    email: 'linmon8801@gmail.com',
    password: 'Test8801',
    role: 'multi_community_admin',
  },
  {
    name: 'Test User 4',
    email: 'linmon8800@gmail.com',
    password: 'Test8800',
    role: 'global_admin',
  },
  {
    name: 'Test User 5',
    email: 'linmon880@gmail.com',
    password: 'Test880',
    role: 'member',
  },
];

// Communities
const communities = [
  { id: 'f2e41fc7-fbef-4b9c-b583-8a85a40055e7', name: 'Community A' },
  { id: '3401431b-5120-4c0c-9eca-f8bcf6388803', name: 'Community B' },
  { id: '8213ca0d-f81b-45d8-929d-d8a43d84e682', name: 'Community C' },
];

async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session.access_token;
}

async function testUser(user) {
  console.log(`\n==============================`);
  console.log(`🔹 Testing as ${user.role} (${user.email})`);

  // Sign in
  const token = await signIn(user.email, user.password);
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // Test memberships
  const { data: memberships, error: memError } = await userClient
    .from('memberships')
    .select('*');
  if (memError) console.error('❌ Error fetching memberships:', memError);
  else console.log('✅ Memberships visible:', memberships.map(m =>
    ` - User ${m.user_id}, Community ${m.community_id}, Role ${m.role}, Approved ${m.approved}`
  ));

  // Test profiles
  const { data: profiles, error: profError } = await userClient
    .from('profiles')
    .select('*');
  if (profError) console.error('❌ Error fetching profiles:', profError);
  else console.log('✅ Profiles visible:', profiles.map(p =>
    ` - ${p.display_name} (${p.user_id})`
  ));

  // Test events
  const { data: events, error: evError } = await userClient
    .from('events')
    .select('*');
  if (evError) console.error('❌ Error fetching events:', evError);
  else console.log('✅ Events visible:', events.map(e =>
    ` - ${e.title} (${e.community_id})`
  ));

  // Test updating own profile
  if (profiles.length > 0) {
    const ownProfile = profiles.find(p => p.email === user.email) || profiles[0];
    const { error: updError } = await userClient
      .from('profiles')
      .update({ display_name: ownProfile.display_name }) // just a no-op update
      .eq('user_id', ownProfile.user_id);
    if (updError) console.error('❌ Update profile failed:', updError);
    else console.log('✅ Updated own profile successfully');
  }
}

async function runTests() {
  for (const user of users) {
    try {
      await testUser(user);
    } catch (err) {
      console.error(`Error testing ${user.name}:`, err.message);
    }
  }
}

runTests();
