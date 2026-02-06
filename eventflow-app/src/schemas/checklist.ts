// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Checklist Zod Schemas (Matching actual DB structure)
// ═══════════════════════════════════════════════════════════════════════════

import { z } from 'zod'

// ────────────────────────────────────────────────────────────────────────────
// Enums (matching database)
// ────────────────────────────────────────────────────────────────────────────

export const taskStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'blocked',
  'cancelled'
])

export const taskPrioritySchema = z.enum([
  'low',
  'medium',
  'high',
  'critical'
])

export const budgetAlertTypeSchema = z.enum([
  'warning',
  'critical'
])

export const alertSentViaSchema = z.enum([
  'app',
  'whatsapp',
  'both'
])

export type TaskStatus = z.infer<typeof taskStatusSchema>
export type TaskPriority = z.infer<typeof taskPrioritySchema>
export type BudgetAlertType = z.infer<typeof budgetAlertTypeSchema>
export type AlertSentVia = z.infer<typeof alertSentViaSchema>

// ────────────────────────────────────────────────────────────────────────────
// Checklist Item Schema (matching actual DB columns)
// ────────────────────────────────────────────────────────────────────────────

export const checklistItemSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable(),
  title: z.string().min(1, 'כותרת המשימה נדרשת'),
  description: z.string().nullable(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  assigned_to: z.string().uuid().nullable(),
  due_date: z.string().nullable(),
  completed_at: z.string().nullable(),
  estimated_hours: z.number().min(0).nullable(),
  actual_hours: z.number().min(0).nullable(),
  estimated_cost: z.number().min(0).nullable(),
  actual_cost: z.number().min(0).nullable(),
  currency: z.string().default('ILS'),
  notes: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  sort_order: z.number().int().min(0),
  is_milestone: z.boolean().default(false),
  milestone_date: z.string().nullable(),
  budget_allocation: z.number().min(0).nullable(),
  created_at: z.string(),
  events: z.object({
    name: z.string()
  }).optional()
})

export type ChecklistItem = z.infer<typeof checklistItemSchema>

// ────────────────────────────────────────────────────────────────────────────
// Create Checklist Item Schema (for adding new items)
// ────────────────────────────────────────────────────────────────────────────

export const createChecklistItemSchema = z.object({
  title: z.string().min(2, 'כותרת המשימה חייבת להכיל לפחות 2 תווים'),
  description: z.string().optional(),
  status: taskStatusSchema.default('pending'),
  priority: taskPrioritySchema.default('medium'),
  due_date: z.string().optional(),
  estimated_hours: z.string().optional(),
  estimated_cost: z.string().optional(),
  is_milestone: z.boolean().default(false),
  notes: z.string().optional()
})

export type CreateChecklistItem = z.infer<typeof createChecklistItemSchema>

// ────────────────────────────────────────────────────────────────────────────
// Checklist Form Data Schema (matching ChecklistFormData interface)
// ────────────────────────────────────────────────────────────────────────────

export const checklistFormDataSchema = z.object({
  title: z.string().min(2, 'כותרת המשימה חייבת להכיל לפחות 2 תווים'),
  description: z.string(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  due_date: z.string(),
  estimated_hours: z.string(),
  estimated_cost: z.string(),
  is_milestone: z.boolean(),
  notes: z.string()
})

export type ChecklistFormData = z.infer<typeof checklistFormDataSchema>

// ────────────────────────────────────────────────────────────────────────────
// Budget Alert Schema (matching BudgetAlert interface)
// ────────────────────────────────────────────────────────────────────────────

export const budgetAlertSchema = z.object({
  id: z.string().uuid(),
  checklistItemId: z.string().uuid(),
  eventId: z.string().uuid(),
  organizationId: z.string().uuid(),
  alertType: budgetAlertTypeSchema,
  thresholdPercentage: z.number().min(0).max(100),
  currentAmount: z.number().min(0),
  budgetAmount: z.number().min(0),
  sentAt: z.string(),
  sentVia: alertSentViaSchema,
  acknowledgedAt: z.string().optional(),
  acknowledgedBy: z.string().uuid().optional(),
  acknowledgmentNotes: z.string().optional(),
  createdAt: z.string()
})

export type BudgetAlert = z.infer<typeof budgetAlertSchema>

// ────────────────────────────────────────────────────────────────────────────
// Filter Schema
// ────────────────────────────────────────────────────────────────────────────

export const checklistFiltersSchema = z.object({
  event_id: z.string().uuid().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  is_milestone: z.boolean().optional(),
  assigned_to: z.string().uuid().optional(),
  search: z.string().optional()
})

export type ChecklistFilters = z.infer<typeof checklistFiltersSchema>

// ────────────────────────────────────────────────────────────────────────────
// Display Helpers
// ────────────────────────────────────────────────────────────────────────────

export const taskStatusLabels: Record<TaskStatus, string> = {
  pending: 'ממתין',
  in_progress: 'בביצוע',
  completed: 'הושלם',
  blocked: 'חסום',
  cancelled: 'בוטל'
}

export const taskStatusColors: Record<TaskStatus, string> = {
  pending: 'bg-zinc-700/50 text-zinc-300',
  in_progress: 'bg-blue-900/40 text-blue-300',
  completed: 'bg-green-900/40 text-green-300',
  blocked: 'bg-red-900/40 text-red-300',
  cancelled: 'bg-zinc-700/50 text-zinc-400'
}

export const taskPriorityLabels: Record<TaskPriority, string> = {
  low: 'נמוכה',
  medium: 'בינונית',
  high: 'גבוהה',
  critical: 'קריטית'
}

export const taskPriorityColors: Record<TaskPriority, string> = {
  low: 'bg-zinc-700/50 text-zinc-300',
  medium: 'bg-blue-900/40 text-blue-300',
  high: 'bg-orange-900/40 text-orange-300',
  critical: 'bg-red-900/40 text-red-300'
}
