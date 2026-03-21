import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://vlztrffenluumhpsthyn.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
// The key is present in supabaseClient.js, let's just import it from there
import supabase from './src/supabaseClient.js';

async function testSignup() {
    const email = "linmon8803+testinvalidcode@gmail.com";
    const password = "password123";
    const inviteCode = "INVALIDCODE";

    console.log(`Testing signup for ${email} with invalid code ${inviteCode}...`);

    try {
        // 0. Pre-validate
        const { data: validationResult, error: valError } = await supabase.rpc(
            "validate_invite_pre_signup",
            { p_code: inviteCode, p_email: email }
        );

        console.log("Validation Result:", validationResult);

        if (valError) throw valError;

        if (validationResult === 'invalid') {
            throw new Error("Invalid invite code. Please check for typos.");
        }

        console.log("This should not be reached!");
    } catch (err) {
        console.log("Caught Error (As Expected):", err.message);
    }

    // Double check if user exists
    const { data, error } = await supabase.rpc("check_user_active", { p_email: email });
    console.log("Does user exist in auth.users?:", data);
    console.log("Done.");
}

testSignup();
