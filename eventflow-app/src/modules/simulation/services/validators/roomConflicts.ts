import { areIntervalsOverlapping, parseISO } from 'date-fns'
import type { ScheduleData } from '../../types'
import type { SimulationIssue } from '../../types'

/**
 * Detects room double-booking conflicts.
 * Severity: CRITICAL (rooms cannot be in two places at once)
 */
export function validateRoomConflicts(schedules: ScheduleData[]): SimulationIssue[] {
  const issues: SimulationIssue[] = []

  // Group schedules by room
  const byRoom = new Map<string, ScheduleData[]>()
  for (const schedule of schedules) {
    if (!schedule.room_id) continue
    const existing = byRoom.get(schedule.room_id) || []
    existing.push(schedule)
    byRoom.set(schedule.room_id, existing)
  }

  // Check each room for overlaps
  for (const [roomId, roomSchedules] of byRoom) {
    // Sort by start time for determinism
    const sorted = [...roomSchedules].sort((a, b) =>
      a.start_time.localeCompare(b.start_time) || a.id.localeCompare(b.id)
    )

    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i]
        const b = sorted[j]

        const overlaps = areIntervalsOverlapping(
          { start: parseISO(a.start_time), end: parseISO(a.end_time) },
          { start: parseISO(b.start_time), end: parseISO(b.end_time) },
          { inclusive: false } // Exact end/start is OK (back-to-back)
        )

        if (overlaps) {
          // Deterministic ID: sorted IDs concatenated
          const ids = [a.id, b.id].sort()
          issues.push({
            id: `room-conflict-${ids[0]}-${ids[1]}`,
            severity: 'critical',
            category: 'room',
            title: `התנגשות באולם ${a.room_name || roomId}`,
            description: `"${a.title}" ו-"${b.title}" מתוכננים באותו אולם בזמנים חופפים`,
            affectedEntities: {
              schedule_ids: [a.id, b.id],
              room_ids: [roomId],
            },
            suggestedFix: {
              type: 'reassign_room',
              action_data: { schedule_id: b.id, current_room: roomId },
              label: `שנה אולם ל-"${b.title}"`,
            },
          })
        }
      }
    }
  }

  return issues
}
