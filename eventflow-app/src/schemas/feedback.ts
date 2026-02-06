// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Feedback Zod Schemas (Matching actual DB structure)
// ═══════════════════════════════════════════════════════════════════════════

import { z } from 'zod'

// ────────────────────────────────────────────────────────────────────────────
// Feedback Survey Schema (matching actual DB columns)
// ────────────────────────────────────────────────────────────────────────────

export const feedbackSurveySchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  title: z.string().min(1, 'כותרת הסקר נדרשת'),
  description: z.string().nullable(),
  is_active: z.boolean().default(true),
  anonymous: z.boolean().default(false),
  starts_at: z.string().nullable(),
  ends_at: z.string().nullable(),
  created_at: z.string(),
  events: z.object({
    name: z.string()
  }).optional(),
  response_count: z.number().int().min(0).optional()
})

export type FeedbackSurvey = z.infer<typeof feedbackSurveySchema>

// ────────────────────────────────────────────────────────────────────────────
// Feedback Response Schema (matching actual DB columns)
// ────────────────────────────────────────────────────────────────────────────

export const feedbackResponseSchema = z.object({
  id: z.string().uuid(),
  survey_id: z.string().uuid(),
  participant_id: z.string().uuid().nullable(),
  submitted_at: z.string(),
  answers: z.record(z.string(), z.unknown()),
  participants: z.object({
    first_name: z.string(),
    last_name: z.string()
  }).optional()
})

export type FeedbackResponse = z.infer<typeof feedbackResponseSchema>

// ────────────────────────────────────────────────────────────────────────────
// Create Feedback Survey Schema (for creating new surveys)
// ────────────────────────────────────────────────────────────────────────────

export const createFeedbackSurveySchema = z.object({
  title: z.string().min(2, 'כותרת הסקר חייבת להכיל לפחות 2 תווים'),
  description: z.string().optional(),
  event_id: z.string().uuid('יש לבחור אירוע'),
  is_active: z.boolean().default(true),
  anonymous: z.boolean().default(false),
  starts_at: z.string().optional(),
  ends_at: z.string().optional()
})

export type CreateFeedbackSurvey = z.infer<typeof createFeedbackSurveySchema>

// ────────────────────────────────────────────────────────────────────────────
// Survey Form Data Schema (matching SurveyFormData interface)
// ────────────────────────────────────────────────────────────────────────────

export const surveyFormDataSchema = z.object({
  title: z.string().min(2, 'כותרת הסקר חייבת להכיל לפחות 2 תווים'),
  description: z.string(),
  event_id: z.string().min(1, 'יש לבחור אירוע'),
  is_active: z.boolean(),
  anonymous: z.boolean(),
  starts_at: z.string(),
  ends_at: z.string()
})

export type SurveyFormData = z.infer<typeof surveyFormDataSchema>

// ────────────────────────────────────────────────────────────────────────────
// Submit Feedback Response Schema (for submitting answers)
// ────────────────────────────────────────────────────────────────────────────

export const submitFeedbackResponseSchema = z.object({
  survey_id: z.string().uuid(),
  participant_id: z.string().uuid().optional(),
  answers: z.record(z.string(), z.unknown()).refine(
    (val) => Object.keys(val).length > 0,
    'יש למלא לפחות תשובה אחת'
  )
})

export type SubmitFeedbackResponse = z.infer<typeof submitFeedbackResponseSchema>

// ────────────────────────────────────────────────────────────────────────────
// Filter Schema
// ────────────────────────────────────────────────────────────────────────────

export const feedbackFiltersSchema = z.object({
  event_id: z.string().uuid().optional(),
  is_active: z.boolean().optional(),
  search: z.string().optional()
})

export type FeedbackFilters = z.infer<typeof feedbackFiltersSchema>

// ────────────────────────────────────────────────────────────────────────────
// Simple Event Schema (for dropdowns/selects)
// ────────────────────────────────────────────────────────────────────────────

export const simpleEventSchema = z.object({
  id: z.string().uuid(),
  name: z.string()
})

export type SimpleEvent = z.infer<typeof simpleEventSchema>
