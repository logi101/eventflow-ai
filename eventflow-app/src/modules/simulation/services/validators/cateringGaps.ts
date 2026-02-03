import { differenceInHours, parseISO } from 'date-fns'
import type { ScheduleData, VendorScheduleData, SimulationIssue } from '../../types'

const MAX_HOURS_WITHOUT_CATERING = 4

/**
 * Detects long gaps without catering/meals.
 * Severity: INFO (comfort issue, not critical)
 */
export function validateCateringGaps(
  schedules: ScheduleData[],
  vendors: VendorScheduleData[] // eslint-disable-line @typescript-eslint/no-unused-vars
): SimulationIssue[] {
  const issues: SimulationIssue[] = []

  // Reserved for future catering vendor validation
  void vendors

  // Find meal/break sessions
  const mealSessions = schedules.filter(s =>
    s.session_type === 'meal' ||
    s.session_type === 'break' ||
    s.title.toLowerCase().includes('ארוחה') ||
    s.title.toLowerCase().includes('הפסקה') ||
    s.title.toLowerCase().includes('קפה')
  )

  if (schedules.length === 0) return issues

  // Sort schedules by time
  const sorted = [...schedules].sort((a, b) => a.start_time.localeCompare(b.start_time))
  const eventStart = parseISO(sorted[0].start_time)
  const eventEnd = parseISO(sorted[sorted.length - 1].end_time)
  const totalHours = differenceInHours(eventEnd, eventStart)

  // Check for gaps
  if (totalHours > MAX_HOURS_WITHOUT_CATERING && mealSessions.length === 0) {
    issues.push({
      id: `catering-gap-no-meals`,
      severity: 'info',
      category: 'catering',
      title: 'לא נקבעו הפסקות אוכל',
      description: `האירוע נמשך ${totalHours} שעות ללא הפסקות אוכל מתוכננות`,
      affectedEntities: {},
      suggestedFix: {
        type: 'add_catering',
        action_data: { recommended_breaks: Math.floor(totalHours / 3) },
        label: 'הוסף הפסקות אוכל',
      },
    })
  }

  // Check for long gaps between meals
  if (mealSessions.length > 0) {
    const mealTimes = mealSessions
      .map(m => ({ start: parseISO(m.start_time), end: parseISO(m.end_time), id: m.id }))
      .sort((a, b) => a.start.getTime() - b.start.getTime())

    // Check gap from event start to first meal
    const hoursToFirstMeal = differenceInHours(mealTimes[0].start, eventStart)
    if (hoursToFirstMeal > MAX_HOURS_WITHOUT_CATERING) {
      issues.push({
        id: `catering-gap-start`,
        severity: 'info',
        category: 'catering',
        title: 'פער ארוך לפני ארוחה ראשונה',
        description: `${hoursToFirstMeal} שעות מתחילת האירוע ועד הארוחה הראשונה`,
        affectedEntities: {
          schedule_ids: [mealTimes[0].id],
        },
      })
    }

    // Check gaps between meals
    for (let i = 0; i < mealTimes.length - 1; i++) {
      const gap = differenceInHours(mealTimes[i + 1].start, mealTimes[i].end)
      if (gap > MAX_HOURS_WITHOUT_CATERING) {
        issues.push({
          id: `catering-gap-${mealTimes[i].id}-${mealTimes[i + 1].id}`,
          severity: 'info',
          category: 'catering',
          title: 'פער ארוך בין ארוחות',
          description: `${gap} שעות בין הפסקות אוכל`,
          affectedEntities: {
            schedule_ids: [mealTimes[i].id, mealTimes[i + 1].id],
          },
        })
      }
    }
  }

  return issues
}
