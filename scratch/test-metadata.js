import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vlztrffenluumhpsthyn.supabase.co";
const SUPABASE_KEY = "sb_publishable__nIFnjGZ_V3LDQu_3xOZAQ_7pKdiXHz";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  console.log("Fetching notifications...");
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching notifications:", error);
    return;
  }

  console.log(`Fetched ${data.length} notifications:`);
  data.forEach((n, idx) => {
    console.log(`\n--- Notification ${idx + 1} ---`);
    console.log(`ID: ${n.id}`);
    console.log(`Type: ${n.type}`);
    console.log(`Created At: ${n.created_at}`);
    console.log(`Metadata:`, JSON.stringify(n.metadata, null, 2));
  });
}

test();
