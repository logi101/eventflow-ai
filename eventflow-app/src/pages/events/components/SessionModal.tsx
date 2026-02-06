import { X, Save } from 'lucide-react'
import type { ProgramDay, Track, Room, ExtendedSchedule } from '../../../types'

interface SessionForm {
  title: string
  description: string
  start_time: string
  end_time: string
  program_day_id: string
  track_id: string
  room_id: string
  session_type: string
}

interface SessionModalProps {
  editingSession: ExtendedSchedule | null
  sessionForm: SessionForm
  programDays: ProgramDay[]
  tracks: Track[]
  rooms: Room[]
  onFormChange: (form: SessionForm) => void
  onSave: () => void
  onClose: () => void
}

export function SessionModal({
  editingSession,
  sessionForm,
  programDays,
  tracks,
  rooms,
  onFormChange,
  onSave,
  onClose
}: SessionModalProps) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal w-full max-w-lg" data-testid="session-modal">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-xl font-bold">{editingSession ? 'עריכת מפגש' : 'מפגש חדש'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg">
            <X size={24} />
          </button>
        </div>
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium mb-1">כותרת *</label>
            <input
              type="text"
              value={sessionForm.title}
              onChange={(e) => onFormChange({ ...sessionForm, title: e.target.value })}
              className="w-full border rounded-lg p-2"
              data-testid="session-title-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">תיאור</label>
            <textarea
              value={sessionForm.description}
              onChange={(e) => onFormChange({ ...sessionForm, description: e.target.value })}
              className="w-full border rounded-lg p-2"
              rows={3}
              data-testid="session-description-input"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">שעת התחלה *</label>
              <input
                type="datetime-local"
                value={sessionForm.start_time}
                onChange={(e) => onFormChange({ ...sessionForm, start_time: e.target.value })}
                className="w-full border rounded-lg p-2"
                data-testid="session-start-time"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">שעת סיום *</label>
              <input
                type="datetime-local"
                value={sessionForm.end_time}
                onChange={(e) => onFormChange({ ...sessionForm, end_time: e.target.value })}
                className="w-full border rounded-lg p-2"
                data-testid="session-end-time"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">יום</label>
            <select
              value={sessionForm.program_day_id}
              onChange={(e) => onFormChange({ ...sessionForm, program_day_id: e.target.value })}
              className="w-full border rounded-lg p-2"
              data-testid="session-program-day-select"
            >
              <option value="">בחר יום</option>
              {programDays.map((day, i) => (
                <option key={day.id} value={day.id}>יום {i + 1} - {day.theme || new Date(day.date).toLocaleDateString('he-IL')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">מסלול</label>
            <select
              value={sessionForm.track_id}
              onChange={(e) => onFormChange({ ...sessionForm, track_id: e.target.value })}
              className="w-full border rounded-lg p-2"
              data-testid="session-track-select"
            >
              <option value="">בחר מסלול</option>
              {tracks.map(track => (
                <option key={track.id} value={track.id}>{track.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">חדר</label>
            <select
              value={sessionForm.room_id}
              onChange={(e) => onFormChange({ ...sessionForm, room_id: e.target.value })}
              className="w-full border rounded-lg p-2"
              data-testid="session-room-select"
            >
              <option value="">בחר חדר</option>
              {rooms.map(room => (
                <option key={room.id} value={room.id}>{room.name} ({room.capacity} מקומות)</option>
              ))}
            </select>
          </div>
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">ביטול</button>
          <button onClick={onSave} className="btn-primary" data-testid="save-session-button">
            <Save size={18} className="inline mr-2" />
            שמור
          </button>
        </div>
      </div>
    </div>
  )
}
