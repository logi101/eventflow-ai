import { differenceInMinutes, parseISO } from 'date-fns'
import type { ScheduleData, SimulationIssue } from '../../types'

const MIN_SPEAKER_BREAK_MINUTES = 15

/**
 * Detects back-to-back sessions for the same speaker.
 * Severity: WARNING (speaker fatigue, no prep time)
 */
export function validateBackToBack(schedules: ScheduleData[]): SimulationIssue[] {
  const issues: SimulationIssue[] = []

  // Group by speaker
  const bySpeaker = new Map<string, ScheduleData[]>()
  for (const schedule of schedules) {
    if (!schedule.speaker_id) continue
    const existing = bySpeaker.get(schedule.speaker_id) || []
    existing.push(schedule)
    bySpeaker.set(schedule.speaker_id, existing)
  }

  for (const [speakerId, speakerSchedules] of bySpeaker) {
    if (speakerSchedules.length < 2) continue

    const sorted = [...speakerSchedules].sort((a, b) =>
      a.start_time.localeCompare(b.start_time) || a.id.localeCompare(b.id)
    )

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i]
      const next = sorted[i + 1]

      const gapMinutes = differenceInMinutes(
        parseISO(next.start_time),
        parseISO(current.end_time)
      )

      if (gapMinutes < MIN_SPEAKER_BREAK_MINUTES) {
        issues.push({
          id: `backtoback-${current.id}-${next.id}`,
          severity: 'warning',
          category: 'backtoback',
          title: `סשנים רצופים לדובר: ${current.speaker_name}`,
          description: `${current.speaker_name} מופיע ב-"${current.title}" וב-"${next.title}" עם ${gapMinutes} דקות הפסקה בלבד`,
          affectedEntities: {
            schedule_ids: [current.id, next.id],
            speaker_ids: [speakerId],
          },
          suggestedFix: {
            type: 'extend_break',
            action_data: {
              schedule_id: next.id,
              delay_minutes: MIN_SPEAKER_BREAK_MINUTES - gapMinutes,
            },
            label: `הוסף ${MIN_SPEAKER_BREAK_MINUTES - gapMinutes} דקות הפסקה`,
          },
        })
      }
    }
  }

  return issues
}
