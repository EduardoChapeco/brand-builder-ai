import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xhdoupxnpjbzkzuhucpp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) throw new Error('Missing anon key');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  console.log('Login...');
  const { data: { session }, error: loginErr } = await supabase.auth.signInWithPassword({
    email: 'test@example.com', // wait I don't know the exact user email/pwd, but I know the user ID.
  });
}
test();
