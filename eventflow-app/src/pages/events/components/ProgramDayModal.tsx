import { X, Save } from 'lucide-react'
import type { ProgramDay } from '../../../types'

interface DayForm {
  date: string
  theme: string
  description: string
}

interface ProgramDayModalProps {
  editingDay: ProgramDay | null
  dayForm: DayForm
  onFormChange: (form: DayForm) => void
  onSave: () => void
  onClose: () => void
}

export function ProgramDayModal({
  editingDay,
  dayForm,
  onFormChange,
  onSave,
  onClose
}: ProgramDayModalProps) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal w-full max-w-md" data-testid="program-day-modal">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-xl font-bold">{editingDay ? 'עריכת יום' : 'יום חדש'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg">
            <X size={24} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">תאריך *</label>
            <input
              type="date"
              value={dayForm.date}
              onChange={(e) => onFormChange({ ...dayForm, date: e.target.value })}
              className="w-full border rounded-lg p-2"
              data-testid="day-date-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">נושא היום</label>
            <input
              type="text"
              value={dayForm.theme}
              onChange={(e) => onFormChange({ ...dayForm, theme: e.target.value })}
              className="w-full border rounded-lg p-2"
              placeholder="לדוגמה: יום פתיחה - חדשנות"
              data-testid="day-theme-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">תיאור</label>
            <textarea
              value={dayForm.description}
              onChange={(e) => onFormChange({ ...dayForm, description: e.target.value })}
              className="w-full border rounded-lg p-2"
              rows={3}
              data-testid="day-description-input"
            />
          </div>
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">ביטול</button>
          <button onClick={onSave} className="btn-primary" data-testid="save-program-day-button">
            <Save size={18} className="inline mr-2" />
            שמור
          </button>
        </div>
      </div>
    </div>
  )
}
