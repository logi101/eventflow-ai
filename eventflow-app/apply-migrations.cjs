
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Password 'Logitech$102'
// Encoding special characters for connection string
const password = encodeURIComponent('Logitech$102');
const connectionString = `postgresql://postgres:${password}@db.byhohetafnhlakqbydbj.supabase.co:5432/postgres`;

async function applyMigrations() {
    console.log('Connecting to database...');
    console.log('Connection String (masked):', connectionString.replace(password, '*****'));

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected successfully! Applying migrations...');

        // Read the migration file
        const sqlPath = path.join(__dirname, 'apply_pending_migrations.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Execute the SQL
        await client.query(sql);

        console.log('✅ Migrations applied successfully!');
    } catch (err) {
        console.log('');
        console.error('❌ Error applying migrations:', err.message);
        if (err.message.includes('password') || err.message.includes('SASL')) {
            console.error('   (Authentication failed - Check password)');
        }
    } finally {
        await client.end();
    }
}

applyMigrations();
