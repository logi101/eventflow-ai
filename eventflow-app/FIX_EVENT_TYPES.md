# Fix: Missing Event Type Field

## Problem Summary

When creating a new event in EventFlow AI, the event type dropdown appears but shows no options. Users cannot select an event type when creating or editing events.

## Root Cause

The `event_types` table exists in the database schema but contains no data. The seed data from `seed.sql` was never run, so the dropdown has no options to display.

## Evidence

1. **Database Schema**: The `event_types` table is correctly defined in `schema.sql` (lines 64-77)
2. **Events Table**: Has `event_type_id` foreign key (line 86 in schema.sql)
3. **UI Component**: EventForm has event type dropdown (lines 46-61 in EventForm.tsx)
4. **Data Fetch**: EventsPage correctly fetches event types (lines 106-119 in EventsPage.tsx)
5. **Seed Data**: Contains 7 event types but was not executed

## Solution

Run the seed script to populate the `event_types` table with 7 default event types.

### Quick Fix (5 minutes)

1. Open Supabase SQL Editor: https://byhohetafnhlakqbydbj.supabase.co
2. Navigate to: SQL Editor (left sidebar)
3. Click "New Query"
4. Copy the entire contents of `scripts/seed-event-types.sql`
5. Paste into the query editor
6. Click "Run" or press Cmd/Ctrl + Enter
7. Verify you see 7 rows returned

### Verification

After running the script:

1. Reload your EventFlow app (refresh browser)
2. Click "אירוע חדש" (New Event)
3. You should now see 7 event types in the dropdown:
   - 🎤 כנס (Conference)
   - 🏕️ גיבוש (Team Building)
   - 💒 חתונה (Wedding)
   - 📚 יום עיון (Seminar)
   - 🎉 אירוע חברה (Company Event)
   - ✡️ בר/בת מצווה (Bar/Bat Mitzvah)
   - 🚀 השקת מוצר (Product Launch)

## What Each Event Type Includes

Each event type comes with:
- **Hebrew and English names**
- **Icon** for visual identification
- **Description** explaining the event type
- **Default checklist template** with tasks specific to that event type
- **Default settings** (allow_plus_one, require_dietary_info, etc.)

Example: When you create a "חתונה" (Wedding) event, it automatically includes a checklist with tasks like:
- הזמנת אולם (180 days before)
- בחירת קייטרינג (120 days before)
- הזמנת צלם (90 days before)
- And 8 more wedding-specific tasks

## Files Modified/Created

1. **`scripts/seed-event-types.sql`** - SQL script to populate event types
2. **`scripts/seed-event-types.ts`** - TypeScript alternative (requires service role key)
3. **`scripts/README.md`** - Instructions for running the seed
4. **`package.json`** - Added `seed:event-types` npm script and tsx dependency

## Why This Happened

The EventFlow app scaffold includes:
1. Complete database schema (schema.sql) ✅
2. Seed data file (seed.sql) ✅
3. But the seed data was never executed ❌

The schema was created but the INSERT statements for initial data were not run.

## Prevention

For future reference, when setting up a new EventFlow instance:
1. Run `schema.sql` to create tables
2. Run `seed.sql` to populate initial data (event types, vendor categories, message templates)
3. Or use the new `scripts/seed-event-types.sql` for just the event types

## Technical Notes

- Event types are marked as `is_system: true` to distinguish them from user-created types
- All event types are `is_active: true` by default
- Each has a `sort_order` to control display order in dropdowns
- The script uses `ON CONFLICT DO NOTHING` to prevent duplicates if run multiple times
- Row Level Security (RLS) policies prevent the npm script from working with anon key, so SQL Editor is required

## Need Help?

If you encounter any issues:
1. Check that schema.sql was run first (event_types table should exist)
2. Verify Supabase connection in `.env` file
3. Try running the query again (it's idempotent - safe to run multiple times)
4. Check the Supabase logs for any errors

---

**Status**: Fix ready to deploy
**Time to fix**: ~5 minutes
**Testing**: Create a test event after running the seed script
