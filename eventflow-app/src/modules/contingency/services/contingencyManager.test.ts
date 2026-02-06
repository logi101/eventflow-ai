import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  suggestContingencyAction,
  executeContingencyAction,
  rejectContingencyAction,
  getContingencyHistory,
} from './contingencyManager'

// Mock the notification service
vi.mock('./notificationService', () => ({
  notifyParticipants: vi.fn().mockResolvedValue({ sent: 2, failed: 0 }),
  generateChangeNotification: vi.fn().mockReturnValue('Test notification message'),
}))

// ============================================================================
// Helper: create a chainable Supabase mock
// ============================================================================

function createChainMock(resolvedValue: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}

  chain.select = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.delete = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(resolvedValue)

  // When the chain is awaited directly (no .single()), resolve the value
  // This handles queries that don't end with .single()
  const thenable = {
    ...chain,
    then: (resolve: (v: unknown) => void) => resolve(resolvedValue),
  }

  // Make order return thenable for getContingencyHistory (no .single())
  chain.order = vi.fn().mockReturnValue(thenable)

  return chain
}

function createMockSupabase(overrides: Record<string, (tableName: string) => unknown> = {}) {
  return {
    from: vi.fn((tableName: string) => {
      if (overrides[tableName]) {
        return overrides[tableName](tableName)
      }
      return createChainMock({ data: null, error: null })
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  } as unknown as SupabaseClient
}

// ============================================================================
// Test data factories
// ============================================================================

function makeActionData(overrides = {}) {
  return {
    schedule_id: '11111111-1111-1111-1111-111111111111',
    schedule_title: 'Opening Keynote',
    original_speaker_id: '22222222-2222-2222-2222-222222222222',
    original_speaker_name: 'Speaker A',
    backup_speaker_id: '33333333-3333-3333-3333-333333333333',
    backup_speaker_name: 'Speaker B',
    ...overrides,
  }
}

function makeAuditEntry(overrides = {}) {
  return {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    event_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    action_type: 'backup_speaker_activate',
    action_data: makeActionData(),
    execution_status: 'suggested',
    suggested_by: 'uuuuuuuu-uuuu-uuuu-uuuu-uuuuuuuuuuuu',
    suggested_at: '2026-01-15T10:00:00.000Z',
    reason: 'Speaker is sick',
    impact_summary: {
      affected_participants: 5,
      notifications_sent: 0,
      affected_sessions: ['11111111-1111-1111-1111-111111111111'],
      vip_affected: 1,
    },
    created_at: '2026-01-15T10:00:00.000Z',
    ...overrides,
  }
}

// ============================================================================
// getContingencyHistory
// ============================================================================

describe('getContingencyHistory', () => {
  it('returns audit entries for the given event', async () => {
    const entries = [makeAuditEntry(), makeAuditEntry({ id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' })]

    const chain = createChainMock({ data: entries, error: null })
    const supabase = createMockSupabase({
      contingency_audit_log: () => chain,
    })

    const result = await getContingencyHistory(
      supabase,
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
    )

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
    expect(supabase.from).toHaveBeenCalledWith('contingency_audit_log')
  })

  it('returns empty array when query fails', async () => {
    const chain = createChainMock({ data: null, error: { message: 'DB error' } })
    // Override order to return the error-resolving thenable
    chain.order = vi.fn().mockReturnValue({
      ...chain,
      then: (resolve: (v: unknown) => void) => resolve({ data: null, error: { message: 'DB error' } }),
    })
    const supabase = createMockSupabase({
      contingency_audit_log: () => chain,
    })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await getContingencyHistory(supabase, 'some-event-id')

    expect(result).toEqual([])
    consoleSpy.mockRestore()
  })
})

// ============================================================================
// suggestContingencyAction
// ============================================================================

describe('suggestContingencyAction', () => {
  it('creates an audit log entry and returns a pending_approval suggestion', async () => {
    const participantData = [
      {
        participants: {
          id: 'p1',
          first_name: 'Dan',
          last_name: 'Lev',
          phone_normalized: '972501234567',
          is_vip: true,
          organization_id: 'org1',
        },
      },
    ]

    // We need two tables: participant_schedules (for impact calc) and contingency_audit_log (for insert)
    const participantChain = createChainMock({ data: participantData, error: null })
    const auditChain = createChainMock({
      data: { id: 'new-audit-id' },
      error: null,
    })

    const supabase = createMockSupabase({
      participant_schedules: () => participantChain,
      contingency_audit_log: () => auditChain,
    })

    const result = await suggestContingencyAction(
      supabase,
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      'backup_speaker_activate',
      makeActionData(),
      'Speaker is unavailable',
      'uuuuuuuu-uuuu-uuuu-uuuu-uuuuuuuuuuuu'
    )

    expect(result.status).toBe('pending_approval')
    expect(result.action_id).toBe('new-audit-id')
    expect(result.type).toBe('backup_speaker_activate')
    expect(result.impact.affected_participants).toBeDefined()
    expect(result.label).toContain('Opening Keynote')
  })

  it('throws when audit log insert fails', async () => {
    const participantChain = createChainMock({ data: [], error: null })
    const auditChain = createChainMock({
      data: null,
      error: { message: 'Insert failed' },
    })

    const supabase = createMockSupabase({
      participant_schedules: () => participantChain,
      contingency_audit_log: () => auditChain,
    })

    await expect(
      suggestContingencyAction(
        supabase,
        'event-id',
        'room_change',
        makeActionData({ new_room_id: 'room-2', new_room_name: 'Hall B' }),
        'Flooding in Hall A',
        'user-id'
      )
    ).rejects.toThrow('Failed to log contingency suggestion')
  })

  it('generates correct label for room_change action', async () => {
    const participantChain = createChainMock({ data: [], error: null })
    const auditChain = createChainMock({
      data: { id: 'audit-room' },
      error: null,
    })

    const supabase = createMockSupabase({
      participant_schedules: () => participantChain,
      contingency_audit_log: () => auditChain,
    })

    const result = await suggestContingencyAction(
      supabase,
      'event-id',
      'room_change',
      makeActionData({ new_room_name: 'Hall B' }),
      'Room issue',
      'user-id'
    )

    expect(result.label).toContain('Hall B')
  })

  it('generates correct label for session_cancel action', async () => {
    const participantChain = createChainMock({ data: [], error: null })
    const auditChain = createChainMock({
      data: { id: 'audit-cancel' },
      error: null,
    })

    const supabase = createMockSupabase({
      participant_schedules: () => participantChain,
      contingency_audit_log: () => auditChain,
    })

    const result = await suggestContingencyAction(
      supabase,
      'event-id',
      'session_cancel',
      makeActionData(),
      'Not enough speakers',
      'user-id'
    )

    // Hebrew label for cancel
    expect(result.label).toContain('Opening Keynote')
  })
})

// ============================================================================
// executeContingencyAction
// ============================================================================

describe('executeContingencyAction', () => {
  it('returns failure when action is not found', async () => {
    const chain = createChainMock({ data: null, error: { message: 'not found' } })
    const supabase = createMockSupabase({
      contingency_audit_log: () => chain,
    })

    const result = await executeContingencyAction(supabase, 'missing-id', 'user-id')

    expect(result.success).toBe(false)
    expect(result.error_message).toBe('Action not found')
    expect(result.execution_status).toBe('failed')
  })

  it('returns failure when action is already executed', async () => {
    const entry = makeAuditEntry({ execution_status: 'executed' })
    const chain = createChainMock({ data: entry, error: null })
    const supabase = createMockSupabase({
      contingency_audit_log: () => chain,
    })

    const result = await executeContingencyAction(supabase, entry.id, 'user-id')

    expect(result.success).toBe(false)
    expect(result.error_message).toContain('Cannot execute action in status')
  })

  it('returns failure when action is rejected', async () => {
    const entry = makeAuditEntry({ execution_status: 'rejected' })
    const chain = createChainMock({ data: entry, error: null })
    const supabase = createMockSupabase({
      contingency_audit_log: () => chain,
    })

    const result = await executeContingencyAction(supabase, entry.id, 'user-id')

    expect(result.success).toBe(false)
    expect(result.error_message).toContain('Cannot execute action in status')
  })

  it('returns failure when action status is failed', async () => {
    const entry = makeAuditEntry({ execution_status: 'failed' })
    const chain = createChainMock({ data: entry, error: null })
    const supabase = createMockSupabase({
      contingency_audit_log: () => chain,
    })

    const result = await executeContingencyAction(supabase, entry.id, 'user-id')

    expect(result.success).toBe(false)
  })

  it('executes a suggested action successfully', async () => {
    const entry = makeAuditEntry({ execution_status: 'suggested' })

    // This is more complex because execute calls multiple tables
    const callTracker: Record<string, ReturnType<typeof createChainMock>> = {}

    const supabase = {
      from: vi.fn((tableName: string) => {
        if (!callTracker[tableName]) {
          if (tableName === 'contingency_audit_log') {
            // First call: fetch action (single). Second call: update status
            const fetchChain = createChainMock({ data: entry, error: null })
            callTracker[tableName] = fetchChain
            return fetchChain
          }
          if (tableName === 'schedules') {
            callTracker[tableName] = createChainMock({ data: null, error: null })
            return callTracker[tableName]
          }
          if (tableName === 'participant_schedules') {
            callTracker[tableName] = createChainMock({ data: [], error: null })
            return callTracker[tableName]
          }
        }
        // Return a fresh chain for subsequent calls to the same table
        return createChainMock({ data: null, error: null })
      }),
      functions: {
        invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
    } as unknown as SupabaseClient

    const result = await executeContingencyAction(supabase, entry.id, 'user-id')

    expect(result.success).toBe(true)
    expect(result.execution_status).toBe('executed')
    expect(result.impact_summary).toBeDefined()
  })
})

// ============================================================================
// rejectContingencyAction
// ============================================================================

describe('rejectContingencyAction', () => {
  it('rejects an action successfully', async () => {
    const chain = createChainMock({ data: null, error: null })
    // update doesn't call .single(), so make eq return a thenable
    chain.eq = vi.fn().mockReturnValue({
      then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }),
    })

    const supabase = createMockSupabase({
      contingency_audit_log: () => chain,
    })

    const result = await rejectContingencyAction(
      supabase,
      'action-id',
      'user-id',
      'Not needed anymore'
    )

    expect(result.success).toBe(true)
    expect(result.execution_status).toBe('rejected')
  })

  it('returns failure when reject update fails', async () => {
    const chain = createChainMock({ data: null, error: null })
    chain.eq = vi.fn().mockReturnValue({
      then: (resolve: (v: unknown) => void) =>
        resolve({ data: null, error: { message: 'Update failed' } }),
    })

    const supabase = createMockSupabase({
      contingency_audit_log: () => chain,
    })

    const result = await rejectContingencyAction(supabase, 'action-id', 'user-id')

    expect(result.success).toBe(false)
    expect(result.error_message).toContain('Failed to reject action')
  })

  it('handles optional rejection reason', async () => {
    const chain = createChainMock({ data: null, error: null })
    chain.eq = vi.fn().mockReturnValue({
      then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }),
    })

    const supabase = createMockSupabase({
      contingency_audit_log: () => chain,
    })

    const result = await rejectContingencyAction(supabase, 'action-id', 'user-id')

    expect(result.success).toBe(true)
    expect(result.action_id).toBe('action-id')
  })
})
