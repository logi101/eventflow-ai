import { z } from 'zod'

// ============================================================================
// Contingency action types
// ============================================================================

export const ContingencyActionType = {
  BACKUP_SPEAKER_ACTIVATE: 'backup_speaker_activate',
  ROOM_CHANGE: 'room_change',
  SCHEDULE_ADJUST: 'schedule_adjust',
  TIME_CHANGE: 'time_change',
  SESSION_CANCEL: 'session_cancel',
} as const

export type ContingencyActionType = typeof ContingencyActionType[keyof typeof ContingencyActionType]

// ============================================================================
// Execution status lifecycle
// ============================================================================

export const ExecutionStatus = {
  SUGGESTED: 'suggested',
  APPROVED: 'approved',
  EXECUTED: 'executed',
  REJECTED: 'rejected',
  FAILED: 'failed',
} as const

export type ExecutionStatus = typeof ExecutionStatus[keyof typeof ExecutionStatus]

// ============================================================================
// Zod schemas
// ============================================================================

export const contingencyActionDataSchema = z.object({
  schedule_id: z.string().uuid(),
  schedule_title: z.string(),
  // For backup speaker
  original_speaker_id: z.string().uuid().optional(),
  original_speaker_name: z.string().optional(),
  backup_speaker_id: z.string().uuid().optional(),
  backup_speaker_name: z.string().optional(),
  // For room change
  original_room_id: z.string().optional(),
  original_room_name: z.string().optional(),
  new_room_id: z.string().optional(),
  new_room_name: z.string().optional(),
  // For time change
  original_start_time: z.string().datetime().optional(),
  original_end_time: z.string().datetime().optional(),
  new_start_time: z.string().datetime().optional(),
  new_end_time: z.string().datetime().optional(),
})

export const impactSummarySchema = z.object({
  affected_participants: z.number().int().nonnegative(),
  notifications_sent: z.number().int().nonnegative(),
  notifications_failed: z.number().int().nonnegative().optional(),
  affected_sessions: z.array(z.string().uuid()),
  vip_affected: z.number().int().nonnegative().optional(),
})

export const contingencyActionSchema = z.object({
  id: z.string().uuid().optional(), // Set by database on insert
  event_id: z.string().uuid(),
  action_type: z.enum([
    'backup_speaker_activate',
    'room_change',
    'schedule_adjust',
    'time_change',
    'session_cancel',
  ]),
  action_data: contingencyActionDataSchema,
  execution_status: z.enum(['suggested', 'approved', 'executed', 'rejected', 'failed']),
  suggested_by: z.string().uuid(),
  suggested_at: z.string().datetime(),
  approved_by: z.string().uuid().optional(),
  approved_at: z.string().datetime().optional(),
  executed_by: z.string().uuid().optional(),
  executed_at: z.string().datetime().optional(),
  rejected_by: z.string().uuid().optional(),
  rejected_at: z.string().datetime().optional(),
  reason: z.string().min(1),
  impact_summary: impactSummarySchema.optional(),
  error_message: z.string().optional(),
})

export const auditEntrySchema = contingencyActionSchema.extend({
  id: z.string().uuid(),
  created_at: z.string().datetime(),
})

// ============================================================================
// Inferred types
// ============================================================================

export type ContingencyActionData = z.infer<typeof contingencyActionDataSchema>
export type ImpactSummary = z.infer<typeof impactSummarySchema>
export type ContingencyAction = z.infer<typeof contingencyActionSchema>
export type AuditEntry = z.infer<typeof auditEntrySchema>

// ============================================================================
// Suggestion response (returned by contingencyManager.suggest)
// ============================================================================

export interface ContingencySuggestion {
  action_id: string
  type: ContingencyActionType
  status: 'pending_approval'
  data: ContingencyActionData
  impact: ImpactSummary
  label: string // Hebrew label for UI
  reason: string
}

// ============================================================================
// Execution result
// ============================================================================

export interface ContingencyExecutionResult {
  success: boolean
  action_id: string
  execution_status: ExecutionStatus
  impact_summary?: ImpactSummary
  error_message?: string
}

// ============================================================================
// UI helper types
// ============================================================================

export const actionTypeLabels: Record<ContingencyActionType, string> = {
  backup_speaker_activate: 'הפעלת דובר חלופי',
  room_change: 'שינוי אולם',
  schedule_adjust: 'התאמת לו״ז',
  time_change: 'שינוי שעות',
  session_cancel: 'ביטול סשן',
}

export const statusLabels: Record<ExecutionStatus, string> = {
  suggested: 'הוצע',
  approved: 'אושר',
  executed: 'בוצע',
  rejected: 'נדחה',
  failed: 'נכשל',
}

export const statusColors: Record<ExecutionStatus, { bg: string; text: string }> = {
  suggested: { bg: 'bg-blue-100', text: 'text-blue-700' },
  approved: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  executed: { bg: 'bg-green-100', text: 'text-green-700' },
  rejected: { bg: 'bg-gray-100', text: 'text-gray-700' },
  failed: { bg: 'bg-red-100', text: 'text-red-700' },
}
