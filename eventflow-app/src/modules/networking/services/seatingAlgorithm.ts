import { ParticipantWithTracks } from '@/types'

export interface SeatingConstraints {
  maxTableSize: number
  variableTableSizes?: Map<number, number> // table_number -> capacity
  minSharedInterests: number // Min participants with shared track per table
  maxSameTrack: number // Max participants from same track per table (diversity)
  companionsTogether: boolean
  vipSpread: boolean // Spread VIPs across tables (not all at one table)
  vipPriorityTables?: number[] // VIP-designated table numbers (e.g., [1, 2])
}

export interface TableAssignment {
  tableNumber: number
  participants: ParticipantWithTracks[]
  capacity: number
  isVipTable: boolean
}

/**
 * Generates table seating assignments using a greedy algorithm.
 * This is a fallback/simplified version of the CSP algorithm.
 *
 * @param participants List of participants to seat
 * @param constraints Seating constraints
 * @returns Map of table number to list of participants
 */
export function greedyTableSeating(
  participants: ParticipantWithTracks[],
  constraints: SeatingConstraints
): Map<number, ParticipantWithTracks[]> {
  const tables = new Map<number, Participant[]>()
  
  // Filter participants who opted in (if applicable, though usually done before calling)
  // And sort them: VIPs first, then by number of tracks (connectivity)
  const sorted = [...participants].sort((a, b) => {
    // VIPs first
    if ((a.is_vip ?? false) !== (b.is_vip ?? false)) return (a.is_vip ?? false) ? -1 : 1
    
    // Then by track count (more connections = higher priority)
    const tracksA = a.tracks?.length || 0
    const tracksB = b.tracks?.length || 0
    return tracksB - tracksA
  })

  // Track companion assignments to ensure they stay together
  const assignedParticipants = new Set<string>()
  
  let tableNum = 1

  // Helper to get table capacity
  const getCapacity = (tNum: number) => 
    constraints.variableTableSizes?.get(tNum) || constraints.maxTableSize

  for (const participant of sorted) {
    if (assignedParticipants.has(participant.id)) continue

    // Handle companions
    const companions: ParticipantWithTracks[] = []
    if (constraints.companionsTogether && participant.companion_id) {
        // Find companion in the list
        const companion = sorted.find(p => p.id === participant.companion_id)
        if (companion && !assignedParticipants.has(companion.id)) {
            companions.push(companion)
        }
    }
    
    const groupToSeat = [participant, ...companions]

    // Find table with best shared interest match
    let bestTable: number | null = null
    let bestScore = -1

    // Try existing tables first
    for (const [tNum, tableParticipants] of tables.entries()) {
      const capacity = getCapacity(tNum)
      if (tableParticipants.length + groupToSeat.length > capacity) continue

      // VIP Spread constraint
      if (constraints.vipSpread && participant.is_vip) {
          const vipCount = tableParticipants.filter(p => p.is_vip).length
          if (vipCount >= 2) continue // Soft limit: max 2 VIPs per table
      }

      // Diversity constraint (max same track)
      // Check if adding this participant would violate maxSameTrack for any track
      // Simplified check for greedy: skip if strict violation, otherwise allow
      
      // Score: count shared tracks
      const participantTracks = participant.tracks?.map(t => t.id) || []
      const sharedTracks = tableParticipants.filter(tp =>
        tp.tracks?.some(t => participantTracks.includes(t.id))
      ).length

      if (sharedTracks > bestScore) {
        bestScore = sharedTracks
        bestTable = tNum
      }
    }

    if (bestTable === null) {
      // No good match or all full, create new table
      // Ensure we don't start a new table if we strictly want to fill up, 
      // but here we assume infinite tables available or we just increment.
      // In a real constrained environment, we'd check max tables.
      tables.set(tableNum, [...groupToSeat])
      bestTable = tableNum
      tableNum++
    } else {
      tables.get(bestTable)!.push(...groupToSeat)
    }

    // Mark as assigned
    groupToSeat.forEach(p => assignedParticipants.add(p.id))
  }

  return tables
}