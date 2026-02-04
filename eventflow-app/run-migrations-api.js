
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_REF = 'byhohetafnhlakqbydbj';
const ACCESS_TOKEN = 'sbp_138c933fe66e8a78f7dc511274ff9615a0a25f08';

async function runSql() {
    console.log('Reading migration file...');
    const sqlPath = path.join(__dirname, 'apply_pending_migrations.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing SQL via Supabase Management API...');

    const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/query`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Error executing SQL: ${response.status} ${response.statusText}`);
        console.error(errorText);
        process.exit(1);
    }

    const result = await response.json();
    console.log('✅ SQL executed successfully!');
    console.log(JSON.stringify(result, null, 2));
}

runSql();
