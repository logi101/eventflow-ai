import { areIntervalsOverlapping, parseISO } from 'date-fns'
import type { ParticipantScheduleData, SimulationIssue } from '../../types'

/**
 * Detects VIP schedule conflicts (VIP double-booked).
 * Severity: WARNING (VIPs are important, but this may be intentional)
 */
export function validateVIPSchedule(
  participantSchedules: ParticipantScheduleData[]
): SimulationIssue[] {
  const issues: SimulationIssue[] = []

  // Filter to VIPs only
  const vipSchedules = participantSchedules.filter(ps => ps.is_vip)

  // Group by VIP
  const byVIP = new Map<string, ParticipantScheduleData[]>()
  for (const ps of vipSchedules) {
    const existing = byVIP.get(ps.participant_id) || []
    existing.push(ps)
    byVIP.set(ps.participant_id, existing)
  }

  for (const [vipId, schedules] of byVIP) {
    const sorted = [...schedules].sort((a, b) =>
      a.start_time.localeCompare(b.start_time) || a.schedule_id.localeCompare(b.schedule_id)
    )

    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i]
        const b = sorted[j]

        const overlaps = areIntervalsOverlapping(
          { start: parseISO(a.start_time), end: parseISO(a.end_time) },
          { start: parseISO(b.start_time), end: parseISO(b.end_time) },
          { inclusive: false }
        )

        if (overlaps) {
          const ids = [a.schedule_id, b.schedule_id].sort()
          issues.push({
            id: `vip-conflict-${vipId}-${ids[0]}-${ids[1]}`,
            severity: 'warning',
            category: 'vip',
            title: `התנגשות ללקוח VIP: ${a.participant_name}`,
            description: `${a.participant_name} (VIP) רשום ל-"${a.schedule_title}" וגם ל-"${b.schedule_title}" בזמנים חופפים`,
            affectedEntities: {
              schedule_ids: [a.schedule_id, b.schedule_id],
              participant_ids: [vipId],
            },
          })
        }
      }
    }
  }

  return issues
}
