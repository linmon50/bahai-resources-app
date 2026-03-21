import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vlztrffenluumhpsthyn.supabase.co";
const SUPABASE_KEY = "sb_publishable__nIFnjGZ_V3LDQu_3xOZAQ_7pKdiXHz";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    console.log("Checking invite requests...");
    const { data, error } = await supabase.from("invite_requests")
        .select("*")
        .eq("email", "linmon8803+testtestj@gmail.com");
    console.log(data, error);
}

check();
