import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://vlztrffenluumhpsthyn.supabase.co";
const supabaseKey = "sb_publishable__nIFnjGZ_V3LDQu_3xOZAQ_7pKdiXHz";
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser(email) {
    console.log(`Checking if user exists: ${email}`);
    const { data, error } = await supabase.rpc("check_user_exists", { p_email: email });
    if (error) {
        console.error("Error calling check_user_exists:", error.message);
    } else {
        console.log(`Result for ${email}:`, data);
        if (data) {
            // If user exists, check their memberships
            const { data: userData, error: userError } = await supabase.from("memberships").select("community_id").eq("email", email);
            // Wait, memberships table doesn't have email yet! Joining by user_id.
            // But I don't have the user_id here. 
            // Let's just check if they are in the memberships table at all.
            const { data: mData, error: mError } = await supabase.rpc("get_community_members_by_email", { p_email: email });
            // I'll create this RPC for testing if needed, or just use a query if I had the ID.
            // Actually, I can just query memberships by user_id if I get the user_id from auth.users.
            // But I don't have an RPC for that.

            // Let's just see if they have any active memberships.
        }
    }
}

checkUser("linmon8803+testz@gmail.com");
checkUser("linmon8803+nonexistent@gmail.com");
