import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const distAssetsDir = join(process.cwd(), 'dist', 'assets')

const jsFiles = readdirSync(distAssetsDir)
  .filter((name) => name.endsWith('.js'))
  .map((name) => ({
    name,
    bytes: statSync(join(distAssetsDir, name)).size,
  }))

if (jsFiles.length === 0) {
  console.error('No JS assets found under dist/assets. Run build before budget check.')
  process.exit(1)
}

const findLargest = (prefix) =>
  jsFiles.filter((f) => f.name.startsWith(prefix)).sort((a, b) => b.bytes - a.bytes)[0]

const bytesToKb = (bytes) => (bytes / 1024).toFixed(2)

const budgets = [
  { label: 'entry-index', file: findLargest('index-'), maxBytes: 450 * 1024 },
  { label: 'vendor-supabase', file: findLargest('vendor-supabase-'), maxBytes: 220 * 1024 },
]

let hasViolation = false

for (const budget of budgets) {
  if (!budget.file) {
    if (!budget.optional) {
      console.error(`Budget target not found: ${budget.label}`)
      hasViolation = true
    } else {
      console.log(`[INFO] Optional budget target not found: ${budget.label}`)
    }
    continue
  }

  const withinBudget = budget.file.bytes <= budget.maxBytes
  const status = withinBudget ? 'OK' : 'FAIL'
  console.log(
    `[${status}] ${budget.label}: ${budget.file.name} = ${bytesToKb(budget.file.bytes)} KB (max ${bytesToKb(budget.maxBytes)} KB)`
  )

  if (!withinBudget) {
    hasViolation = true
  }
}

if (hasViolation) {
  console.error('Bundle budget exceeded.')
  process.exit(1)
}

console.log('Bundle budgets passed.')
