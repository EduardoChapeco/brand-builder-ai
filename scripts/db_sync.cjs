const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres:Ld9cb3k9sNBIwcjUT2BRRbTbkIO932T@db.pjwupmxbsricseslxmbr.supabase.co:5432/postgres';

async function migrate() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log('Connected to Supabase DB remotely.');

        // Initialize schema migrations table if not exists (Supabase default is supabase_migrations.schema_migrations)
        await client.query(`
            CREATE SCHEMA IF NOT EXISTS supabase_migrations;
            CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
                version character varying(255) NOT NULL,
                statements text[],
                name character varying(255),
                inserted_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
                CONSTRAINT schema_migrations_pkey PRIMARY KEY (version)
            );
        `);

        const { rows } = await client.query('SELECT version FROM supabase_migrations.schema_migrations');
        const appliedVersions = new Set(rows.map(r => r.version));

        const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
        const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

        let appliedAny = false;
        for (const file of files) {
            // filename format: YYYYMMDDHHMMSS_name.sql
            const versionMatch = file.match(/^(\d{14})/);
            if (!versionMatch) continue;
            
            const version = versionMatch[1];
            if (!appliedVersions.has(version)) {
                console.log(`Applying missing migration: ${file}`);
                const fullPath = path.join(migrationsDir, file);
                const sql = fs.readFileSync(fullPath, 'utf8');
                
                try {
                    await client.query('BEGIN');
                    await client.query(sql);
                    await client.query(
                        'INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ($1, $2)',
                        [version, file.replace(/^\d{14}_/, '').replace(/\.sql$/, '')]
                    );
                    await client.query('COMMIT');
                    console.log(`Successfully applied: ${file}`);
                    appliedAny = true;
                } catch (err) {
                    await client.query('ROLLBACK');
                    console.error(`Failed to apply migration ${file}:`, err.message);
                    throw err;
                }
            }
        }

        if (!appliedAny) {
            console.log('All migrations are already up to date.');
        }

    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        await client.end();
    }
}

migrate();
