import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { groupIssuesBySeverity, runSimulation } from './simulationEngine'
import type { SimulationIssue, SimulationInput, ScheduleData } from '../types'

// Mock the data fetcher
vi.mock('./dataFetcher', () => ({
  fetchSimulationData: vi.fn(),
}))

// Mock all validators
vi.mock('./validators', () => ({
  validateRoomConflicts: vi.fn().mockReturnValue([]),
  validateSpeakerOverlaps: vi.fn().mockReturnValue([]),
  validateCapacity: vi.fn().mockReturnValue([]),
  validateTransitionTimes: vi.fn().mockReturnValue([]),
  validateEquipment: vi.fn().mockReturnValue([]),
  validateVIPSchedule: vi.fn().mockReturnValue([]),
  validateCateringGaps: vi.fn().mockReturnValue([]),
  validateBackToBack: vi.fn().mockReturnValue([]),
}))

const { fetchSimulationData } = await import('./dataFetcher')
const {
  validateRoomConflicts,
  validateSpeakerOverlaps,
  validateCapacity,
} = await import('./validators')

// ============================================================================
// Test data factories
// ============================================================================

function makeIssue(overrides: Partial<SimulationIssue> = {}): SimulationIssue {
  return {
    id: 'test-issue-1',
    severity: 'warning',
    category: 'room',
    title: 'Test issue',
    description: 'Test description',
    affectedEntities: {},
    ...overrides,
  }
}

function makeEmptySimulationInput(eventId: string): SimulationInput {
  return {
    event_id: eventId,
    schedules: [],
    participantSchedules: [],
    vendors: [],
    equipment: [],
  }
}

const mockSupabase = {} as SupabaseClient

// ============================================================================
// groupIssuesBySeverity (pure function)
// ============================================================================

describe('groupIssuesBySeverity', () => {
  it('groups issues by severity level', () => {
    const issues: SimulationIssue[] = [
      makeIssue({ id: 'c1', severity: 'critical', category: 'room' }),
      makeIssue({ id: 'w1', severity: 'warning', category: 'speaker' }),
      makeIssue({ id: 'i1', severity: 'info', category: 'capacity' }),
      makeIssue({ id: 'c2', severity: 'critical', category: 'speaker' }),
      makeIssue({ id: 'w2', severity: 'warning', category: 'timing' }),
    ]

    const grouped = groupIssuesBySeverity(issues)

    expect(grouped.critical).toHaveLength(2)
    expect(grouped.warning).toHaveLength(2)
    expect(grouped.info).toHaveLength(1)
  })

  it('returns empty arrays when no issues exist', () => {
    const grouped = groupIssuesBySeverity([])

    expect(grouped.critical).toEqual([])
    expect(grouped.warning).toEqual([])
    expect(grouped.info).toEqual([])
  })

  it('handles all-critical issues', () => {
    const issues = [
      makeIssue({ id: 'c1', severity: 'critical' }),
      makeIssue({ id: 'c2', severity: 'critical' }),
    ]

    const grouped = groupIssuesBySeverity(issues)

    expect(grouped.critical).toHaveLength(2)
    expect(grouped.warning).toHaveLength(0)
    expect(grouped.info).toHaveLength(0)
  })

  it('preserves issue data in grouped output', () => {
    const issue = makeIssue({
      id: 'unique-id',
      severity: 'warning',
      title: 'Specific title',
      description: 'Specific description',
    })

    const grouped = groupIssuesBySeverity([issue])

    expect(grouped.warning[0]).toBe(issue)
    expect(grouped.warning[0].title).toBe('Specific title')
  })
})

// ============================================================================
// runSimulation
// ============================================================================

describe('runSimulation', () => {
  it('returns a result with zero issues when all validators pass', async () => {
    vi.mocked(fetchSimulationData).mockResolvedValue(makeEmptySimulationInput('event-1'))

    const result = await runSimulation(mockSupabase, 'event-1')

    expect(result.event_id).toBe('event-1')
    expect(result.total_issues).toBe(0)
    expect(result.critical).toBe(0)
    expect(result.warnings).toBe(0)
    expect(result.info).toBe(0)
    expect(result.issues).toEqual([])
    expect(result.run_at).toBeDefined()
    expect(result.duration_ms).toBeGreaterThanOrEqual(0)
  })

  it('aggregates issues from multiple validators', async () => {
    vi.mocked(fetchSimulationData).mockResolvedValue(makeEmptySimulationInput('event-2'))
    vi.mocked(validateRoomConflicts).mockReturnValue([
      makeIssue({ id: 'room-1', severity: 'critical', category: 'room' }),
    ])
    vi.mocked(validateSpeakerOverlaps).mockReturnValue([
      makeIssue({ id: 'speaker-1', severity: 'warning', category: 'speaker' }),
    ])
    vi.mocked(validateCapacity).mockReturnValue([
      makeIssue({ id: 'cap-1', severity: 'info', category: 'capacity' }),
    ])

    const result = await runSimulation(mockSupabase, 'event-2')

    expect(result.total_issues).toBe(3)
    expect(result.critical).toBe(1)
    expect(result.warnings).toBe(1)
    expect(result.info).toBe(1)

    // Reset mocks
    vi.mocked(validateRoomConflicts).mockReturnValue([])
    vi.mocked(validateSpeakerOverlaps).mockReturnValue([])
    vi.mocked(validateCapacity).mockReturnValue([])
  })

  it('sorts issues by severity (critical first), then category, then id', async () => {
    vi.mocked(fetchSimulationData).mockResolvedValue(makeEmptySimulationInput('event-3'))
    vi.mocked(validateRoomConflicts).mockReturnValue([
      makeIssue({ id: 'z-room', severity: 'warning', category: 'room' }),
      makeIssue({ id: 'a-room', severity: 'critical', category: 'room' }),
    ])
    vi.mocked(validateSpeakerOverlaps).mockReturnValue([
      makeIssue({ id: 'b-speaker', severity: 'critical', category: 'speaker' }),
    ])
    vi.mocked(validateCapacity).mockReturnValue([
      makeIssue({ id: 'c-info', severity: 'info', category: 'capacity' }),
    ])

    const result = await runSimulation(mockSupabase, 'event-3')

    // Critical issues first (room before speaker in category order)
    expect(result.issues[0].id).toBe('a-room') // critical + room
    expect(result.issues[1].id).toBe('b-speaker') // critical + speaker
    expect(result.issues[2].id).toBe('z-room') // warning + room
    expect(result.issues[3].id).toBe('c-info') // info + capacity

    // Reset mocks
    vi.mocked(validateRoomConflicts).mockReturnValue([])
    vi.mocked(validateSpeakerOverlaps).mockReturnValue([])
    vi.mocked(validateCapacity).mockReturnValue([])
  })

  it('includes duration_ms in result', async () => {
    vi.mocked(fetchSimulationData).mockResolvedValue(makeEmptySimulationInput('event-4'))

    const result = await runSimulation(mockSupabase, 'event-4')

    expect(typeof result.duration_ms).toBe('number')
    expect(result.duration_ms).toBeGreaterThanOrEqual(0)
  })

  it('includes ISO datetime in run_at field', async () => {
    vi.mocked(fetchSimulationData).mockResolvedValue(makeEmptySimulationInput('event-5'))

    const result = await runSimulation(mockSupabase, 'event-5')

    // Verify it's a valid ISO datetime
    const parsed = new Date(result.run_at)
    expect(parsed.getTime()).not.toBeNaN()
  })

  it('calls fetchSimulationData with correct arguments', async () => {
    vi.mocked(fetchSimulationData).mockResolvedValue(makeEmptySimulationInput('event-6'))

    await runSimulation(mockSupabase, 'event-6')

    expect(fetchSimulationData).toHaveBeenCalledWith(mockSupabase, 'event-6')
  })

  it('passes correct data to validators', async () => {
    const schedules: ScheduleData[] = [
      {
        id: 's1',
        event_id: 'event-7',
        title: 'Session 1',
        start_time: '2026-02-01T09:00:00Z',
        end_time: '2026-02-01T10:00:00Z',
        room_id: 'r1',
        room_name: 'Hall A',
        room_capacity: 100,
        speaker_id: 'sp1',
        speaker_name: 'Speaker One',
        backup_speaker_id: null,
        session_type: 'lecture',
        expected_attendance: 80,
        equipment_required: ['projector'],
      },
    ]

    const input: SimulationInput = {
      event_id: 'event-7',
      schedules,
      participantSchedules: [],
      vendors: [],
      equipment: [{ schedule_id: 's1', required: ['projector'], assigned: [] }],
    }

    vi.mocked(fetchSimulationData).mockResolvedValue(input)

    await runSimulation(mockSupabase, 'event-7')

    // Validators should receive the correct data
    expect(validateRoomConflicts).toHaveBeenCalledWith(schedules)
    expect(validateSpeakerOverlaps).toHaveBeenCalledWith(schedules)
    expect(validateCapacity).toHaveBeenCalledWith(schedules)
  })
})
