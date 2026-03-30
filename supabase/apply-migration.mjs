import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://pjwupmxbsricseslxmbr.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseKey) {
  console.error('SUPABASE_SERVICE_KEY env var required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const sql = readFileSync('./supabase/migrations/20260330000000_postgen_multi_tenant.sql', 'utf8');

const { error } = await supabase.rpc('exec_sql', { query: sql }).catch(() => ({ error: 'rpc_not_available' }));
if (error) {
  console.log('RPC not available, migration SQL ready at:', './supabase/migrations/20260330000000_postgen_multi_tenant.sql');
  console.log('Apply it manually via Supabase Dashboard → SQL Editor');
} else {
  console.log('Migration applied successfully');
}
