import { areIntervalsOverlapping, parseISO } from 'date-fns'
import type { ScheduleData, SimulationIssue } from '../../types'

/**
 * Detects speaker double-booking (same speaker at two sessions).
 * Severity: CRITICAL (speaker cannot be in two places)
 */
export function validateSpeakerOverlaps(schedules: ScheduleData[]): SimulationIssue[] {
  const issues: SimulationIssue[] = []

  // Group schedules by speaker
  const bySpeaker = new Map<string, ScheduleData[]>()
  for (const schedule of schedules) {
    if (!schedule.speaker_id) continue
    const existing = bySpeaker.get(schedule.speaker_id) || []
    existing.push(schedule)
    bySpeaker.set(schedule.speaker_id, existing)
  }

  // Check each speaker for overlaps
  for (const [speakerId, speakerSchedules] of bySpeaker) {
    const sorted = [...speakerSchedules].sort((a, b) =>
      a.start_time.localeCompare(b.start_time) || a.id.localeCompare(b.id)
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
          const ids = [a.id, b.id].sort()
          issues.push({
            id: `speaker-overlap-${ids[0]}-${ids[1]}`,
            severity: 'critical',
            category: 'speaker',
            title: `דובר כפול: ${a.speaker_name || speakerId}`,
            description: `${a.speaker_name} מופיע ב-"${a.title}" וב-"${b.title}" בזמנים חופפים`,
            affectedEntities: {
              schedule_ids: [a.id, b.id],
              speaker_ids: [speakerId],
            },
            suggestedFix: a.backup_speaker_id ? {
              type: 'activate_backup',
              action_data: { schedule_id: b.id, backup_speaker_id: a.backup_speaker_id },
              label: `הפעל דובר חלופי ל-"${b.title}"`,
            } : undefined,
          })
        }
      }
    }
  }

  return issues
}
