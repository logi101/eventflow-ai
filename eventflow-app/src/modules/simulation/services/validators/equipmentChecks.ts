import type { EquipmentData, SimulationIssue, ScheduleData } from '../../types'

/**
 * Detects missing equipment assignments.
 * Severity: WARNING (can be solved on event day, but risky)
 */
export function validateEquipment(
  schedules: ScheduleData[],
  equipment: EquipmentData[]
): SimulationIssue[] {
  const issues: SimulationIssue[] = []

  const equipmentBySchedule = new Map(equipment.map(e => [e.schedule_id, e]))

  for (const schedule of schedules) {
    if (!schedule.equipment_required || schedule.equipment_required.length === 0) continue

    const assigned = equipmentBySchedule.get(schedule.id)
    const missingEquipment = schedule.equipment_required.filter(
      req => !assigned?.assigned.includes(req)
    )

    if (missingEquipment.length > 0) {
      issues.push({
        id: `equipment-missing-${schedule.id}`,
        severity: 'warning',
        category: 'equipment',
        title: `ציוד חסר: ${schedule.title}`,
        description: `הציוד הבא לא הוקצה: ${missingEquipment.join(', ')}`,
        affectedEntities: {
          schedule_ids: [schedule.id],
        },
        suggestedFix: {
          type: 'add_equipment',
          action_data: {
            schedule_id: schedule.id,
            missing_equipment: missingEquipment,
          },
          label: 'הקצה ציוד חסר',
        },
      })
    }
  }

  return issues
}
