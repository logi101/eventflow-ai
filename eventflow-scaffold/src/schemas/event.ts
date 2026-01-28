import { z } from 'zod'

export const eventSettingsSchema = z.object({
  registration_open: z.boolean().default(true),
  reminder_day_before: z.boolean().default(true),
  reminder_morning: z.boolean().default(true),
  reminder_15min: z.boolean().default(false),
  allow_companions: z.boolean().default(true),
  max_companions: z.number().min(0).max(5).default(1),
  require_approval: z.boolean().default(false),
  collect_dietary: z.boolean().default(true),
  collect_accessibility: z.boolean().default(true),
})

export const eventSchema = z.object({
  name: z.string().min(3, 'שם האירוע חייב להכיל לפחות 3 תווים').max(100),
  description: z.string().max(2000, 'תיאור מוגבל ל-2000 תווים').optional(),
  event_type: z.enum([
    'conference',
    'wedding',
    'corporate',
    'birthday',
    'bar_mitzvah',
    'other'
  ]),
  start_date: z.string().datetime({ message: 'תאריך התחלה לא תקין' }),
  end_date: z.string().datetime({ message: 'תאריך סיום לא תקין' }).optional(),
  venue_name: z.string().min(2, 'שם מקום חייב להכיל לפחות 2 תווים').optional(),
  venue_address: z.string().optional(),
  expected_participants: z.number().min(1, 'מספר משתתפים חייב להיות לפחות 1').optional(),
  budget: z.number().min(0).optional(),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']).default('draft'),
  settings: eventSettingsSchema.optional(),
})

export const eventCreateSchema = eventSchema.extend({
  organization_id: z.string().uuid('מזהה ארגון לא תקין'),
})

export const eventUpdateSchema = eventSchema.partial()

export type Event = z.infer<typeof eventSchema>
export type EventCreate = z.infer<typeof eventCreateSchema>
export type EventUpdate = z.infer<typeof eventUpdateSchema>
export type EventSettings = z.infer<typeof eventSettingsSchema>

// Validate date range
export const validateEventDates = (data: Event) => {
  if (data.end_date && data.start_date > data.end_date) {
    return { valid: false, error: 'תאריך סיום חייב להיות אחרי תאריך התחלה' }
  }
  return { valid: true }
}
