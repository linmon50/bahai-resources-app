import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://vlztrffenluumhpsthyn.supabase.co";
const SUPABASE_KEY = "sb_publishable__nIFnjGZ_V3LDQu_3xOZAQ_7pKdiXHz";

const COMMUNITY_ADMIN = { email: 'linmon8802@gmail.com', password: 'Pencil789' };
const MULTI_COMMUNITY_ADMIN = { email: 'linmon8801@gmail.com', password: 'Test8801' };
const GLOBAL_ADMIN = { email: 'linmon8800@gmail.com', password: 'Test8800' };

async function login(user) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data, error } = await supabase.auth.signInWithPassword(user);
    if (error) throw error;

    return createClient(SUPABASE_URL, SUPABASE_KEY, {
        global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    });
}

async function testInsert() {
    const userClient = await login(COMMUNITY_ADMIN);
    const targetCommunity = 'f2e41fc7-fbef-4b9c-b583-8a85a40055e7'; // Community A

    const { data: { user } } = await userClient.auth.getUser();

    console.log("Logged in as:", user.email, "ID:", user.id);

    const { data, error } = await userClient
        .from('invites')
        .insert([
            {
                code: 'TEST2026',
                community_id: targetCommunity,
                role: 'member',
                admin_level: 0,
                email: 'testtest@example.com',
                created_by: user.id
            }
        ]);

    if (error) {
        console.error("❌ Insert failed:", error.message);
    } else {
        console.log("✅ Insert succeeded:", data);
    }
}

testInsert();
