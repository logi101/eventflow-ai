import { X, Save } from 'lucide-react'
import type { Speaker } from '../../../types'

interface SpeakerForm {
  name: string
  title: string
  bio: string
  email: string
  phone: string
  backup_speaker_id: string
}

interface SpeakerModalProps {
  editingSpeaker: Speaker | null
  speakerForm: SpeakerForm
  speakers: Speaker[]
  onFormChange: (form: SpeakerForm) => void
  onSave: () => void
  onClose: () => void
}

export function SpeakerModal({
  editingSpeaker,
  speakerForm,
  speakers,
  onFormChange,
  onSave,
  onClose
}: SpeakerModalProps) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal w-full max-w-md" data-testid="speaker-modal">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-xl font-bold">{editingSpeaker ? 'עריכת דובר' : 'דובר חדש'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg">
            <X size={24} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">שם *</label>
            <input
              type="text"
              value={speakerForm.name}
              onChange={(e) => onFormChange({ ...speakerForm, name: e.target.value })}
              className="w-full border rounded-lg p-2"
              data-testid="speaker-name-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">תפקיד</label>
            <input
              type="text"
              value={speakerForm.title}
              onChange={(e) => onFormChange({ ...speakerForm, title: e.target.value })}
              className="w-full border rounded-lg p-2"
              data-testid="speaker-title-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ביוגרפיה</label>
            <textarea
              value={speakerForm.bio}
              onChange={(e) => onFormChange({ ...speakerForm, bio: e.target.value })}
              className="w-full border rounded-lg p-2"
              rows={3}
              data-testid="speaker-bio-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">אימייל</label>
            <input
              type="email"
              value={speakerForm.email}
              onChange={(e) => onFormChange({ ...speakerForm, email: e.target.value })}
              className="w-full border rounded-lg p-2"
              data-testid="speaker-email-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">טלפון</label>
            <input
              type="tel"
              value={speakerForm.phone}
              onChange={(e) => onFormChange({ ...speakerForm, phone: e.target.value })}
              className="w-full border rounded-lg p-2"
              data-testid="speaker-phone-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">דובר גיבוי</label>
            <select
              value={speakerForm.backup_speaker_id}
              onChange={(e) => onFormChange({ ...speakerForm, backup_speaker_id: e.target.value })}
              className="w-full border rounded-lg p-2"
              data-testid="backup-speaker-select"
            >
              <option value="">ללא</option>
              {speakers.filter(s => s.id !== editingSpeaker?.id).map(speaker => (
                <option key={speaker.id} value={speaker.id}>{speaker.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">ביטול</button>
          <button onClick={onSave} className="btn-primary" data-testid="save-speaker-button">
            <Save size={18} className="inline mr-2" />
            שמור
          </button>
        </div>
      </div>
    </div>
  )
}
