import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testQuery() {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id, display_name,
      community_members (
        communities ( name )
      )
    `)
    .limit(1);
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Data:', JSON.stringify(data, null, 2));
  }
}

testQuery();
