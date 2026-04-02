const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({ 
    connectionString: 'postgresql://postgres.pjwupmxbsricseslxmbr:Ld9cb3k9sNBIwcjUT2BRRbTbkIO932Tg@aws-1-us-east-1.pooler.supabase.com:6543/postgres' 
});

async function run() {
    try {
        await client.connect();
        console.log('--- Connected to Supabase Lovable ---');
        
        const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
        const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
        
        const startIndex = files.indexOf('20260331020000_squad_runs.sql');
        
        if (startIndex === -1) {
            console.log('Could not find starting migration');
            return;
        }

        const pendingFiles = files.slice(startIndex);
        
        for (const file of pendingFiles) {
            console.log(`Executing ${file}...`);
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            try {
                await client.query(sql);
                console.log(`✅ ${file} SUCCESS`);
            } catch(e) {
                console.error(`❌ ${file} Error:`, e.message);
                // Continue despite errors as some migrations may be partially applied and not idempotent
            }
        }

    } catch (err) {
        console.error('Critical Error:', err);
    } finally {
        await client.end();
    }
}

run();
