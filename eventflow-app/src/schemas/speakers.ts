// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Speakers Zod Schemas (Matching actual DB structure)
// ═══════════════════════════════════════════════════════════════════════════

import { z } from 'zod'
import { ISRAELI_PHONE_REGEX } from './participants'

// ────────────────────────────────────────────────────────────────────────────
// Enums (matching database)
// ────────────────────────────────────────────────────────────────────────────

export const speakerRoleSchema = z.enum([
  'main',
  'backup',
  'moderator',
  'panelist',
  'facilitator'
])

export const contingencyTypeSchema = z.enum([
  'speaker_unavailable',
  'room_unavailable',
  'technical_failure',
  'weather',
  'medical',
  'security',
  'other'
])

export const contingencyStatusSchema = z.enum([
  'draft',
  'ready',
  'activated',
  'resolved'
])

export const riskLevelSchema = z.enum([
  'low',
  'medium',
  'high',
  'critical'
])

export type SpeakerRole = z.infer<typeof speakerRoleSchema>
export type ContingencyType = z.infer<typeof contingencyTypeSchema>
export type ContingencyStatus = z.infer<typeof contingencyStatusSchema>
export type RiskLevel = z.infer<typeof riskLevelSchema>

// ────────────────────────────────────────────────────────────────────────────
// Speaker Schema (matching actual DB columns)
// ────────────────────────────────────────────────────────────────────────────

export const speakerSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  name: z.string().min(1, 'שם הדובר נדרש'),
  title: z.string().nullable(),
  bio: z.string().nullable(),
  photo_url: z.string().url('כתובת תמונה לא תקינה').nullable(),
  email: z.string().email('כתובת אימייל לא תקינה').nullable(),
  phone: z.string().regex(ISRAELI_PHONE_REGEX, 'מספר טלפון לא תקין').nullable(),
  company: z.string().nullable(),
  linkedin_url: z.string().url('כתובת LinkedIn לא תקינה').nullable(),
  is_confirmed: z.boolean().default(false),
  backup_speaker_id: z.string().uuid().nullable(),
  notes: z.string().nullable(),
  sessions_count: z.number().int().min(0).optional(),
  created_at: z.string()
})

export type Speaker = z.infer<typeof speakerSchema>

// ────────────────────────────────────────────────────────────────────────────
// Session Speaker Schema (session_speakers table)
// ────────────────────────────────────────────────────────────────────────────

export const sessionSpeakerSchema = z.object({
  id: z.string().uuid(),
  schedule_id: z.string().uuid(),
  speaker_id: z.string().uuid(),
  role: speakerRoleSchema,
  is_confirmed: z.boolean().default(false),
  speaker: speakerSchema.optional(),
  created_at: z.string()
})

export type SessionSpeaker = z.infer<typeof sessionSpeakerSchema>

// ────────────────────────────────────────────────────────────────────────────
// Create Speaker Schema (for adding new speakers)
// ────────────────────────────────────────────────────────────────────────────

export const createSpeakerSchema = z.object({
  name: z.string().min(2, 'שם הדובר חייב להכיל לפחות 2 תווים'),
  title: z.string().optional(),
  bio: z.string().max(2000, 'ביוגרפיה יכולה להכיל עד 2000 תווים').optional(),
  photo_url: z.string().url('כתובת תמונה לא תקינה').optional().or(z.literal('')),
  email: z.string().email('כתובת אימייל לא תקינה').optional().or(z.literal('')),
  phone: z.string().regex(ISRAELI_PHONE_REGEX, 'מספר טלפון לא תקין').optional().or(z.literal('')),
  company: z.string().optional(),
  linkedin_url: z.string().url('כתובת LinkedIn לא תקינה').optional().or(z.literal('')),
  is_confirmed: z.boolean().default(false),
  backup_speaker_id: z.string().uuid().optional(),
  notes: z.string().optional()
})

export type CreateSpeaker = z.infer<typeof createSpeakerSchema>

// ────────────────────────────────────────────────────────────────────────────
// Contingency Schema (contingencies table)
// ────────────────────────────────────────────────────────────────────────────

export const contingencySchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  schedule_id: z.string().uuid().nullable(),
  contingency_type: contingencyTypeSchema,
  risk_level: riskLevelSchema,
  probability: z.number().min(0).max(100).nullable(),
  impact: z.number().min(1).max(5).nullable(),
  description: z.string().min(1, 'תיאור נדרש'),
  trigger_conditions: z.string().nullable(),
  action_plan: z.string().min(1, 'תוכנית פעולה נדרשת'),
  responsible_person: z.string().nullable(),
  backup_speaker_id: z.string().uuid().nullable(),
  backup_room_id: z.string().uuid().nullable(),
  status: contingencyStatusSchema,
  activated_at: z.string().nullable(),
  resolved_at: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string()
})

export type Contingency = z.infer<typeof contingencySchema>

// ────────────────────────────────────────────────────────────────────────────
// Create Contingency Schema
// ────────────────────────────────────────────────────────────────────────────

export const createContingencySchema = z.object({
  contingency_type: contingencyTypeSchema,
  risk_level: riskLevelSchema,
  probability: z.number().min(0).max(100).optional(),
  impact: z.number().min(1).max(5).optional(),
  description: z.string().min(2, 'תיאור חייב להכיל לפחות 2 תווים'),
  trigger_conditions: z.string().optional(),
  action_plan: z.string().min(2, 'תוכנית פעולה חייבת להכיל לפחות 2 תווים'),
  responsible_person: z.string().optional(),
  backup_speaker_id: z.string().uuid().optional(),
  backup_room_id: z.string().uuid().optional(),
  status: contingencyStatusSchema.default('draft'),
  notes: z.string().optional()
})

export type CreateContingency = z.infer<typeof createContingencySchema>

// ────────────────────────────────────────────────────────────────────────────
// Filter Schema
// ────────────────────────────────────────────────────────────────────────────

export const speakerFiltersSchema = z.object({
  event_id: z.string().uuid().optional(),
  is_confirmed: z.boolean().optional(),
  search: z.string().optional()
})

export type SpeakerFilters = z.infer<typeof speakerFiltersSchema>

// ────────────────────────────────────────────────────────────────────────────
// Display Helpers
// ────────────────────────────────────────────────────────────────────────────

export const speakerRoleLabels: Record<SpeakerRole, string> = {
  main: 'דובר ראשי',
  backup: 'דובר מחליף',
  moderator: 'מנחה',
  panelist: 'משתתף פאנל',
  facilitator: 'מנחה סדנה'
}

export const speakerRoleColors: Record<SpeakerRole, string> = {
  main: 'bg-blue-900/40 text-blue-300',
  backup: 'bg-zinc-700/50 text-zinc-300',
  moderator: 'bg-purple-900/40 text-purple-300',
  panelist: 'bg-cyan-900/40 text-cyan-300',
  facilitator: 'bg-green-900/40 text-green-300'
}

export const contingencyTypeLabels: Record<ContingencyType, string> = {
  speaker_unavailable: 'דובר לא זמין',
  room_unavailable: 'חדר לא זמין',
  technical_failure: 'תקלה טכנית',
  weather: 'מזג אוויר',
  medical: 'חירום רפואי',
  security: 'אירוע ביטחוני',
  other: 'אחר'
}

export const contingencyStatusLabels: Record<ContingencyStatus, string> = {
  draft: 'טיוטה',
  ready: 'מוכן',
  activated: 'הופעל',
  resolved: 'נפתר'
}

export const contingencyStatusColors: Record<ContingencyStatus, string> = {
  draft: 'bg-zinc-700/50 text-zinc-300',
  ready: 'bg-green-900/40 text-green-300',
  activated: 'bg-red-900/40 text-red-300',
  resolved: 'bg-emerald-900/40 text-emerald-300'
}

export const riskLevelLabels: Record<RiskLevel, string> = {
  low: 'נמוך',
  medium: 'בינוני',
  high: 'גבוה',
  critical: 'קריטי'
}

export const riskLevelColors: Record<RiskLevel, string> = {
  low: 'bg-zinc-700/50 text-zinc-300',
  medium: 'bg-yellow-900/40 text-yellow-300',
  high: 'bg-orange-900/40 text-orange-300',
  critical: 'bg-red-900/40 text-red-300'
}
