import { X, Save } from 'lucide-react'
import type { Track } from '../../../types'

interface TrackForm {
  name: string
  description: string
  color: string
  icon: string
}

interface TrackModalProps {
  editingTrack: Track | null
  trackForm: TrackForm
  onFormChange: (form: TrackForm) => void
  onSave: () => void
  onClose: () => void
}

const COLOR_OPTIONS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#f59e0b']

export function TrackModal({
  editingTrack,
  trackForm,
  onFormChange,
  onSave,
  onClose
}: TrackModalProps) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal w-full max-w-md" data-testid="track-modal">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-xl font-bold">{editingTrack ? 'עריכת מסלול' : 'מסלול חדש'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg">
            <X size={24} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">שם המסלול *</label>
            <input
              type="text"
              value={trackForm.name}
              onChange={(e) => onFormChange({ ...trackForm, name: e.target.value })}
              className="w-full border rounded-lg p-2"
              data-testid="track-name-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">תיאור</label>
            <textarea
              value={trackForm.description}
              onChange={(e) => onFormChange({ ...trackForm, description: e.target.value })}
              className="w-full border rounded-lg p-2"
              rows={2}
              data-testid="track-description-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">צבע</label>
            <div className="flex gap-2" data-testid="track-color-picker">
              {COLOR_OPTIONS.map(color => (
                <button
                  key={color}
                  className={`w-8 h-8 rounded-full border-2 ${trackForm.color === color ? 'border-gray-800' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                  onClick={() => onFormChange({ ...trackForm, color })}
                  data-color={color}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">ביטול</button>
          <button onClick={onSave} className="btn-primary" data-testid="save-track-button">
            <Save size={18} className="inline mr-2" />
            שמור
          </button>
        </div>
      </div>
    </div>
  )
}
