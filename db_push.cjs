const { Client } = require('pg');
const fs = require('fs');

const client = new Client({ 
    connectionString: 'postgresql://postgres.pjwupmxbsricseslxmbr:Ld9cb3k9sNBIwcjUT2BRRbTbkIO932Tg@aws-1-us-east-1.pooler.supabase.com:6543/postgres' 
});

async function run() {
    try {
        await client.connect();
        console.log('--- Connected to Supabase Lovable ---');
        
        const sql1 = fs.readFileSync('supabase/migrations/20260401143000_phase3_incremental.sql', 'utf8');
        console.log('Executing phase3_incremental.sql...');
        try {
            await client.query(sql1);
            console.log('✅ phase3_incremental.sql SUCCESS');
        } catch(e) {
            console.error('❌ SQL1 Error:', e.message);
        }

        const sql2 = fs.readFileSync('supabase/migrations/20260402150000_site_builder.sql', 'utf8');
        console.log('Executing site_builder.sql...');
        try {
            await client.query(sql2);
            console.log('✅ site_builder.sql SUCCESS');
        } catch(e) {
            console.error('❌ SQL2 Error:', e.message);
        }

    } catch (err) {
        console.error('Critical Error:', err);
    } finally {
        await client.end();
    }
}

run();
