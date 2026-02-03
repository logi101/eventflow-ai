import type { ScheduleData, SimulationIssue } from '../../types'

/**
 * Detects capacity issues (expected attendance vs room capacity).
 * Severity: CRITICAL if exceeded, WARNING if > 90%
 */
export function validateCapacity(schedules: ScheduleData[]): SimulationIssue[] {
  const issues: SimulationIssue[] = []

  for (const schedule of schedules) {
    if (!schedule.room_capacity || !schedule.expected_attendance) continue

    const utilization = (schedule.expected_attendance / schedule.room_capacity) * 100

    if (schedule.expected_attendance > schedule.room_capacity) {
      issues.push({
        id: `capacity-exceeded-${schedule.id}`,
        severity: 'critical',
        category: 'capacity',
        title: `חריגה מקיבולת: ${schedule.room_name}`,
        description: `${schedule.expected_attendance} משתתפים צפויים, אבל הקיבולת היא ${schedule.room_capacity} בלבד`,
        affectedEntities: {
          schedule_ids: [schedule.id],
          room_ids: schedule.room_id ? [schedule.room_id] : undefined,
        },
        suggestedFix: {
          type: 'reassign_room',
          action_data: {
            schedule_id: schedule.id,
            reason: 'capacity_exceeded',
            min_capacity_needed: schedule.expected_attendance,
          },
          label: 'העבר לאולם גדול יותר',
        },
      })
    } else if (utilization > 90) {
      issues.push({
        id: `capacity-warning-${schedule.id}`,
        severity: 'warning',
        category: 'capacity',
        title: `אולם כמעט מלא: ${schedule.room_name}`,
        description: `${schedule.expected_attendance}/${schedule.room_capacity} משתתפים (${Math.round(utilization)}%)`,
        affectedEntities: {
          schedule_ids: [schedule.id],
          room_ids: schedule.room_id ? [schedule.room_id] : undefined,
        },
      })
    }
  }

  return issues
}
