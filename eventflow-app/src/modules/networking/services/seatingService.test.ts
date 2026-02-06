import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchTableAssignments,
  saveTableAssignment,
  saveAllTableAssignments,
  updateParticipantTable,
  deleteTableAssignment,
  deleteAllTableAssignments,
} from './seatingService'
import { supabase } from '@/lib/supabase'

// supabase is auto-mocked by the global test setup (src/test/setup.ts)

// ============================================================================
// Helper: reset and configure the supabase mock chain for each test
// ============================================================================

function mockSupabaseChain(terminalValue: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(terminalValue),
  }

  // Make the chain itself thenable for queries that don't end with .single()
  const thenableChain = {
    ...chain,
    then: (resolve: (v: unknown) => void) => resolve(terminalValue),
  }

  // order() should return a thenable chain (fetchTableAssignments doesn't call .single())
  chain.order = vi.fn().mockReturnValue(thenableChain)
  // eq() should also return a thenable for delete operations
  chain.eq = vi.fn().mockReturnValue(thenableChain)
  // select() should return a thenable for insert/saveAll
  chain.select = vi.fn().mockReturnValue(thenableChain)

  vi.mocked(supabase.from).mockReturnValue(chain as never)
  return chain
}

// ============================================================================
// fetchTableAssignments
// ============================================================================

describe('fetchTableAssignments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns table assignments for the given event', async () => {
    const mockAssignments = [
      { id: '1', event_id: 'e1', participant_id: 'p1', table_number: 1 },
      { id: '2', event_id: 'e1', participant_id: 'p2', table_number: 2 },
    ]

    mockSupabaseChain({ data: mockAssignments, error: null })

    const result = await fetchTableAssignments('e1')

    expect(result).toEqual(mockAssignments)
    expect(supabase.from).toHaveBeenCalledWith('table_assignments')
  })

  it('returns empty array when data is null', async () => {
    mockSupabaseChain({ data: null, error: null })

    const result = await fetchTableAssignments('e1')

    expect(result).toEqual([])
  })

  it('throws when the query fails', async () => {
    mockSupabaseChain({ data: null, error: { message: 'Network error' } })

    await expect(fetchTableAssignments('e1')).rejects.toThrow(
      'Failed to fetch table assignments: Network error'
    )
  })
})

// ============================================================================
// saveTableAssignment
// ============================================================================

describe('saveTableAssignment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('upserts an assignment and returns the saved record', async () => {
    const saved = {
      id: 'new-id',
      event_id: 'e1',
      participant_id: 'p1',
      table_number: 3,
      assigned_at: '2026-01-15T10:00:00.000Z',
    }

    const chain = mockSupabaseChain({ data: null, error: null })
    // For upsert -> select -> single chain
    chain.upsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: saved, error: null }),
      }),
    })

    const result = await saveTableAssignment({
      event_id: 'e1',
      participant_id: 'p1',
      table_number: 3,
      is_vip_table: false,
      assigned_by: 'manager' as const,
    })

    expect(result).toEqual(saved)
    expect(supabase.from).toHaveBeenCalledWith('table_assignments')
  })

  it('throws when upsert fails', async () => {
    const chain = mockSupabaseChain({ data: null, error: null })
    chain.upsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Upsert error' } }),
      }),
    })

    await expect(
      saveTableAssignment({
        event_id: 'e1',
        participant_id: 'p1',
        table_number: 1,
        is_vip_table: false,
        assigned_by: 'manager' as const,
      })
    ).rejects.toThrow('Failed to save table assignment: Upsert error')
  })
})

// ============================================================================
// saveAllTableAssignments
// ============================================================================

describe('saveAllTableAssignments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes existing and inserts new assignments', async () => {
    const insertedData = [
      { id: 'a1', event_id: 'e1', participant_id: 'p1', table_number: 1 },
      { id: 'a2', event_id: 'e1', participant_id: 'p2', table_number: 2 },
    ]

    // We need to handle two sequential supabase.from calls:
    // 1. delete().eq() for existing assignments
    // 2. insert().select() for new assignments
    let callCount = 0
    vi.mocked(supabase.from).mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // Delete chain
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              then: (resolve: (v: unknown) => void) => resolve({ error: null }),
            }),
          }),
        } as never
      }
      // Insert chain
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            then: (resolve: (v: unknown) => void) => resolve({ data: insertedData, error: null }),
          }),
        }),
      } as never
    })

    const result = await saveAllTableAssignments('e1', [
      { participant_id: 'p1', table_number: 1, is_vip_table: false, assigned_by: 'ai' as const },
      { participant_id: 'p2', table_number: 2, is_vip_table: false, assigned_by: 'ai' as const },
    ])

    expect(result).toEqual(insertedData)
    expect(supabase.from).toHaveBeenCalledTimes(2)
  })

  it('throws when delete step fails', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) =>
            resolve({ error: { message: 'Delete failed' } }),
        }),
      }),
    } as never)

    await expect(
      saveAllTableAssignments('e1', [
        { participant_id: 'p1', table_number: 1, is_vip_table: false, assigned_by: 'manager' as const },
      ])
    ).rejects.toThrow('Failed to delete existing assignments: Delete failed')
  })

  it('throws when insert step fails', async () => {
    let callCount = 0
    vi.mocked(supabase.from).mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              then: (resolve: (v: unknown) => void) => resolve({ error: null }),
            }),
          }),
        } as never
      }
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            then: (resolve: (v: unknown) => void) =>
              resolve({ data: null, error: { message: 'Insert failed' } }),
          }),
        }),
      } as never
    })

    await expect(
      saveAllTableAssignments('e1', [
        { participant_id: 'p1', table_number: 1, is_vip_table: false, assigned_by: 'auto' as const },
      ])
    ).rejects.toThrow('Failed to insert table assignments: Insert failed')
  })

  it('returns empty array when insert returns null data', async () => {
    let callCount = 0
    vi.mocked(supabase.from).mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              then: (resolve: (v: unknown) => void) => resolve({ error: null }),
            }),
          }),
        } as never
      }
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }),
          }),
        }),
      } as never
    })

    const result = await saveAllTableAssignments('e1', [])

    expect(result).toEqual([])
  })
})

// ============================================================================
// updateParticipantTable
// ============================================================================

describe('updateParticipantTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates an existing assignment when one is found', async () => {
    const existingRecord = { id: 'existing-id', event_id: 'e1', participant_id: 'p1', table_number: 1 }
    const updatedRecord = { ...existingRecord, table_number: 5 }

    let callCount = 0
    vi.mocked(supabase.from).mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // select to find existing
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: existingRecord, error: null }),
              }),
            }),
          }),
        } as never
      }
      // update chain
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updatedRecord, error: null }),
            }),
          }),
        }),
      } as never
    })

    const result = await updateParticipantTable('e1', 'p1', 5)

    expect(result).toEqual(updatedRecord)
  })

  it('creates a new assignment when none exists', async () => {
    const newRecord = { id: 'new-id', event_id: 'e1', participant_id: 'p1', table_number: 3 }

    let callCount = 0
    vi.mocked(supabase.from).mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // select - no existing assignment
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        } as never
      }
      // insert chain
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: newRecord, error: null }),
          }),
        }),
      } as never
    })

    const result = await updateParticipantTable('e1', 'p1', 3, 'ai')

    expect(result).toEqual(newRecord)
  })
})

// ============================================================================
// deleteTableAssignment
// ============================================================================

describe('deleteTableAssignment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes an assignment by id', async () => {
    mockSupabaseChain({ data: null, error: null })

    await expect(deleteTableAssignment('assignment-1')).resolves.toBeUndefined()
    expect(supabase.from).toHaveBeenCalledWith('table_assignments')
  })

  it('throws when delete fails', async () => {
    mockSupabaseChain({ data: null, error: { message: 'Delete error' } })

    await expect(deleteTableAssignment('assignment-1')).rejects.toThrow(
      'Failed to delete table assignment: Delete error'
    )
  })
})

// ============================================================================
// deleteAllTableAssignments
// ============================================================================

describe('deleteAllTableAssignments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes all assignments for an event', async () => {
    mockSupabaseChain({ data: null, error: null })

    await expect(deleteAllTableAssignments('e1')).resolves.toBeUndefined()
    expect(supabase.from).toHaveBeenCalledWith('table_assignments')
  })

  it('throws when delete fails', async () => {
    mockSupabaseChain({ data: null, error: { message: 'Bulk delete error' } })

    await expect(deleteAllTableAssignments('e1')).rejects.toThrow(
      'Failed to delete all table assignments: Bulk delete error'
    )
  })
})
