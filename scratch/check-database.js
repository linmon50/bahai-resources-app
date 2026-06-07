import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vlztrffenluumhpsthyn.supabase.co";
const SUPABASE_KEY = "sb_publishable__nIFnjGZ_V3LDQu_3xOZAQ_7pKdiXHz";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  const { data: profiles } = await supabase.from("profiles").select("*");
  console.log("Profiles in DB:", profiles ? profiles.length : 0);
  if (profiles && profiles.length > 0) {
    console.log("Sample profile:", profiles[0]);
  }

  const { data: posts } = await supabase.from("bulletin_posts").select("*");
  console.log("Posts in DB:", posts ? posts.length : 0);
  if (posts && posts.length > 0) {
    console.log("Sample post:", posts[0]);
  }
}

check();
