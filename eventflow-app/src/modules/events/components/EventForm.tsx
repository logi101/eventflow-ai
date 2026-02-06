import { X, Loader2 } from 'lucide-react'
import type { Event, EventStatus } from '@/types'
import type { EventFormData } from '../types'

interface EventFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  event: Event | null
  eventTypes: { id: string; name: string; name_en: string; icon: string }[]
  formData: EventFormData
  setFormData: (data: EventFormData) => void
  saving: boolean
}

export function EventForm({
  isOpen,
  onClose,
  onSave,
  event,
  eventTypes,
  formData,
  setFormData,
  saving
}: EventFormProps) {
  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="event-form-title">
      <div className="glass-modal w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <div className="p-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-[#0f1117]/95 backdrop-blur-xl rounded-t-2xl">
          <h2 id="event-form-title" className="text-2xl font-semibold text-white">
            {event ? 'עריכת אירוע' : 'אירוע חדש'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-[#1a1d27]/10 rounded-xl transition-colors" aria-label="סגור טופס אירוע">
            <X size={24} className="text-zinc-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium mb-2">סוג אירוע</label>
            <select
              className="input"
              value={formData.event_type_id}
              onChange={e => setFormData({ ...formData, event_type_id: e.target.value })}
            >
              <option value="">בחר סוג אירוע</option>
              {eventTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.icon} {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-2">שם האירוע *</label>
            <input
              type="text"
              className="input"
              placeholder="לדוגמה: החתונה של דנה ויוסי"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              data-testid="event-name-input"
              required
              aria-required="true"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">תיאור</label>
            <textarea
              className="input min-h-[80px]"
              placeholder="תיאור קצר של האירוע"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              data-testid="event-description-input"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">תאריך ושעה *</label>
              <input
                type="datetime-local"
                className="input"
                value={formData.start_date}
                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                data-testid="event-start-date"
                required
                aria-required="true"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">סיום (אופציונלי)</label>
              <input
                type="datetime-local"
                className="input"
                value={formData.end_date}
                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                data-testid="event-end-date"
              />
            </div>
          </div>

          {/* Venue */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">מקום האירוע</label>
              <input
                type="text"
                className="input"
                placeholder="שם האולם / המקום"
                value={formData.venue_name}
                onChange={e => setFormData({ ...formData, venue_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">עיר</label>
              <input
                type="text"
                className="input"
                placeholder="עיר"
                value={formData.venue_city}
                onChange={e => setFormData({ ...formData, venue_city: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">כתובת</label>
            <input
              type="text"
              className="input"
              placeholder="כתובת מלאה"
              value={formData.venue_address}
              onChange={e => setFormData({ ...formData, venue_address: e.target.value })}
            />
          </div>

          {/* Capacity & Budget */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">מספר אורחים מקסימלי</label>
              <input
                type="number"
                className="input"
                placeholder="200"
                value={formData.max_participants}
                onChange={e => setFormData({ ...formData, max_participants: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">תקציב (₪)</label>
              <input
                type="number"
                className="input"
                placeholder="100000"
                value={formData.budget}
                onChange={e => setFormData({ ...formData, budget: e.target.value })}
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium mb-2">סטטוס</label>
            <select
              className="input"
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value as EventStatus })}
            >
              <option value="draft">טיוטה</option>
              <option value="planning">בתכנון</option>
              <option value="active">פעיל</option>
              <option value="completed">הסתיים</option>
              <option value="cancelled">בוטל</option>
            </select>
          </div>

          <div className="p-6 border-t border-white/10 flex justify-end gap-3 sticky bottom-0 bg-[#0f1117]/95 backdrop-blur-xl rounded-b-2xl">
            <button
              type="button"
              className="premium-btn-secondary"
              onClick={onClose}
            >
              ביטול
            </button>
            <button
              type="submit"
              className="premium-btn-primary flex items-center gap-2"
              disabled={saving}
              data-testid="save-event-button"
            >
              {saving && <Loader2 className="animate-spin" size={20} />}
              {event ? 'שמור שינויים' : 'צור אירוע'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
