export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'
export type GenderSeparationPolicy = 'mixed' | 'full_separation' | 'male_separate' | 'female_separate'
export type RoomType = 'standard' | 'suite' | 'accessible' | 'vip'
export type BedConfiguration = 'single' | 'double' | 'twin' | 'king'

export interface AlgoParticipant {
  id: string
  first_name: string
  last_name: string
  gender: Gender | null
  has_companion: boolean
  companion_name: string | null
  companion_phone: string | null
  is_vip: boolean
  accessibility_needs: string | null
  group_id?: string
}

export interface AlgoRoom {
  id: string
  room_number: string
  building: string | null
  floor: string | null
  room_type: RoomType
  bed_configuration: BedConfiguration
  capacity: number
  is_available: boolean
}

export interface AlgoGroup {
  id: string
  prefer_same_room: boolean
  prefer_adjacent: boolean
  participant_ids: string[]
}

export interface RoomPolicy {
  gender_separation: GenderSeparationPolicy
  couple_same_room: boolean
  vip_priority: boolean
  accessible_priority: boolean
}

export interface AssignmentSuggestion {
  participant_id: string
  participant_name: string
  room_number: string
  building: string | null
  floor: string | null
  room_type: RoomType
  bed_configuration: BedConfiguration
  roommate_participant_id: string | null
  roommate_name: string | null
  assigned_by: 'auto'
  reason: string
}

export interface AssignmentConflict {
  type: 'insufficient_rooms' | 'gender_violation' | 'accessibility_unmet' | 'vip_unmet' | 'couple_separated'
  severity: 'warning' | 'error'
  message: string
  participant_ids: string[]
}

export interface AssignmentResult {
  assignments: AssignmentSuggestion[]
  conflicts: AssignmentConflict[]
  stats: {
    total_participants: number
    assigned: number
    unassigned: number
    rooms_used: number
    rooms_available: number
  }
}

interface RoomState {
  room: AlgoRoom
  occupants: AlgoParticipant[]
  genderLocked: Gender | null
}

export function autoAssignRooms(
  participants: AlgoParticipant[],
  rooms: AlgoRoom[],
  policy: RoomPolicy,
  groups: AlgoGroup[] = [],
): AssignmentResult {
  const conflicts: AssignmentConflict[] = []
  const roomStates: RoomState[] = rooms
    .filter(r => r.is_available)
    .map(r => ({ room: r, occupants: [], genderLocked: null }))

  function findBestRoom(opts: {
    needsAccessible?: boolean
    needsVip?: boolean
    bedConfig?: BedConfiguration[]
    forGender?: Gender | null
    forCapacity?: number
    preferBuilding?: string | null
    preferFloor?: string | null
  }): RoomState | null {
    const candidates = roomStates.filter(rs => {
      if (rs.occupants.length >= rs.room.capacity) return false
      if (policy.gender_separation !== 'mixed' && opts.forGender && opts.forGender !== 'other' && opts.forGender !== 'prefer_not_to_say') {
        if (rs.genderLocked && rs.genderLocked !== opts.forGender) return false
      }
      if (opts.needsAccessible && rs.room.room_type !== 'accessible') return false
      if (opts.needsVip && rs.room.room_type !== 'vip' && rs.room.room_type !== 'suite') return false
      if (opts.forCapacity && (rs.room.capacity - rs.occupants.length) < opts.forCapacity) return false
      return true
    })

    if (candidates.length === 0) return null

    candidates.sort((a, b) => {
      const aProximity = (opts.preferBuilding && a.room.building === opts.preferBuilding ? 1 : 0) +
                        (opts.preferFloor && a.room.floor === opts.preferFloor ? 0.5 : 0)
      const bProximity = (opts.preferBuilding && b.room.building === opts.preferBuilding ? 1 : 0) +
                        (opts.preferFloor && b.room.floor === opts.preferFloor ? 0.5 : 0)
      if (aProximity !== bProximity) return bProximity - aProximity

      const aFill = a.occupants.length / a.room.capacity
      const bFill = b.occupants.length / b.room.capacity
      if (Math.abs(aFill - bFill) > 0.1) return bFill - aFill

      if (opts.bedConfig) {
        const aIdx = opts.bedConfig.indexOf(a.room.bed_configuration)
        const bIdx = opts.bedConfig.indexOf(b.room.bed_configuration)
        const aScore = aIdx === -1 ? 999 : aIdx
        const bScore = bIdx === -1 ? 999 : bIdx
        return aScore - bScore
      }
      return 0
    })

    return candidates[0]
  }

  function assignToRoom(participant: AlgoParticipant, roomState: RoomState, reason: string): AssignmentSuggestion {
    roomState.occupants.push(participant)
    if (policy.gender_separation !== 'mixed' && participant.gender && participant.gender !== 'other' && participant.gender !== 'prefer_not_to_say') {
      if (!roomState.genderLocked) roomState.genderLocked = participant.gender
    }
    const roommate = roomState.occupants.find(o => o.id !== participant.id) ?? null
    return {
      participant_id: participant.id,
      participant_name: `${participant.first_name} ${participant.last_name}`,
      room_number: roomState.room.room_number,
      building: roomState.room.building,
      floor: roomState.room.floor,
      room_type: roomState.room.room_type,
      bed_configuration: roomState.room.bed_configuration,
      roommate_participant_id: roommate?.id ?? null,
      roommate_name: roommate ? `${roommate.first_name} ${roommate.last_name}` : null,
      assigned_by: 'auto',
      reason,
    }
  }

  const assignments: AssignmentSuggestion[] = []
  const assigned = new Set<string>()

  // STEP 0: Sort participants by priority
  const sorted = [...participants].sort((a, b) => {
    if (!!a.accessibility_needs !== !!b.accessibility_needs) return a.accessibility_needs ? -1 : 1
    if (a.is_vip !== b.is_vip) return a.is_vip ? -1 : 1
    if (a.has_companion !== b.has_companion) return a.has_companion ? -1 : 1
    return 0
  })

  // STEP 1: Accessibility participants
  for (const p of sorted.filter(p => p.accessibility_needs)) {
    if (assigned.has(p.id)) continue
    const room = findBestRoom({ needsAccessible: true, forGender: p.gender })
    if (room) {
      assignments.push(assignToRoom(p, room, 'צרכי נגישות — חדר נגיש'))
      assigned.add(p.id)
    } else {
      conflicts.push({
        type: 'accessibility_unmet',
        severity: 'error',
        message: `אין חדר נגיש זמין עבור ${p.first_name} ${p.last_name}`,
        participant_ids: [p.id],
      })
    }
  }

  // STEP 2: Couples / companions
  if (policy.couple_same_room) {
    for (const p of sorted.filter(p => p.has_companion && !assigned.has(p.id))) {
      if (assigned.has(p.id)) continue
      const room = findBestRoom({
        bedConfig: ['double', 'king', 'twin'],
        needsVip: p.is_vip,
        forGender: policy.gender_separation === 'full_separation' ? p.gender : null,
        forCapacity: 2,
        needsAccessible: !!p.accessibility_needs,
      })
      if (room) {
        assignments.push(assignToRoom(p, room, 'זוג — חדר double'))
        assigned.add(p.id)
        if (room.room.capacity <= 2) {
          room.occupants.push({ id: `companion-${p.id}`, first_name: p.companion_name ?? 'מלווה', last_name: '', gender: null, has_companion: false, companion_name: null, companion_phone: null, is_vip: false, accessibility_needs: null })
        }
      } else {
        conflicts.push({
          type: 'couple_separated',
          severity: 'warning',
          message: `לא נמצא חדר double עבור ${p.first_name} ${p.last_name} ובן/בת הזוג`,
          participant_ids: [p.id],
        })
      }
    }
  }

  // STEP 3: Groups
  for (const group of groups) {
    const members = group.participant_ids
      .map(id => sorted.find(p => p.id === id))
      .filter((p): p is AlgoParticipant => !!p && !assigned.has(p.id))

    if (members.length === 0) continue

    if (group.prefer_same_room) {
      const room = findBestRoom({ forCapacity: members.length })
      if (room) {
        for (const m of members) {
          assignments.push(assignToRoom(m, room, 'קבוצה — חדר משותף'))
          assigned.add(m.id)
        }
      }
    }

    if (group.prefer_adjacent) {
      const firstAssigned = members.find(m => assigned.has(m.id))
      const refAssignment = assignments.find(a => a.participant_id === firstAssigned?.id)
      for (const m of members) {
        if (assigned.has(m.id)) continue
        const room = findBestRoom({
          forGender: m.gender,
          preferBuilding: refAssignment?.building,
          preferFloor: refAssignment?.floor,
        })
        if (room) {
          assignments.push(assignToRoom(m, room, 'קבוצה — חדרים סמוכים'))
          assigned.add(m.id)
        }
      }
    }
  }

  // STEP 4: VIP participants
  if (policy.vip_priority) {
    for (const p of sorted.filter(p => p.is_vip && !assigned.has(p.id))) {
      const room = findBestRoom({ needsVip: true, forGender: p.gender })
      if (room) {
        assignments.push(assignToRoom(p, room, 'VIP — חדר vip/suite'))
        assigned.add(p.id)
      } else {
        conflicts.push({
          type: 'vip_unmet',
          severity: 'warning',
          message: `אין חדר VIP/suite זמין עבור ${p.first_name} ${p.last_name} — יוקצה חדר רגיל`,
          participant_ids: [p.id],
        })
      }
    }
  }

  // STEP 5: Remaining participants (gender-aware)
  for (const p of sorted.filter(p => !assigned.has(p.id))) {
    let forGender: Gender | null = null
    if (policy.gender_separation === 'full_separation') forGender = p.gender
    else if (policy.gender_separation === 'male_separate' && p.gender === 'male') forGender = 'male'
    else if (policy.gender_separation === 'female_separate' && p.gender === 'female') forGender = 'female'

    const room = findBestRoom({ forGender, bedConfig: ['double', 'twin', 'single', 'king'] })
    if (room) {
      assignments.push(assignToRoom(p, room, 'שיבוץ כללי'))
      assigned.add(p.id)
    }
  }

  // STEP 6: Unassigned conflict
  const unassigned = sorted.filter(p => !assigned.has(p.id))
  if (unassigned.length > 0) {
    conflicts.push({
      type: 'insufficient_rooms',
      severity: 'error',
      message: `${unassigned.length} משתתפים לא שובצו — אין מספיק חדרים זמינים`,
      participant_ids: unassigned.map(p => p.id),
    })
  }

  const roomsUsed = roomStates.filter(rs => rs.occupants.filter(o => !o.id.startsWith('companion-')).length > 0).length

  return {
    assignments,
    conflicts,
    stats: {
      total_participants: participants.length,
      assigned: assigned.size,
      unassigned: unassigned.length,
      rooms_used: roomsUsed,
      rooms_available: roomStates.length,
    },
  }
}
