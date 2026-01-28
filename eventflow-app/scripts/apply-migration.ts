/**
 * Migration Application Script
 *
 * Purpose: Apply SQL migrations to Supabase database
 * Usage: SUPABASE_SERVICE_ROLE_KEY=<key> node --loader ts-node/esm scripts/apply-migration.ts <migration-file>
 *
 * This script was created as a workaround for MCP tool unavailability during GSD execution.
 * Phase: 03-dynamic-template-system, Plan: 01
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://byhohetafnhlakqbydbj.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!serviceRoleKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  console.error('Get it from: https://supabase.com/dashboard/project/byhohetafnhlakqbydbj/settings/api')
  process.exit(1)
}

const migrationFile = process.argv[2]
if (!migrationFile) {
  console.error('Usage: SUPABASE_SERVICE_ROLE_KEY=<key> tsx scripts/apply-migration.ts <migration-file>')
  console.error('Example: tsx scripts/apply-migration.ts supabase/migrations/20260128000002_seed_reminder_templates.sql')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration(filePath: string) {
  try {
    const absolutePath = resolve(filePath)
    console.log(`Reading migration file: ${absolutePath}`)

    const sql = readFileSync(absolutePath, 'utf-8')
    console.log(`Executing SQL (${sql.length} characters)...`)

    // Execute the SQL using Supabase RPC
    // Note: This requires a custom RPC function or we use direct PostgreSQL query execution
    const { data, error } = await supabase.rpc('exec', { sql_query: sql })

    if (error) {
      console.error('Migration failed:', error)
      process.exit(1)
    }

    console.log('Migration applied successfully!')
    console.log('Result:', data)

  } catch (err) {
    console.error('Error applying migration:', err)
    process.exit(1)
  }
}

applyMigration(migrationFile)
