import { Plus, Edit2, Trash2 } from 'lucide-react'
import type { ProgramDay } from '../../../types'
import { formatDate } from '../../../utils'

interface ProgramDaysSectionProps {
  programDays: ProgramDay[]
  onAddDay: () => void
  onEditDay: (day: ProgramDay) => void
  onDeleteDay: (day: ProgramDay, index: number) => void
}

export function ProgramDaysSection({
  programDays,
  onAddDay,
  onEditDay,
  onDeleteDay
}: ProgramDaysSectionProps) {
  return (
    <div className="card mb-6" data-testid="program-days-section">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold" data-testid="program-days-title">ימי התוכנית</h2>
        <button
          onClick={onAddDay}
          className="btn-primary flex items-center gap-2"
          data-testid="add-program-day-button"
        >
          <Plus size={18} />
          הוסף יום
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {programDays.map((day, index) => (
          <div key={day.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow" data-testid="program-day-card" data-date={day.date}>
            <div className="flex justify-between items-start">
              <div>
                <span className="inline-block px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-sm mb-2" data-testid="day-number-badge">
                  יום {index + 1}
                </span>
                <h3 className="font-bold">{day.theme || formatDate(day.date).split(',')[0]}</h3>
                <p className="text-sm text-zinc-400">{new Date(day.date).toLocaleDateString('he-IL')}</p>
                {day.description && <p className="text-sm text-zinc-400 mt-2">{day.description}</p>}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => onEditDay(day)}
                  className="p-1 hover:bg-white/5 rounded"
                  data-testid="edit-day-button"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => onDeleteDay(day, index)}
                  className="p-1 hover:bg-red-500/10 rounded text-red-500"
                  data-testid="delete-day-button"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
