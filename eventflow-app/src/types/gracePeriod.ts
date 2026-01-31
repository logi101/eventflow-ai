// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Grace Period Types
// ═══════════════════════════════════════════════════════════════════════════

export type PendingChangeType =
  | 'schedule_create'
  | 'schedule_update'
  | 'schedule_delete'
  | 'schedule_delete_all'
  | 'message_update'
  | 'message_delete'
  | 'message_delete_all'

export interface PendingChange {
  id: string
  type: PendingChangeType
  eventId: string
  createdAt: number
  expiresAt: number
  description: string
  payload: Record<string, unknown>
  rollbackFn?: () => Promise<void>
  executeFn: () => Promise<void>
  messageImpact?: MessageImpact
}

export interface MessageImpact {
  messagesToCreate: number
  messagesToUpdate: number
  messagesToDelete: number
  affectedParticipants: number
}

export interface ConfirmationDetails {
  title: string
  description: string
  changes: {
    label: string
    count: number
  }[]
  deletions: {
    label: string
    count: number
  }[]
  warningText?: string
}

export type GracePeriodAction =
  | { type: 'ADD_CHANGE'; payload: PendingChange }
  | { type: 'REMOVE_CHANGE'; payload: string }
  | { type: 'CLEAR_ALL' }
  | { type: 'TICK' }
