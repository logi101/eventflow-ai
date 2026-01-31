# Database Scripts

## Event Types Seed Data

### Problem
When creating a new event, the event type dropdown is empty because the `event_types` table has no data.

### Solution
Run the `seed-event-types.sql` script to populate the event types table with 7 default event types.

### How to Run

#### Using Supabase SQL Editor (Recommended)

1. Open your Supabase project dashboard: https://byhohetafnhlakqbydbj.supabase.co
2. Go to the SQL Editor
3. Copy and paste the contents of `seed-event-types.sql`
4. Click "Run" to execute the script
5. Verify the results show 7 event types

Note: The SQL Editor runs with elevated privileges, bypassing Row Level Security (RLS) policies that would prevent the npm script from working with the anon key.

### Event Types Included

1. **כנס** (Conference) 🎤 - Professional conference with lectures and sessions
2. **גיבוש** (Team Building) 🏕️ - Team building activities
3. **חתונה** (Wedding) 💒 - Wedding event
4. **יום עיון** (Seminar) 📚 - Professional seminar or study day
5. **אירוע חברה** (Company Event) 🎉 - Company events (New Year, Hanukkah, etc.)
6. **בר/בת מצווה** (Bar/Bat Mitzvah) ✡️ - Bar/Bat Mitzvah event
7. **השקת מוצר** (Product Launch) 🚀 - Product or service launch event

### After Running

- Reload your EventFlow app
- Click "אירוע חדש" (New Event)
- You should now see all 7 event types in the dropdown

### Notes

- Each event type includes a default checklist template
- Each event type has default settings (allow_plus_one, require_dietary_info, etc.)
- Event types are marked as system types (is_system = TRUE)
- All event types are active by default (is_active = TRUE)
