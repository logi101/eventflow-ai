
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Params from CLI error message
const password = 'almogLogitech@101';
const host = 'aws-0-eu-central-1.pooler.supabase.com'; // Trying EU first based on edge function headers
// Actually let's try the one from the CLI error:
const hostCLI = 'aws-1-ap-south-1.pooler.supabase.com';
const user = 'postgres.byhohetafnhlakqbydbj';
const database = 'postgres';

// Connection string
// postgres://[user]:[password]@[host]:6543/[db]
// Port 6543 is commonly used for Supabase pooler (transaction mode), 5432 for session.
const connectionString = `postgresql://${user}:${encodeURIComponent(password)}@${hostCLI}:6543/${database}`;

async function runSqlFile(filename) {
    console.log(`\n📄 Processing: ${filename}`);
    console.log(`Connecting to ${hostCLI}...`);

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
        if (err.message.includes('password') || err.message.includes('SASL')) {
            console.error('   (Authentication failed - Password likely incorrect)');
        }
    } finally {
        await client.end();
    }
}

async function main() {
    await runSqlFile('apply_safe_migrations.sql');
    await runSqlFile('upgrade_admin.sql');
}

main();
