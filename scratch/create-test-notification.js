import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vlztrffenluumhpsthyn.supabase.co";
const SUPABASE_KEY = "sb_publishable__nIFnjGZ_V3LDQu_3xOZAQ_7pKdiXHz";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function createTestNotifications() {
  console.log("Fetching profiles...");
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .limit(2);

  if (profileError || !profiles || profiles.length === 0) {
    console.error("Error fetching profiles:", profileError);
    return;
  }

  const targetUser = profiles[0];
  const actorUser = profiles[1] || targetUser;

  console.log(`Target User (recipient): ${targetUser.display_name} (${targetUser.user_id})`);
  console.log(`Actor User (doer): ${actorUser.display_name} (${actorUser.user_id})`);

  console.log("Inserting post_like notification...");
  const { error: err1 } = await supabase
    .from("notifications")
    .insert({
      user_id: targetUser.user_id,
      actor_id: actorUser.user_id,
      type: "post_like",
      is_read: false,
      metadata: {
        post_snippet: "Salty Chips are the best food ever created"
      }
    });

  if (err1) {
    console.error("Error inserting post_like:", err1);
  } else {
    console.log("Success: Inserted post_like notification!");
  }

  console.log("Inserting comment_like notification...");
  const { error: err2 } = await supabase
    .from("notifications")
    .insert({
      user_id: targetUser.user_id,
      actor_id: actorUser.user_id,
      type: "comment_like",
      is_read: false,
      metadata: {
        post_author_name: "Salty Chips Enthusiast",
        post_snippet: "What are your favorite snacks?"
      }
    });

  if (err2) {
    console.error("Error inserting comment_like:", err2);
  } else {
    console.log("Success: Inserted comment_like notification!");
  }
}

createTestNotifications();
