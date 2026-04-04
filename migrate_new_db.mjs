import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;
const pass = encodeURIComponent('EEaR6399!@#2026');

const connectionStrings = [
  // 1. Transaction Pooler (Moderno) - Porta 6543, User Normal
  `postgresql://postgres:${pass}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
  // 2. Transaction Pooler (Tenant User)
  `postgresql://postgres.xhdoupxnpjbzkzuhucpp:${pass}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
  // 3. Session Pooler (Moderno) - Porta 5432, User Normal
  `postgresql://postgres:${pass}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
  // 4. Session Pooler (Tenant User)
  `postgresql://postgres.xhdoupxnpjbzkzuhucpp:${pass}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`
];

async function tryConnect(connString) {
  const client = new Client({ connectionString: connString });
  try {
    await client.connect();
    console.log('✅ Sucesso ao conectar com:', connString.replace(pass, '***'));
    return client;
  } catch (err) {
    console.log(`❌ Falha com ${connString.replace(pass, '***')} : ${err.message}`);
    return null;
  }
}

async function runMigrations() {
  let client = null;
  for (const conn of connectionStrings) {
    client = await tryConnect(conn);
    if (client) break;
  }

  if (!client) {
    console.error('Falha crítica: Nenhuma Connection String funcionou.');
    process.exit(1);
  }

  try {
    console.log('\n⏳ Iniciando migrations...');
    const dir = './supabase/migrations';
    const files = fs.readdirSync(dir).sort();

    for (const file of files) {
      if (!file.endsWith('.sql')) continue;
      
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      try {
        await client.query(sql);
        console.log(`✅ ${file}`);
      } catch (err) {
        console.error(`❌ Erro em ${file}: ${err.message}`);
      }
    }
    
    console.log('\n🎉 Todas as migrations finalizadas!');
  } finally {
    await client.end();
  }
}

runMigrations();
