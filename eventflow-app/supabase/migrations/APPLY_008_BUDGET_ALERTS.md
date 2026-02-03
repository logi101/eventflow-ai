# Apply Migration 008: Budget Alerts

## Migration File
`20260203000001_budget_alerts.sql`

## How to Apply

### Option 1: Supabase Dashboard (Recommended)
1. Go to https://byhohetafnhlakqbydbj.supabase.co
2. Navigate to SQL Editor
3. Open `supabase/migrations/20260203000001_budget_alerts.sql`
4. Copy and paste the entire SQL file
5. Click "Run"

### Option 2: Supabase CLI
```bash
cd eventflow-app
supabase login
supabase link --project-ref byhohetafnhlakqbydbj
supabase db push
```

## Verification Queries

After applying the migration, run these queries to verify:

```sql
-- 1. Verify budget_allocation column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'checklist_items'
  AND column_name = 'budget_allocation';

-- Expected: One row with column_name='budget_allocation', data_type='numeric'

-- 2. Verify budget_alert_history table exists
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'budget_alert_history';

-- Expected: One row with table_name='budget_alert_history'

-- 3. Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'budget_alert_history';

-- Expected: One row with rowsecurity=true

-- 4. Verify indexes exist
SELECT indexname
FROM pg_indexes
WHERE tablename = 'budget_alert_history';

-- Expected: At least 3 indexes (item_type, org, unacknowledged)

-- 5. Verify RLS policies exist
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'budget_alert_history';

-- Expected: 3 policies (select, insert, update)
```

## What This Migration Does

1. **Adds `budget_allocation` column to `checklist_items`**
   - Type: DECIMAL(12,2)
   - Nullable: Yes
   - Purpose: Store allocated budget per checklist item

2. **Creates `budget_alert_history` table**
   - Tracks sent alerts (80% warning, 100% critical)
   - Prevents duplicate notifications
   - Tracks acknowledgment by manager
   - Organization-isolated via RLS

3. **Creates indexes for performance**
   - Fast lookup by item+type
   - Fast lookup by organization
   - Fast lookup for unacknowledged alerts

4. **Implements RLS policies**
   - Users can only see alerts from their organization
   - Users can only insert/update alerts for their organization

5. **Adds duplicate prevention trigger**
   - Prevents multiple unacknowledged alerts of same type for same item
   - Manager must acknowledge before new alert can be sent

## Rollback (if needed)

```sql
-- Remove trigger
DROP TRIGGER IF EXISTS budget_alert_duplicate_check ON budget_alert_history;
DROP FUNCTION IF EXISTS prevent_duplicate_alerts();

-- Remove indexes
DROP INDEX IF EXISTS idx_budget_alert_history_item_type;
DROP INDEX IF EXISTS idx_budget_alert_history_org;
DROP INDEX IF EXISTS idx_budget_alert_history_unacknowledged;

-- Remove table
DROP TABLE IF EXISTS budget_alert_history;

-- Remove enums
DROP TYPE IF EXISTS alert_sent_via;
DROP TYPE IF EXISTS budget_alert_type;

-- Remove column
ALTER TABLE checklist_items DROP COLUMN IF EXISTS budget_allocation;
```
