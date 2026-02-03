import type { SupabaseClient } from '@supabase/supabase-js'
import type { SimulationResult, SimulationIssue } from '../types'
import { fetchSimulationData } from './dataFetcher'
import {
  validateRoomConflicts,
  validateSpeakerOverlaps,
  validateCapacity,
  validateTransitionTimes,
  validateEquipment,
  validateVIPSchedule,
  validateCateringGaps,
  validateBackToBack,
} from './validators'

// Severity ordering for deterministic sorting
const severityOrder: Record<SimulationIssue['severity'], number> = {
  critical: 0,
  warning: 1,
  info: 2,
}

// Category ordering for deterministic sorting
const categoryOrder: Record<SimulationIssue['category'], number> = {
  room: 0,
  speaker: 1,
  capacity: 2,
  timing: 3,
  equipment: 4,
  vip: 5,
  catering: 6,
  backtoback: 7,
}

/**
 * Runs full day simulation for an event.
 * Pure validation - no database writes.
 * Deterministic - same input produces same output.
 */
export async function runSimulation(
  supabase: SupabaseClient,
  eventId: string
): Promise<SimulationResult> {
  const startTime = performance.now()

  // 1. Fetch all data in parallel
  const data = await fetchSimulationData(supabase, eventId)

  // 2. Run all validators in parallel
  const validatorResults = await Promise.all([
    Promise.resolve(validateRoomConflicts(data.schedules)),
    Promise.resolve(validateSpeakerOverlaps(data.schedules)),
    Promise.resolve(validateCapacity(data.schedules)),
    Promise.resolve(validateTransitionTimes(data.participantSchedules)),
    Promise.resolve(validateEquipment(data.schedules, data.equipment)),
    Promise.resolve(validateVIPSchedule(data.participantSchedules)),
    Promise.resolve(validateCateringGaps(data.schedules, data.vendors)),
    Promise.resolve(validateBackToBack(data.schedules)),
  ])

  // 3. Flatten all issues
  const allIssues = validatorResults.flat()

  // 4. Sort deterministically: severity > category > id
  const sortedIssues = allIssues.sort((a, b) => {
    // Primary: severity
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
    if (severityDiff !== 0) return severityDiff

    // Secondary: category
    const categoryDiff = categoryOrder[a.category] - categoryOrder[b.category]
    if (categoryDiff !== 0) return categoryDiff

    // Tertiary: id (string comparison for determinism)
    return a.id.localeCompare(b.id)
  })

  const endTime = performance.now()

  // 5. Return result
  return {
    event_id: eventId,
    run_at: new Date().toISOString(),
    total_issues: sortedIssues.length,
    critical: sortedIssues.filter(i => i.severity === 'critical').length,
    warnings: sortedIssues.filter(i => i.severity === 'warning').length,
    info: sortedIssues.filter(i => i.severity === 'info').length,
    issues: sortedIssues,
    duration_ms: Math.round(endTime - startTime),
  }
}

/**
 * Groups issues by severity for UI display.
 */
export function groupIssuesBySeverity(issues: SimulationIssue[]): {
  critical: SimulationIssue[]
  warning: SimulationIssue[]
  info: SimulationIssue[]
} {
  return {
    critical: issues.filter(i => i.severity === 'critical'),
    warning: issues.filter(i => i.severity === 'warning'),
    info: issues.filter(i => i.severity === 'info'),
  }
}
