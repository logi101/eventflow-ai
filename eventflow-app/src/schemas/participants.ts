// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Participants Zod Schemas (Matching actual DB structure)
// ═══════════════════════════════════════════════════════════════════════════

import { z } from 'zod'

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

export const ISRAELI_PHONE_REGEX = /^0[0-9]{9}$/

// ────────────────────────────────────────────────────────────────────────────
// Enums (matching database)
// ────────────────────────────────────────────────────────────────────────────

export const participantStatusSchema = z.enum([
  'invited',
  'confirmed',
  'declined',
  'maybe',
  'checked_in',
  'no_show'
])

export type ParticipantStatus = z.infer<typeof participantStatusSchema>

// ────────────────────────────────────────────────────────────────────────────
// Participant Schema (matching actual DB columns)
// ────────────────────────────────────────────────────────────────────────────

export const participantSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  first_name: z.string().min(1, 'שם פרטי נדרש'),
  last_name: z.string().min(1, 'שם משפחה נדרש'),
  full_name: z.string().nullable(),
  email: z.string().email('כתובת אימייל לא תקינה').nullable(),
  phone: z.string().regex(ISRAELI_PHONE_REGEX, 'מספר טלפון לא תקין (10 ספרות, מתחיל ב-0)'),
  phone_normalized: z.string().nullable(),
  status: participantStatusSchema,
  has_companion: z.boolean().default(false),
  companion_name: z.string().nullable(),
  companion_phone: z.string().regex(ISRAELI_PHONE_REGEX, 'מספר טלפון מלווה לא תקין').nullable(),
  dietary_restrictions: z.array(z.string()).nullable(),
  accessibility_needs: z.string().nullable(),
  needs_transportation: z.boolean().default(false),
  transportation_location: z.string().nullable(),
  notes: z.string().nullable(),
  internal_notes: z.string().nullable(),
  is_vip: z.boolean().default(false),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).nullable().default('prefer_not_to_say'),
  vip_notes: z.string().nullable(),
  invited_at: z.string().nullable(),
  confirmed_at: z.string().nullable(),
  checked_in_at: z.string().nullable(),
  created_at: z.string(),
  events: z.object({
    name: z.string()
  }).optional(),
  custom_fields: z.record(z.string(), z.unknown()).optional()
})

export type Participant = z.infer<typeof participantSchema>

// ────────────────────────────────────────────────────────────────────────────
// Create Participant Schema (for adding new participants)
// ────────────────────────────────────────────────────────────────────────────

export const createParticipantSchema = z.object({
  first_name: z.string().min(2, 'שם פרטי חייב להכיל לפחות 2 תווים'),
  last_name: z.string().min(2, 'שם משפחה חייב להכיל לפחות 2 תווים'),
  phone: z.string().regex(ISRAELI_PHONE_REGEX, 'מספר טלפון לא תקין (10 ספרות, מתחיל ב-0)'),
  email: z.string().email('כתובת אימייל לא תקינה').optional().or(z.literal('')),
  status: participantStatusSchema.default('invited'),
  has_companion: z.boolean().default(false),
  companion_name: z.string().optional(),
  companion_phone: z.string().regex(ISRAELI_PHONE_REGEX, 'מספר טלפון מלווה לא תקין').optional().or(z.literal('')),
  dietary_restrictions: z.string().optional(),
  accessibility_needs: z.string().optional(),
  needs_transportation: z.boolean().default(false),
  transportation_location: z.string().optional(),
  notes: z.string().optional(),
  is_vip: z.boolean().default(false),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).nullable().default('prefer_not_to_say'),
  vip_notes: z.string().optional()
})

export type CreateParticipant = z.infer<typeof createParticipantSchema>

// ────────────────────────────────────────────────────────────────────────────
// Participant Form Data Schema (matching ParticipantFormData interface)
// ────────────────────────────────────────────────────────────────────────────

export const participantFormDataSchema = z.object({
  first_name: z.string().min(2, 'שם פרטי חייב להכיל לפחות 2 תווים'),
  last_name: z.string().min(2, 'שם משפחה חייב להכיל לפחות 2 תווים'),
  phone: z.string().regex(ISRAELI_PHONE_REGEX, 'מספר טלפון לא תקין (10 ספרות, מתחיל ב-0)'),
  email: z.string(),
  status: participantStatusSchema,
  has_companion: z.boolean(),
  companion_name: z.string(),
  companion_phone: z.string(),
  dietary_restrictions: z.string(),
  accessibility_needs: z.string(),
  needs_transportation: z.boolean(),
  transportation_location: z.string(),
  notes: z.string(),
  is_vip: z.boolean(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).nullable().default('prefer_not_to_say'),
  vip_notes: z.string()
})

export type ParticipantFormData = z.infer<typeof participantFormDataSchema>

// ────────────────────────────────────────────────────────────────────────────
// Filter Schema
// ────────────────────────────────────────────────────────────────────────────

export const participantFiltersSchema = z.object({
  event_id: z.string().uuid().optional(),
  status: participantStatusSchema.optional(),
  is_vip: z.boolean().optional(),
  has_companion: z.boolean().optional(),
  needs_transportation: z.boolean().optional(),
  search: z.string().optional()
})

export type ParticipantFilters = z.infer<typeof participantFiltersSchema>

// ────────────────────────────────────────────────────────────────────────────
// Display Helpers
// ────────────────────────────────────────────────────────────────────────────

export const participantStatusLabels: Record<ParticipantStatus, string> = {
  invited: 'הוזמן',
  confirmed: 'אישר הגעה',
  declined: 'סירב',
  maybe: 'אולי',
  checked_in: 'נרשם בכניסה',
  no_show: 'לא הגיע'
}

export const participantStatusColors: Record<ParticipantStatus, string> = {
  invited: 'bg-blue-900/40 text-blue-300',
  confirmed: 'bg-green-900/40 text-green-300',
  declined: 'bg-red-900/40 text-red-300',
  maybe: 'bg-yellow-900/40 text-yellow-300',
  checked_in: 'bg-emerald-900/40 text-emerald-300',
  no_show: 'bg-zinc-700/50 text-zinc-400'
}

// ────────────────────────────────────────────────────────────────────────────
// Public RSVP Schema (unauthenticated guest self-registration)
// ────────────────────────────────────────────────────────────────────────────

export const publicRsvpSchema = z.object({
  first_name: z.string().min(2, 'שם פרטי נדרש'),
  last_name:  z.string().min(2, 'שם משפחה נדרש'),
  phone:      z.string().regex(ISRAELI_PHONE_REGEX, 'מספר טלפון לא תקין (10 ספרות, מתחיל ב-0)'),
  email:      z.string().email('אימייל לא תקין').optional().or(z.literal('')),
  has_companion:   z.boolean(),
  companion_name:  z.string().min(2, 'שם מלווה נדרש').optional(),
  companion_phone: z.string().regex(ISRAELI_PHONE_REGEX, 'מספר טלפון מלווה לא תקין').optional(),
})

export type PublicRsvpData = z.infer<typeof publicRsvpSchema>
