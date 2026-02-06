// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Events Zod Schemas (Matching actual DB structure)
// ═══════════════════════════════════════════════════════════════════════════

import { z } from 'zod'

// ────────────────────────────────────────────────────────────────────────────
// Enums (matching database)
// ────────────────────────────────────────────────────────────────────────────

export const eventStatusSchema = z.enum([
  'draft',
  'planning',
  'active',
  'completed',
  'cancelled',
  'archived'
])

export type EventStatus = z.infer<typeof eventStatusSchema>

// ────────────────────────────────────────────────────────────────────────────
// Event Type Schema (event_types table)
// ────────────────────────────────────────────────────────────────────────────

export const eventTypeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'שם סוג האירוע נדרש'),
  name_en: z.string().nullable(),
  icon: z.string().nullable(),
  description: z.string().nullable(),
  is_system: z.boolean()
})

export type EventType = z.infer<typeof eventTypeSchema>

// ────────────────────────────────────────────────────────────────────────────
// Event Schema (matching actual DB columns)
// ────────────────────────────────────────────────────────────────────────────

export const eventSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'שם האירוע נדרש'),
  description: z.string().nullable(),
  status: eventStatusSchema,
  start_date: z.string().min(1, 'תאריך התחלה נדרש'),
  end_date: z.string().nullable(),
  venue_name: z.string().nullable(),
  venue_address: z.string().nullable(),
  venue_city: z.string().nullable(),
  max_participants: z.number().int().positive().nullable(),
  budget: z.number().min(0).nullable(),
  currency: z.string().default('ILS'),
  event_type_id: z.string().uuid().nullable(),
  organization_id: z.string().uuid().nullable(),
  settings: z.record(z.string(), z.boolean()).nullable(),
  event_types: eventTypeSchema.optional(),
  created_at: z.string(),
  participants_count: z.number().int().min(0).optional(),
  checklist_progress: z.number().min(0).max(100).optional(),
  vendors_count: z.number().int().min(0).optional()
})

export type Event = z.infer<typeof eventSchema>

// ────────────────────────────────────────────────────────────────────────────
// Create Event Schema (for new event creation)
// ────────────────────────────────────────────────────────────────────────────

export const createEventSchema = z.object({
  name: z.string().min(2, 'שם האירוע חייב להכיל לפחות 2 תווים'),
  description: z.string().optional(),
  event_type_id: z.string().uuid('יש לבחור סוג אירוע').optional(),
  start_date: z.string().min(1, 'תאריך התחלה נדרש'),
  end_date: z.string().optional(),
  venue_name: z.string().optional(),
  venue_address: z.string().optional(),
  venue_city: z.string().optional(),
  max_participants: z.string().optional(),
  budget: z.string().optional(),
  status: eventStatusSchema.default('draft')
})

export type CreateEvent = z.infer<typeof createEventSchema>

// ────────────────────────────────────────────────────────────────────────────
// Update Event Schema (partial update)
// ────────────────────────────────────────────────────────────────────────────

export const updateEventSchema = createEventSchema.partial()

export type UpdateEvent = z.infer<typeof updateEventSchema>

// ────────────────────────────────────────────────────────────────────────────
// Event Form Data Schema (matching EventFormData interface)
// ────────────────────────────────────────────────────────────────────────────

export const eventFormDataSchema = z.object({
  name: z.string().min(2, 'שם האירוע חייב להכיל לפחות 2 תווים'),
  description: z.string(),
  event_type_id: z.string(),
  start_date: z.string().min(1, 'תאריך התחלה נדרש'),
  end_date: z.string(),
  venue_name: z.string(),
  venue_address: z.string(),
  venue_city: z.string(),
  max_participants: z.string(),
  budget: z.string(),
  status: eventStatusSchema
})

export type EventFormData = z.infer<typeof eventFormDataSchema>

// ────────────────────────────────────────────────────────────────────────────
// Filter Schema
// ────────────────────────────────────────────────────────────────────────────

export const eventFiltersSchema = z.object({
  status: eventStatusSchema.optional(),
  event_type_id: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional()
})

export type EventFilters = z.infer<typeof eventFiltersSchema>

// ────────────────────────────────────────────────────────────────────────────
// Display Helpers
// ────────────────────────────────────────────────────────────────────────────

export const eventStatusLabels: Record<EventStatus, string> = {
  draft: 'טיוטה',
  planning: 'בתכנון',
  active: 'פעיל',
  completed: 'הושלם',
  cancelled: 'בוטל',
  archived: 'בארכיון'
}

export const eventStatusColors: Record<EventStatus, string> = {
  draft: 'bg-zinc-700/50 text-zinc-300',
  planning: 'bg-blue-900/40 text-blue-300',
  active: 'bg-green-900/40 text-green-300',
  completed: 'bg-emerald-900/40 text-emerald-300',
  cancelled: 'bg-red-900/40 text-red-300',
  archived: 'bg-zinc-700/50 text-zinc-400'
}
