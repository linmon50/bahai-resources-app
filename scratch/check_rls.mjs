import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// read supabase config from src/supabaseClient.js or .env
// We can just use PostgreSQL client to query pg_policies!
import pkg from 'pg';
const { Client } = pkg;

const run = async () => {
    // Need connection string
    // Let me check .env
};
run();
