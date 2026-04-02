import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function checkTable(table) {
  const { error } = await supabase.from(table).select('id').limit(1);
  if (error && error.code === 'PGRST106') {
     console.log(`[MISSING] ${table}`);
  } else if (error) {
     console.log(`[ERROR] ${table} - ${error.message} (${error.code})`);
  } else {
     console.log(`[EXISTS] ${table}`);
  }
}

async function run() {
  const checkLists = [
    'brand_templates', 'bio_links', 'squad_runs', 'agent_prds', 'news_items'
  ];
  for (const t of checkLists) {
    await checkTable(t);
  }
}
run();
