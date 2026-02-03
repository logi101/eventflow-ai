/**
 * Seating Algorithm
 *
 * אלגוריתם חכם לשיבוץ משתתפים לשולחנות
 * Based on shared interests, VIP spread, companion grouping, and diversity
 */

import type { SeatingConstraints, SeatingParticipant } from '../types'

/**
 * ניקוד שולחן לפי עניינים משותפים
 */
interface TableScore {
  tableNumber: number
  score: number
  vipCount: number
  size: number
  trackCounts: Map<string, number>
}

/**
 * יצור שיבוץ חכם לשולחנות
 *
 * @param participants - רשימת משתתפים
 * @param constraints - אילוצים לאלגוריתם
 * @returns מיפוי של מספר שולחן למשתתפים
 */
export function generateTableSeating(
  participants: SeatingParticipant[],
  constraints: SeatingConstraints
): Map<number, SeatingParticipant[]> {
  // Filter to only participants who opted in to networking
  const optedInParticipants = participants.filter((p) => p.networking_opt_in)

  if (optedInParticipants.length === 0) {
    return new Map()
  }

  // Use greedy algorithm
  return greedyTableSeating(optedInParticipants, constraints)
}

/**
 * אלגוריתם גרידי לשיבוץ שולחנות
 * Greedy algorithm: Sort by priority, assign to best table
 */
export function greedyTableSeating(
  participants: SeatingParticipant[],
  constraints: SeatingConstraints
): Map<number, SeatingParticipant[]> {
  const tables = new Map<number, SeatingParticipant[]>()
  const tableScores = new Map<number, TableScore>()
  const assignedParticipants = new Set<string>()

  // Group participants by companion relationships
  const companionGroups = groupCompanions(participants)

  // Sort participants: VIPs first, then by track count (more tracks = more connection potential)
  const sortedGroups = companionGroups.sort((a, b) => {
    const aHasVip = a.some((p) => p.is_vip)
    const bHasVip = b.some((p) => p.is_vip)

    if (aHasVip !== bHasVip) {
      return aHasVip ? -1 : 1
    }

    const aMaxTracks = Math.max(...a.map((p) => p.tracks.length))
    const bMaxTracks = Math.max(...b.map((p) => p.tracks.length))

    return bMaxTracks - aMaxTracks
  })

  let nextTableNumber = 1

  // Process each companion group
  for (const group of sortedGroups) {
    // Skip if already assigned (shouldn't happen, but safety check)
    if (group.some((p) => assignedParticipants.has(p.id))) {
      continue
    }

    // Find best table for this group
    const bestTable = findBestTableForGroup(
      group,
      tables,
      tableScores,
      constraints
    )

    if (bestTable === null) {
      // Create new table
      const newTableNumber = nextTableNumber++

      tables.set(newTableNumber, [...group])
      tableScores.set(newTableNumber, {
        tableNumber: newTableNumber,
        score: 0,
        vipCount: group.filter((p) => p.is_vip).length,
        size: group.length,
        trackCounts: calculateTrackCounts(group),
      })

      group.forEach((p) => assignedParticipants.add(p.id))
    } else {
      // Add to existing table
      const existingParticipants = tables.get(bestTable)!
      tables.set(bestTable, [...existingParticipants, ...group])

      // Update score
      const score = tableScores.get(bestTable)!
      score.vipCount += group.filter((p) => p.is_vip).length
      score.size += group.length
      score.trackCounts = calculateTrackCounts([
        ...existingParticipants,
        ...group,
      ])

      group.forEach((p) => assignedParticipants.add(p.id))
    }
  }

  return tables
}

/**
 * קבץ משתתפים לפי קשרי מלווים
 * Groups companions together
 */
function groupCompanions(
  participants: SeatingParticipant[]
): SeatingParticipant[][] {
  const groups: SeatingParticipant[][] = []
  const processed = new Set<string>()

  for (const participant of participants) {
    if (processed.has(participant.id)) {
      continue
    }

    // Find all companions in this group
    const group: SeatingParticipant[] = [participant]
    processed.add(participant.id)

    if (participant.companion_id) {
      const companion = participants.find(
        (p) => p.id === participant.companion_id
      )
      if (companion && !processed.has(companion.id)) {
        group.push(companion)
        processed.add(companion.id)
      }
    }

    // Check if this participant is someone else's companion
    const reverseCompanion = participants.find(
      (p) => p.companion_id === participant.id && !processed.has(p.id)
    )
    if (reverseCompanion) {
      group.push(reverseCompanion)
      processed.add(reverseCompanion.id)
    }

    groups.push(group)
  }

  return groups
}

/**
 * מצא את השולחן הטוב ביותר עבור קבוצת משתתפים
 */
function findBestTableForGroup(
  group: SeatingParticipant[],
  tables: Map<number, SeatingParticipant[]>,
  tableScores: Map<number, TableScore>,
  constraints: SeatingConstraints
): number | null {
  let bestTable: number | null = null
  let bestScore = -Infinity

  for (const [tableNumber, tableParticipants] of tables) {
    const score = tableScores.get(tableNumber)!
    const capacity = getTableCapacity(tableNumber, constraints)

    // Check if group fits
    if (score.size + group.length > capacity) {
      continue
    }

    // Check VIP spread constraint
    if (constraints.vipSpread) {
      const groupVipCount = group.filter((p) => p.is_vip).length
      if (score.vipCount + groupVipCount > 2) {
        continue
      }
    }

    // Check diversity constraint (maxSameTrack)
    if (!checkDiversityConstraint(group, tableParticipants, score, constraints)) {
      continue
    }

    // Calculate shared interests score
    const sharedScore = calculateSharedInterestsScore(group, tableParticipants)

    // VIP priority tables bonus
    let tableScore = sharedScore
    if (
      constraints.vipPriorityTables &&
      constraints.vipPriorityTables.includes(tableNumber) &&
      group.some((p) => p.is_vip)
    ) {
      tableScore += 10 // Bonus for VIP priority tables
    }

    if (tableScore > bestScore) {
      bestScore = tableScore
      bestTable = tableNumber
    }
  }

  // If no existing table works and we should create a new one
  if (bestTable === null && tables.size === 0) {
    return null // Signal to create first table
  }

  // Check if creating a new table makes more sense
  if (bestScore < constraints.minSharedInterests && tables.size > 0) {
    return null // Signal to create new table
  }

  return bestTable
}

/**
 * בדוק אילוץ גיוון - מקסימום משתתפים מאותו מסלול
 */
function checkDiversityConstraint(
  group: SeatingParticipant[],
  _tableParticipants: SeatingParticipant[],
  score: TableScore,
  constraints: SeatingConstraints
): boolean {
  const newTrackCounts = new Map(score.trackCounts)

  // Add group's tracks to counts
  for (const participant of group) {
    for (const track of participant.tracks) {
      const current = newTrackCounts.get(track) || 0
      newTrackCounts.set(track, current + 1)
    }
  }

  // Check if any track exceeds maxSameTrack
  for (const count of newTrackCounts.values()) {
    if (count > constraints.maxSameTrack) {
      return false
    }
  }

  return true
}

/**
 * חשב ניקוד עניינים משותפים
 */
function calculateSharedInterestsScore(
  group: SeatingParticipant[],
  tableParticipants: SeatingParticipant[]
): number {
  let score = 0

  for (const newParticipant of group) {
    for (const existingParticipant of tableParticipants) {
      const sharedTracks = newParticipant.tracks.filter((track) =>
        existingParticipant.tracks.includes(track)
      )
      score += sharedTracks.length
    }
  }

  return score
}

/**
 * חשב ספירת מסלולים בשולחן
 */
function calculateTrackCounts(
  participants: SeatingParticipant[]
): Map<string, number> {
  const counts = new Map<string, number>()

  for (const participant of participants) {
    for (const track of participant.tracks) {
      counts.set(track, (counts.get(track) || 0) + 1)
    }
  }

  return counts
}

/**
 * קבל קיבולת שולחן
 */
function getTableCapacity(
  tableNumber: number,
  constraints: SeatingConstraints
): number {
  if (constraints.variableTableSizes?.has(tableNumber)) {
    return constraints.variableTableSizes.get(tableNumber)!
  }
  return constraints.maxTableSize
}
