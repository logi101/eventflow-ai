
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Password provided by user
const passwordRaw = 'almogLogitech@101';
const password = encodeURIComponent(passwordRaw);
const projectRef = 'byhohetafnhlakqbydbj';
const connectionString = `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`;

async function runSqlFile(filename) {
    console.log(`\n📄 Processing: ${filename}`);
    console.log('Connecting to database...');

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected successfully!');

        const sqlPath = path.join(__dirname, filename);
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executing SQL...');
        await client.query(sql);

        console.log(`✅ Success: ${filename}`);
    } catch (err) {
        console.error(`❌ Error in ${filename}:`, err.message);
        if (err.message.includes('password')) {
            console.error('   (Authentication failed)');
        }
    } finally {
        await client.end();
    }
}

async function main() {
    // 1. Run Migrations (Idempotent)
    await runSqlFile('apply_safe_migrations.sql');

    // 2. Upgrade Admin
    await runSqlFile('upgrade_admin.sql');
}

main();
