import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vlztrffenluumhpsthyn.supabase.co";
const SUPABASE_KEY = "sb_publishable__nIFnjGZ_V3LDQu_3xOZAQ_7pKdiXHz";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test_rpc() {
    const email = "linmon8803+testtestj@gmail.com";
    const communityId = "f2e41fc7-fbef-4b9c-b583-8a85a40055e7";

    console.log("Testing check_existing_members...");
    const { data, error } = await supabase.rpc("check_existing_members", {
        p_emails: [email],
        p_community_id: communityId
    });

    console.log("Result:", data, error);
}

test_rpc();
