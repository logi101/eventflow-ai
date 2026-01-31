#!/usr/bin/env tsx

/**
 * Seed Event Types Script
 *
 * This script populates the event_types table with default event types.
 * Run with: npm run seed:event-types
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://byhohetafnhlakqbydbj.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5aG9oZXRhZm5obGFrcWJ5ZGJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MTYyMDIsImV4cCI6MjA4NDM5MjIwMn0.mrJ2kNOQSxBfEXW7opc3cha6XBn-h64mEgKZJa0B4Z8'

const supabase = createClient(supabaseUrl, supabaseKey)

const eventTypes = [
  {
    name: 'כנס',
    name_en: 'Conference',
    icon: '🎤',
    description: 'כנס מקצועי עם הרצאות ומושבים',
    is_system: true,
    sort_order: 1,
    default_checklist: [
      { title: 'הזמנת אולם', category: 'מקום', priority: 'critical', days_before: 90 },
      { title: 'אישור כיבוי אש', category: 'מקום', priority: 'critical', days_before: 30 },
      { title: 'אישור משטרה (מעל 500)', category: 'מקום', priority: 'high', days_before: 30 },
      { title: 'בחירת קייטרינג', category: 'קייטרינג', priority: 'high', days_before: 60 },
      { title: 'אישור תפריט סופי', category: 'קייטרינג', priority: 'high', days_before: 7 },
      { title: 'איסוף העדפות תזונתיות', category: 'קייטרינג', priority: 'medium', days_before: 14 },
      { title: 'אישור מרצים', category: 'תוכן', priority: 'critical', days_before: 30 },
      { title: 'קבלת מצגות מרצים', category: 'תוכן', priority: 'high', days_before: 7 },
      { title: 'הכנת לוח זמנים', category: 'תוכן', priority: 'high', days_before: 21 },
      { title: 'הזמנת ציוד הגברה', category: 'טכני', priority: 'high', days_before: 14 },
      { title: 'בדיקת מערכת הגברה', category: 'טכני', priority: 'critical', days_before: 1 },
      { title: 'בדיקת מערכת הקרנה', category: 'טכני', priority: 'critical', days_before: 1 },
      { title: 'הכנת תגי שם', category: 'לוגיסטיקה', priority: 'medium', days_before: 3 },
      { title: 'שליחת הזמנות', category: 'תקשורת', priority: 'high', days_before: 30 },
      { title: 'שליחת תזכורת', category: 'תקשורת', priority: 'medium', days_before: 7 }
    ],
    default_settings: {
      allow_plus_one: false,
      require_dietary_info: true,
      send_reminders: true,
      invitation_type: 'registration'
    }
  },
  {
    name: 'גיבוש',
    name_en: 'Team Building',
    icon: '🏕️',
    description: 'פעילות גיבוש לצוות או חברה',
    is_system: true,
    sort_order: 2,
    default_checklist: [
      { title: 'בחירת מיקום', category: 'מקום', priority: 'critical', days_before: 60 },
      { title: 'תיאום הסעות', category: 'לוגיסטיקה', priority: 'high', days_before: 14 },
      { title: 'תכנון פעילויות', category: 'תוכן', priority: 'high', days_before: 30 },
      { title: 'הזמנת מנחה פעילות', category: 'ספקים', priority: 'high', days_before: 30 },
      { title: 'הזמנת קייטרינג', category: 'קייטרינג', priority: 'high', days_before: 21 },
      { title: 'הכנת ציוד', category: 'לוגיסטיקה', priority: 'medium', days_before: 7 },
      { title: 'שליחת פרטים למשתתפים', category: 'תקשורת', priority: 'high', days_before: 7 }
    ],
    default_settings: {
      allow_plus_one: false,
      require_dietary_info: true,
      send_reminders: true,
      invitation_type: 'rsvp'
    }
  },
  {
    name: 'חתונה',
    name_en: 'Wedding',
    icon: '💒',
    description: 'אירוע חתונה',
    is_system: true,
    sort_order: 3,
    default_checklist: [
      { title: 'הזמנת אולם', category: 'מקום', priority: 'critical', days_before: 180 },
      { title: 'בחירת קייטרינג', category: 'קייטרינג', priority: 'critical', days_before: 120 },
      { title: 'הזמנת צלם', category: 'ספקים', priority: 'high', days_before: 90 },
      { title: 'הזמנת צלם וידאו', category: 'ספקים', priority: 'high', days_before: 90 },
      { title: 'הזמנת DJ', category: 'ספקים', priority: 'high', days_before: 60 },
      { title: 'הזמנת רב/עורך טקס', category: 'טקס', priority: 'critical', days_before: 60 },
      { title: 'הכנת ושליחת הזמנות', category: 'תקשורת', priority: 'high', days_before: 60 },
      { title: 'סידורי פרחים', category: 'עיצוב', priority: 'medium', days_before: 30 },
      { title: 'אישור תפריט סופי', category: 'קייטרינג', priority: 'high', days_before: 14 },
      { title: 'סגירת רשימת מוזמנים', category: 'ארגון', priority: 'critical', days_before: 14 },
      { title: 'סידורי הושבה', category: 'ארגון', priority: 'high', days_before: 7 }
    ],
    default_settings: {
      allow_plus_one: true,
      require_dietary_info: true,
      send_reminders: true,
      invitation_type: 'rsvp'
    }
  },
  {
    name: 'יום עיון',
    name_en: 'Seminar',
    icon: '📚',
    description: 'יום עיון או סמינר מקצועי',
    is_system: true,
    sort_order: 4,
    default_checklist: [
      { title: 'הזמנת חדר/אולם', category: 'מקום', priority: 'critical', days_before: 30 },
      { title: 'אישור מרצים', category: 'תוכן', priority: 'critical', days_before: 21 },
      { title: 'הכנת חומרים', category: 'תוכן', priority: 'high', days_before: 7 },
      { title: 'הזמנת כיבוד', category: 'קייטרינג', priority: 'medium', days_before: 7 },
      { title: 'שליחת הזמנות', category: 'תקשורת', priority: 'high', days_before: 14 }
    ],
    default_settings: {
      allow_plus_one: false,
      require_dietary_info: false,
      send_reminders: true,
      invitation_type: 'registration'
    }
  },
  {
    name: 'אירוע חברה',
    name_en: 'Company Event',
    icon: '🎉',
    description: 'אירוע חברה - ראש השנה, חנוכה, פורים וכו׳',
    is_system: true,
    sort_order: 5,
    default_checklist: [
      { title: 'בחירת תאריך', category: 'תכנון', priority: 'critical', days_before: 60 },
      { title: 'בחירת מקום', category: 'מקום', priority: 'critical', days_before: 45 },
      { title: 'תכנון תוכן/נושא', category: 'תוכן', priority: 'high', days_before: 30 },
      { title: 'הזמנת קייטרינג', category: 'קייטרינג', priority: 'high', days_before: 21 },
      { title: 'הזמנת אטרקציות', category: 'ספקים', priority: 'medium', days_before: 21 },
      { title: 'שליחת הזמנות', category: 'תקשורת', priority: 'high', days_before: 21 }
    ],
    default_settings: {
      allow_plus_one: true,
      require_dietary_info: true,
      send_reminders: true,
      invitation_type: 'rsvp'
    }
  },
  {
    name: 'בר/בת מצווה',
    name_en: 'Bar/Bat Mitzvah',
    icon: '✡️',
    description: 'אירוע בר/בת מצווה',
    is_system: true,
    sort_order: 6,
    default_checklist: [
      { title: 'הזמנת אולם', category: 'מקום', priority: 'critical', days_before: 120 },
      { title: 'בחירת קייטרינג', category: 'קייטרינג', priority: 'critical', days_before: 90 },
      { title: 'הזמנת DJ', category: 'ספקים', priority: 'high', days_before: 60 },
      { title: 'הזמנת צלם', category: 'ספקים', priority: 'high', days_before: 60 },
      { title: 'הכנת הזמנות', category: 'תקשורת', priority: 'high', days_before: 45 },
      { title: 'סידורי פרחים ועיצוב', category: 'עיצוב', priority: 'medium', days_before: 14 }
    ],
    default_settings: {
      allow_plus_one: true,
      require_dietary_info: true,
      send_reminders: true,
      invitation_type: 'rsvp'
    }
  },
  {
    name: 'השקת מוצר',
    name_en: 'Product Launch',
    icon: '🚀',
    description: 'אירוע השקת מוצר או שירות',
    is_system: true,
    sort_order: 7,
    default_checklist: [
      { title: 'בחירת מקום', category: 'מקום', priority: 'critical', days_before: 45 },
      { title: 'הכנת מצגת השקה', category: 'תוכן', priority: 'critical', days_before: 14 },
      { title: 'הזמנת מדיה ועיתונאים', category: 'יחסי ציבור', priority: 'high', days_before: 21 },
      { title: 'הכנת דוכני תצוגה', category: 'עיצוב', priority: 'high', days_before: 7 },
      { title: 'הזמנת קייטרינג', category: 'קייטרינג', priority: 'medium', days_before: 14 },
      { title: 'בדיקת ציוד טכני', category: 'טכני', priority: 'critical', days_before: 1 }
    ],
    default_settings: {
      allow_plus_one: false,
      require_dietary_info: false,
      send_reminders: true,
      invitation_type: 'registration'
    }
  }
]

async function seedEventTypes() {
  console.log('🌱 Starting event types seed...')

  try {
    // Check if event types already exist
    const { data: existing, error: checkError } = await supabase
      .from('event_types')
      .select('id, name')
      .eq('is_system', true)

    if (checkError) {
      console.error('❌ Error checking existing event types:', checkError)
      return
    }

    if (existing && existing.length > 0) {
      console.log(`ℹ️  Found ${existing.length} existing system event types:`)
      existing.forEach(et => console.log(`   - ${et.name}`))
      console.log('\n⚠️  Skipping seed to avoid duplicates.')
      console.log('💡 To re-seed, delete existing event types first.')
      return
    }

    // Insert event types
    const { data, error } = await supabase
      .from('event_types')
      .insert(eventTypes)
      .select()

    if (error) {
      console.error('❌ Error inserting event types:', error)
      return
    }

    console.log(`✅ Successfully seeded ${data?.length || 0} event types:`)
    data?.forEach(et => console.log(`   ${et.icon} ${et.name} (${et.name_en})`))

    console.log('\n🎉 Event types seed complete!')
    console.log('📝 You can now create events with these event types.')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the seed
seedEventTypes()
