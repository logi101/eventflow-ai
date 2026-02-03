import { z } from 'zod'

// ============================================================================
// Severity levels (ordered by priority)
// ============================================================================

export const SimulationSeverity = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info',
} as const

export type SimulationSeverity = typeof SimulationSeverity[keyof typeof SimulationSeverity]

// ============================================================================
// Issue categories (8 validators)
// ============================================================================

export const IssueCategory = {
  ROOM: 'room',
  SPEAKER: 'speaker',
  CAPACITY: 'capacity',
  TIMING: 'timing',
  EQUIPMENT: 'equipment',
  VIP: 'vip',
  CATERING: 'catering',
  BACK_TO_BACK: 'backtoback',
} as const

export type IssueCategory = typeof IssueCategory[keyof typeof IssueCategory]

// ============================================================================
// Suggested fix action types
// ============================================================================

export const FixActionType = {
  UPDATE_SCHEDULE: 'update_schedule',
  REASSIGN_ROOM: 'reassign_room',
  ADJUST_TIME: 'adjust_time',
  ADD_EQUIPMENT: 'add_equipment',
  ACTIVATE_BACKUP: 'activate_backup',
  EXTEND_BREAK: 'extend_break',
  ADD_CATERING: 'add_catering',
} as const

export type FixActionType = typeof FixActionType[keyof typeof FixActionType]

// ============================================================================
// Zod schemas
// ============================================================================

export const suggestedFixSchema = z.object({
  type: z.enum([
    'update_schedule',
    'reassign_room',
    'adjust_time',
    'add_equipment',
    'activate_backup',
    'extend_break',
    'add_catering',
  ]),
  action_data: z.record(z.string(), z.unknown()),
  label: z.string(), // Hebrew label for UI button
})

export const affectedEntitiesSchema = z.object({
  schedule_ids: z.array(z.string().uuid()).optional(),
  participant_ids: z.array(z.string().uuid()).optional(),
  vendor_ids: z.array(z.string().uuid()).optional(),
  speaker_ids: z.array(z.string().uuid()).optional(),
  room_ids: z.array(z.string()).optional(),
})

export const simulationIssueSchema = z.object({
  id: z.string(), // Deterministic ID based on issue content
  severity: z.enum(['critical', 'warning', 'info']),
  category: z.enum(['room', 'speaker', 'capacity', 'timing', 'equipment', 'vip', 'catering', 'backtoback']),
  title: z.string(), // Hebrew title
  description: z.string(), // Hebrew description with context
  affectedEntities: affectedEntitiesSchema,
  suggestedFix: suggestedFixSchema.optional(),
})

export const simulationResultSchema = z.object({
  event_id: z.string().uuid(),
  run_at: z.string().datetime(),
  total_issues: z.number().int().nonnegative(),
  critical: z.number().int().nonnegative(),
  warnings: z.number().int().nonnegative(),
  info: z.number().int().nonnegative(),
  issues: z.array(simulationIssueSchema),
  duration_ms: z.number().int().nonnegative().optional(),
})

// ============================================================================
// Inferred types
// ============================================================================

export type SuggestedFix = z.infer<typeof suggestedFixSchema>
export type AffectedEntities = z.infer<typeof affectedEntitiesSchema>
export type SimulationIssue = z.infer<typeof simulationIssueSchema>
export type SimulationResult = z.infer<typeof simulationResultSchema>

// ============================================================================
// Grouped issues for UI display
// ============================================================================

export interface GroupedIssues {
  critical: SimulationIssue[]
  warning: SimulationIssue[]
  info: SimulationIssue[]
}

// ============================================================================
// Severity configuration for UI
// ============================================================================

export const severityConfig = {
  critical: {
    color: 'red',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
    iconColor: 'text-red-500',
    label: 'קריטי',
    description: 'בעיות שחייבות פתרון לפני האירוע',
  },
  warning: {
    color: 'yellow',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-700',
    iconColor: 'text-yellow-500',
    label: 'אזהרה',
    description: 'בעיות מומלצות לפתרון',
  },
  info: {
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    iconColor: 'text-blue-500',
    label: 'מידע',
    description: 'המלצות לשיפור',
  },
} as const
