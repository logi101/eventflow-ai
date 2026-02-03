import { differenceInMinutes, parseISO } from 'date-fns'
import type { ParticipantScheduleData, SimulationIssue } from '../../types'

const MIN_TRANSITION_MINUTES = 15

/**
 * Detects short transition times between rooms for participants.
 * Severity: WARNING (participants may be late)
 */
export function validateTransitionTimes(
  participantSchedules: ParticipantScheduleData[]
): SimulationIssue[] {
  const issues: SimulationIssue[] = []
  const seenIssues = new Set<string>() // Dedupe same room transitions

  // Group by participant
  const byParticipant = new Map<string, ParticipantScheduleData[]>()
  for (const ps of participantSchedules) {
    const existing = byParticipant.get(ps.participant_id) || []
    existing.push(ps)
    byParticipant.set(ps.participant_id, existing)
  }

  for (const [, schedules] of byParticipant) {
    const sorted = [...schedules].sort((a, b) =>
      a.start_time.localeCompare(b.start_time) || a.schedule_id.localeCompare(b.schedule_id)
    )

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i]
      const next = sorted[i + 1]

      // Skip if same room or no room assigned
      if (!current.room_id || !next.room_id || current.room_id === next.room_id) continue

      const gapMinutes = differenceInMinutes(
        parseISO(next.start_time),
        parseISO(current.end_time)
      )

      if (gapMinutes < MIN_TRANSITION_MINUTES) {
        // Dedupe key: room transition (not per-participant)
        const transitionKey = [current.room_id, next.room_id, current.schedule_id, next.schedule_id]
          .sort()
          .join('-')

        if (seenIssues.has(transitionKey)) continue
        seenIssues.add(transitionKey)

        issues.push({
          id: `transition-${current.schedule_id}-${next.schedule_id}`,
          severity: 'warning',
          category: 'timing',
          title: 'זמן מעבר קצר בין אולמות',
          description: `מעבר מ-${current.room_name} ל-${next.room_name} תוך ${gapMinutes} דקות בלבד (מומלץ ${MIN_TRANSITION_MINUTES} דקות)`,
          affectedEntities: {
            schedule_ids: [current.schedule_id, next.schedule_id],
            room_ids: [current.room_id, next.room_id],
          },
          suggestedFix: {
            type: 'adjust_time',
            action_data: {
              schedule_id: next.schedule_id,
              delay_minutes: MIN_TRANSITION_MINUTES - gapMinutes,
            },
            label: `הוסף ${MIN_TRANSITION_MINUTES - gapMinutes} דקות הפסקה`,
          },
        })
      }
    }
  }

  return issues
}
