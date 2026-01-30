// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Event Settings Schema
// ═══════════════════════════════════════════════════════════════════════════

import { z } from 'zod'

export const eventSettingsSchema = z.object({
  reminder_activation: z.boolean().default(true),
  reminder_week_before: z.boolean().default(true),
  reminder_day_before: z.boolean().default(true),
  reminder_morning: z.boolean().default(true),
  reminder_15min: z.boolean().default(true),
  reminder_event_end: z.boolean().default(true),
  reminder_follow_up_3mo: z.boolean().default(false),
  reminder_follow_up_6mo: z.boolean().default(false),
  registration_open: z.boolean().default(true),
  allow_companions: z.boolean().default(true),
  max_companions: z.number().min(0).max(5).default(1),
  require_approval: z.boolean().default(false),
  collect_dietary: z.boolean().default(true),
  collect_accessibility: z.boolean().default(true),
})

export type EventSettings = z.infer<typeof eventSettingsSchema>