// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Schedules Zod Schemas (Matching actual DB structure)
// ═══════════════════════════════════════════════════════════════════════════

import { z } from 'zod'

// ────────────────────────────────────────────────────────────────────────────
// Enums (matching database)
// ────────────────────────────────────────────────────────────────────────────

export const blockTypeSchema = z.enum([
  'session',
  'break',
  'registration',
  'networking',
  'meal',
  'other'
])

export type BlockType = z.infer<typeof blockTypeSchema>

// ────────────────────────────────────────────────────────────────────────────
// Program Day Schema (program_days table)
// ────────────────────────────────────────────────────────────────────────────

export const programDaySchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  date: z.string().min(1, 'תאריך נדרש'),
  day_number: z.number().int().positive('מספר יום חייב להיות חיובי'),
  theme: z.string().nullable(),
  description: z.string().nullable(),
  start_time: z.string().nullable(),
  end_time: z.string().nullable(),
  created_at: z.string()
})

export type ProgramDay = z.infer<typeof programDaySchema>

// ────────────────────────────────────────────────────────────────────────────
// Track Schema (tracks table)
// ────────────────────────────────────────────────────────────────────────────

export const trackSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  name: z.string().min(1, 'שם המסלול נדרש'),
  description: z.string().nullable(),
  color: z.string().min(1, 'צבע נדרש'),
  icon: z.string().nullable(),
  sort_order: z.number().int().min(0),
  is_active: z.boolean().default(true),
  sessions_count: z.number().int().min(0).optional(),
  created_at: z.string()
})

export type Track = z.infer<typeof trackSchema>

// ────────────────────────────────────────────────────────────────────────────
// Room Schema (rooms table)
// ────────────────────────────────────────────────────────────────────────────

export const roomSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  name: z.string().min(1, 'שם החדר נדרש'),
  capacity: z.number().int().positive('קיבולת חייבת להיות חיובית').nullable(),
  floor: z.string().nullable(),
  building: z.string().nullable(),
  equipment: z.array(z.string()).nullable(),
  notes: z.string().nullable(),
  is_active: z.boolean().default(true),
  backup_room_id: z.string().uuid().nullable(),
  created_at: z.string()
})

export type Room = z.infer<typeof roomSchema>

// ────────────────────────────────────────────────────────────────────────────
// Schedule Schema (matching actual DB columns)
// ────────────────────────────────────────────────────────────────────────────

export const scheduleSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  title: z.string().min(1, 'כותרת נדרשת'),
  description: z.string().nullable(),
  start_time: z.string().min(1, 'שעת התחלה נדרשת'),
  end_time: z.string().min(1, 'שעת סיום נדרשת'),
  location: z.string().nullable(),
  room: z.string().nullable(),
  track: z.string().nullable(),
  track_color: z.string().nullable(),
  speaker_name: z.string().nullable(),
  speaker_title: z.string().nullable(),
  is_break: z.boolean().default(false),
  is_mandatory: z.boolean().default(false),
  send_reminder: z.boolean().default(false),
  reminder_minutes_before: z.number().int().min(0).default(30),
  sort_order: z.number().int().min(0),
  program_day_id: z.string().uuid().nullable(),
  track_id: z.string().uuid().nullable(),
  room_id: z.string().uuid().nullable(),
  max_participants: z.number().int().positive().nullable(),
  is_published: z.boolean().default(false),
  requires_registration: z.boolean().default(false),
  session_type: z.string().nullable(),
  program_day: programDaySchema.optional(),
  track_ref: trackSchema.optional(),
  room_ref: roomSchema.optional(),
  session_speakers: z.array(z.lazy(() => z.any())).optional(),
  created_at: z.string()
})

export type Schedule = z.infer<typeof scheduleSchema>

// ────────────────────────────────────────────────────────────────────────────
// Create Schedule Schema (for adding new schedules)
// ────────────────────────────────────────────────────────────────────────────

export const createScheduleSchema = z.object({
  title: z.string().min(2, 'כותרת חייבת להכיל לפחות 2 תווים'),
  description: z.string().optional(),
  start_time: z.string().min(1, 'שעת התחלה נדרשת'),
  end_time: z.string().min(1, 'שעת סיום נדרשת'),
  location: z.string().optional(),
  room: z.string().optional(),
  track: z.string().optional(),
  track_color: z.string().optional(),
  speaker_name: z.string().optional(),
  speaker_title: z.string().optional(),
  is_break: z.boolean().default(false),
  is_mandatory: z.boolean().default(false),
  send_reminder: z.boolean().default(false),
  reminder_minutes_before: z.string().optional(),
  max_capacity: z.string().optional()
})

export type CreateSchedule = z.infer<typeof createScheduleSchema>

// ────────────────────────────────────────────────────────────────────────────
// Schedule Form Data Schema (matching ScheduleFormData interface)
// ────────────────────────────────────────────────────────────────────────────

export const scheduleFormDataSchema = z.object({
  title: z.string().min(2, 'כותרת חייבת להכיל לפחות 2 תווים'),
  description: z.string(),
  start_time: z.string().min(1, 'שעת התחלה נדרשת'),
  end_time: z.string().min(1, 'שעת סיום נדרשת'),
  location: z.string(),
  room: z.string(),
  max_capacity: z.string(),
  is_mandatory: z.boolean(),
  is_break: z.boolean(),
  track: z.string(),
  track_color: z.string(),
  speaker_name: z.string(),
  speaker_title: z.string(),
  send_reminder: z.boolean(),
  reminder_minutes_before: z.string()
})

export type ScheduleFormData = z.infer<typeof scheduleFormDataSchema>

// ────────────────────────────────────────────────────────────────────────────
// Time Block Schema (time_blocks table)
// ────────────────────────────────────────────────────────────────────────────

export const timeBlockSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  program_day_id: z.string().uuid(),
  block_type: blockTypeSchema,
  title: z.string().min(1, 'כותרת נדרשת'),
  start_time: z.string().min(1, 'שעת התחלה נדרשת'),
  end_time: z.string().min(1, 'שעת סיום נדרשת'),
  description: z.string().nullable(),
  location: z.string().nullable(),
  is_global: z.boolean().default(false),
  created_at: z.string()
})

export type TimeBlock = z.infer<typeof timeBlockSchema>

// ────────────────────────────────────────────────────────────────────────────
// Participant Schedule Schema (participant_schedules table)
// ────────────────────────────────────────────────────────────────────────────

export const participantScheduleSchema = z.object({
  id: z.string().uuid(),
  participant_id: z.string().uuid(),
  schedule_id: z.string().uuid(),
  reminder_sent: z.boolean().default(false),
  reminder_sent_at: z.string().nullable(),
  created_at: z.string()
})

export type ParticipantSchedule = z.infer<typeof participantScheduleSchema>

// ────────────────────────────────────────────────────────────────────────────
// Schedule Change Schema (schedule_changes table)
// ────────────────────────────────────────────────────────────────────────────

export const scheduleChangeSchema = z.object({
  id: z.string().uuid(),
  schedule_id: z.string().uuid(),
  change_type: z.string().min(1),
  old_value: z.record(z.string(), z.unknown()).nullable(),
  new_value: z.record(z.string(), z.unknown()).nullable(),
  reason: z.string().nullable(),
  changed_by: z.string().uuid().nullable(),
  notification_sent: z.boolean().default(false),
  notification_sent_at: z.string().nullable(),
  created_at: z.string()
})

export type ScheduleChange = z.infer<typeof scheduleChangeSchema>

// ────────────────────────────────────────────────────────────────────────────
// Display Helpers
// ────────────────────────────────────────────────────────────────────────────

export const blockTypeLabels: Record<BlockType, string> = {
  session: 'מושב',
  break: 'הפסקה',
  registration: 'הרשמה',
  networking: 'נטוורקינג',
  meal: 'ארוחה',
  other: 'אחר'
}

export const blockTypeColors: Record<BlockType, string> = {
  session: 'bg-blue-900/40 text-blue-300',
  break: 'bg-zinc-700/50 text-zinc-300',
  registration: 'bg-purple-900/40 text-purple-300',
  networking: 'bg-cyan-900/40 text-cyan-300',
  meal: 'bg-orange-900/40 text-orange-300',
  other: 'bg-zinc-700/50 text-zinc-400'
}
