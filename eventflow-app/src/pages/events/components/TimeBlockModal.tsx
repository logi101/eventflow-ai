import { X, Save } from 'lucide-react'
import type { ProgramDay, TimeBlock, BlockType } from '../../../types'

interface BlockForm {
  block_type: BlockType
  title: string
  start_time: string
  end_time: string
  description: string
  program_day_id: string
}

interface TimeBlockModalProps {
  editingBlock: TimeBlock | null
  blockForm: BlockForm
  programDays: ProgramDay[]
  onFormChange: (form: BlockForm) => void
  onSave: () => void
  onClose: () => void
}

export function TimeBlockModal({
  editingBlock,
  blockForm,
  programDays,
  onFormChange,
  onSave,
  onClose
}: TimeBlockModalProps) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal w-full max-w-md">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-xl font-bold">{editingBlock ? 'עריכת בלוק זמן' : 'בלוק זמן חדש'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg">
            <X size={24} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">סוג</label>
            <select
              value={blockForm.block_type}
              onChange={(e) => onFormChange({ ...blockForm, block_type: e.target.value as BlockType })}
              className="w-full border rounded-lg p-2"
              data-testid="block-type-select"
            >
              <option value="break">הפסקה</option>
              <option value="registration">רישום</option>
              <option value="networking">נטוורקינג</option>
              <option value="meal">ארוחה</option>
              <option value="other">אחר</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">כותרת *</label>
            <input
              type="text"
              value={blockForm.title}
              onChange={(e) => onFormChange({ ...blockForm, title: e.target.value })}
              className="w-full border rounded-lg p-2"
              data-testid="block-title-input"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">שעת התחלה *</label>
              <input
                type="datetime-local"
                value={blockForm.start_time}
                onChange={(e) => onFormChange({ ...blockForm, start_time: e.target.value })}
                className="w-full border rounded-lg p-2"
                data-testid="block-start-time"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">שעת סיום *</label>
              <input
                type="datetime-local"
                value={blockForm.end_time}
                onChange={(e) => onFormChange({ ...blockForm, end_time: e.target.value })}
                className="w-full border rounded-lg p-2"
                data-testid="block-end-time"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">יום</label>
            <select
              value={blockForm.program_day_id}
              onChange={(e) => onFormChange({ ...blockForm, program_day_id: e.target.value })}
              className="w-full border rounded-lg p-2"
            >
              <option value="">כל הימים (גלובלי)</option>
              {programDays.map((day, i) => (
                <option key={day.id} value={day.id}>יום {i + 1}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">תיאור</label>
            <textarea
              value={blockForm.description}
              onChange={(e) => onFormChange({ ...blockForm, description: e.target.value })}
              className="w-full border rounded-lg p-2"
              rows={2}
            />
          </div>
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">ביטול</button>
          <button onClick={onSave} className="btn-primary" data-testid="save-time-block-button">
            <Save size={18} className="inline mr-2" />
            שמור
          </button>
        </div>
      </div>
    </div>
  )
}
