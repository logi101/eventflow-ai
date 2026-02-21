import { describe, it, expect } from 'vitest'
import { autoAssignRooms } from './roomAssignmentAlgorithm'
import type {
  AlgoParticipant,
  AlgoRoom,
  AlgoGroup,
  RoomPolicy,
} from './roomAssignmentAlgorithm'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeParticipant(overrides: Partial<AlgoParticipant> & { id: string }): AlgoParticipant {
  return {
    first_name: 'משתתף',
    last_name: 'טסט',
    gender: null,
    has_companion: false,
    companion_name: null,
    companion_phone: null,
    is_vip: false,
    accessibility_needs: null,
    ...overrides,
  }
}

function makeRoom(overrides: Partial<AlgoRoom> & { id: string; room_number: string }): AlgoRoom {
  return {
    building: null,
    floor: null,
    room_type: 'standard',
    bed_configuration: 'double',
    capacity: 2,
    is_available: true,
    ...overrides,
  }
}

const defaultPolicy: RoomPolicy = {
  gender_separation: 'mixed',
  couple_same_room: true,
  vip_priority: true,
  accessible_priority: true,
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('autoAssignRooms', () => {
  it('should return empty results for empty inputs', () => {
    const result = autoAssignRooms([], [], defaultPolicy)
    expect(result.assignments).toHaveLength(0)
    expect(result.conflicts).toHaveLength(0)
    expect(result.stats).toEqual({
      total_participants: 0,
      assigned: 0,
      unassigned: 0,
      rooms_used: 0,
      rooms_available: 0,
    })
  })

  it('should assign 3 participants to 3 single rooms', () => {
    const participants = [
      makeParticipant({ id: '1', first_name: 'דוד', last_name: 'כהן' }),
      makeParticipant({ id: '2', first_name: 'שרה', last_name: 'לוי' }),
      makeParticipant({ id: '3', first_name: 'יוסי', last_name: 'אברהם' }),
    ]
    const rooms = [
      makeRoom({ id: 'r1', room_number: '101', capacity: 1, bed_configuration: 'single' }),
      makeRoom({ id: 'r2', room_number: '102', capacity: 1, bed_configuration: 'single' }),
      makeRoom({ id: 'r3', room_number: '103', capacity: 1, bed_configuration: 'single' }),
    ]

    const result = autoAssignRooms(participants, rooms, defaultPolicy)
    expect(result.stats.assigned).toBe(3)
    expect(result.stats.unassigned).toBe(0)
    expect(result.conflicts).toHaveLength(0)
    expect(result.assignments).toHaveLength(3)
  })

  it('should assign couple to a double room', () => {
    const participants = [
      makeParticipant({
        id: '1',
        first_name: 'אבי',
        last_name: 'מזרחי',
        has_companion: true,
        companion_name: 'רונית מזרחי',
        companion_phone: '0501234567',
      }),
      makeParticipant({ id: '2', first_name: 'נועה', last_name: 'ברק' }),
    ]
    const rooms = [
      makeRoom({ id: 'r1', room_number: '201', bed_configuration: 'double', capacity: 2 }),
      makeRoom({ id: 'r2', room_number: '202', bed_configuration: 'single', capacity: 1 }),
    ]

    const result = autoAssignRooms(participants, rooms, defaultPolicy)
    expect(result.stats.assigned).toBe(2)

    const coupleAssignment = result.assignments.find(a => a.participant_id === '1')
    expect(coupleAssignment).toBeDefined()
    expect(coupleAssignment!.bed_configuration).toBe('double')
    expect(coupleAssignment!.reason).toContain('זוג')

    const singleAssignment = result.assignments.find(a => a.participant_id === '2')
    expect(singleAssignment).toBeDefined()
    expect(singleAssignment!.room_number).toBe('202')
  })

  it('should assign VIP to vip/suite room first', () => {
    const participants = [
      makeParticipant({ id: '1', first_name: 'רותם', last_name: 'שלום', is_vip: true }),
      makeParticipant({ id: '2', first_name: 'גלית', last_name: 'דהן' }),
    ]
    const rooms = [
      makeRoom({ id: 'r1', room_number: '301', room_type: 'standard', capacity: 1, bed_configuration: 'single' }),
      makeRoom({ id: 'r2', room_number: '302', room_type: 'vip', capacity: 1, bed_configuration: 'single' }),
    ]

    const result = autoAssignRooms(participants, rooms, defaultPolicy)
    const vipAssignment = result.assignments.find(a => a.participant_id === '1')
    expect(vipAssignment).toBeDefined()
    expect(vipAssignment!.room_type).toBe('vip')
    expect(vipAssignment!.reason).toContain('VIP')
  })

  it('should assign accessibility participant to accessible room', () => {
    const participants = [
      makeParticipant({ id: '1', first_name: 'מיכל', last_name: 'רוזן', accessibility_needs: 'כיסא גלגלים' }),
      makeParticipant({ id: '2', first_name: 'עומר', last_name: 'פרץ' }),
    ]
    const rooms = [
      makeRoom({ id: 'r1', room_number: '100', room_type: 'standard', capacity: 1, bed_configuration: 'single' }),
      makeRoom({ id: 'r2', room_number: '101', room_type: 'accessible', capacity: 1, bed_configuration: 'single' }),
    ]

    const result = autoAssignRooms(participants, rooms, defaultPolicy)
    const accessAssignment = result.assignments.find(a => a.participant_id === '1')
    expect(accessAssignment).toBeDefined()
    expect(accessAssignment!.room_type).toBe('accessible')
    expect(accessAssignment!.reason).toContain('נגישות')
  })

  it('should enforce full gender separation', () => {
    const policy: RoomPolicy = { ...defaultPolicy, gender_separation: 'full_separation' }
    const participants = [
      makeParticipant({ id: '1', first_name: 'יעל', last_name: 'כהן', gender: 'female' }),
      makeParticipant({ id: '2', first_name: 'דן', last_name: 'לוי', gender: 'male' }),
      makeParticipant({ id: '3', first_name: 'רינת', last_name: 'שמש', gender: 'female' }),
      makeParticipant({ id: '4', first_name: 'אורי', last_name: 'גולן', gender: 'male' }),
    ]
    const rooms = [
      makeRoom({ id: 'r1', room_number: '401', capacity: 2 }),
      makeRoom({ id: 'r2', room_number: '402', capacity: 2 }),
    ]

    const result = autoAssignRooms(participants, rooms, policy)
    expect(result.stats.assigned).toBe(4)
    expect(result.conflicts).toHaveLength(0)

    // Check that no room has mixed genders
    const roomMap = new Map<string, string[]>()
    for (const a of result.assignments) {
      const genders = roomMap.get(a.room_number) ?? []
      const p = participants.find(p => p.id === a.participant_id)!
      genders.push(p.gender!)
      roomMap.set(a.room_number, genders)
    }
    for (const [, genders] of roomMap) {
      const unique = [...new Set(genders)]
      expect(unique).toHaveLength(1)
    }
  })

  it('should prefer adjacent rooms for group members', () => {
    const participants = [
      makeParticipant({ id: '1', first_name: 'טל', last_name: 'אלון' }),
      makeParticipant({ id: '2', first_name: 'ליאור', last_name: 'בר' }),
      makeParticipant({ id: '3', first_name: 'שחר', last_name: 'גל' }),
    ]
    const rooms = [
      makeRoom({ id: 'r1', room_number: '501', building: 'A', floor: '1', capacity: 1, bed_configuration: 'single' }),
      makeRoom({ id: 'r2', room_number: '502', building: 'A', floor: '1', capacity: 1, bed_configuration: 'single' }),
      makeRoom({ id: 'r3', room_number: '601', building: 'B', floor: '2', capacity: 1, bed_configuration: 'single' }),
    ]
    const groups: AlgoGroup[] = [
      { id: 'g1', prefer_same_room: false, prefer_adjacent: true, participant_ids: ['1', '2'] },
    ]

    const result = autoAssignRooms(participants, rooms, defaultPolicy, groups)
    expect(result.stats.assigned).toBe(3)

    const a1 = result.assignments.find(a => a.participant_id === '1')!
    const a2 = result.assignments.find(a => a.participant_id === '2')!
    expect(a1.building).toBe(a2.building)
  })

  it('should report insufficient rooms conflict', () => {
    const participants = [
      makeParticipant({ id: '1', first_name: 'אלי', last_name: 'זהבי' }),
      makeParticipant({ id: '2', first_name: 'מאיה', last_name: 'חדד' }),
      makeParticipant({ id: '3', first_name: 'עידן', last_name: 'נוי' }),
    ]
    const rooms = [
      makeRoom({ id: 'r1', room_number: '101', capacity: 1, bed_configuration: 'single' }),
    ]

    const result = autoAssignRooms(participants, rooms, defaultPolicy)
    expect(result.stats.assigned).toBe(1)
    expect(result.stats.unassigned).toBe(2)
    expect(result.conflicts.some(c => c.type === 'insufficient_rooms')).toBe(true)
  })

  it('should handle mixed policy: couple + VIP + accessibility + gender separation', () => {
    const policy: RoomPolicy = {
      gender_separation: 'full_separation',
      couple_same_room: true,
      vip_priority: true,
      accessible_priority: true,
    }
    const participants = [
      makeParticipant({
        id: '1', first_name: 'רון', last_name: 'אדלר', gender: 'male',
        is_vip: true, has_companion: true, companion_name: 'דנה אדלר',
      }),
      makeParticipant({
        id: '2', first_name: 'חנה', last_name: 'פלד', gender: 'female',
        accessibility_needs: 'הליכון',
      }),
      makeParticipant({ id: '3', first_name: 'משה', last_name: 'ביטון', gender: 'male' }),
      makeParticipant({ id: '4', first_name: 'לינוי', last_name: 'סער', gender: 'female' }),
    ]
    const rooms = [
      makeRoom({ id: 'r1', room_number: 'A1', room_type: 'accessible', capacity: 1, bed_configuration: 'single' }),
      makeRoom({ id: 'r2', room_number: 'A2', room_type: 'vip', bed_configuration: 'double', capacity: 2 }),
      makeRoom({ id: 'r3', room_number: 'A3', room_type: 'standard', capacity: 2 }),
      makeRoom({ id: 'r4', room_number: 'A4', room_type: 'standard', capacity: 1, bed_configuration: 'single' }),
    ]

    const result = autoAssignRooms(participants, rooms, policy)

    // Accessibility participant gets accessible room
    const accessA = result.assignments.find(a => a.participant_id === '2')
    expect(accessA).toBeDefined()
    expect(accessA!.room_type).toBe('accessible')

    // VIP couple gets VIP double room
    const vipA = result.assignments.find(a => a.participant_id === '1')
    expect(vipA).toBeDefined()
    expect(vipA!.room_type).toBe('vip')

    // All participants assigned
    expect(result.stats.assigned).toBe(4)
  })

  it('should skip unavailable rooms', () => {
    const participants = [
      makeParticipant({ id: '1', first_name: 'תמר', last_name: 'עוז' }),
    ]
    const rooms = [
      makeRoom({ id: 'r1', room_number: '101', capacity: 1, bed_configuration: 'single', is_available: false }),
      makeRoom({ id: 'r2', room_number: '102', capacity: 1, bed_configuration: 'single', is_available: true }),
    ]

    const result = autoAssignRooms(participants, rooms, defaultPolicy)
    expect(result.stats.assigned).toBe(1)
    expect(result.assignments[0].room_number).toBe('102')
  })

  it('should report accessibility conflict when no accessible room is available', () => {
    const participants = [
      makeParticipant({ id: '1', first_name: 'עדי', last_name: 'קרן', accessibility_needs: 'כיסא גלגלים' }),
    ]
    const rooms = [
      makeRoom({ id: 'r1', room_number: '101', room_type: 'standard', capacity: 1, bed_configuration: 'single' }),
    ]

    const result = autoAssignRooms(participants, rooms, defaultPolicy)
    expect(result.conflicts.some(c => c.type === 'accessibility_unmet')).toBe(true)
  })
})
