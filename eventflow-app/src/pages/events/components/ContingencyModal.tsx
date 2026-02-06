import { X, Save } from 'lucide-react'
import type { Contingency, ContingencyType, RiskLevel, Speaker, Room } from '../../../types'

interface ContingencyForm {
  contingency_type: ContingencyType
  risk_level: RiskLevel
  description: string
  action_plan: string
  backup_speaker_id: string
  backup_room_id: string
}

interface ContingencyModalProps {
  editingContingency: Contingency | null
  contingencyForm: ContingencyForm
  speakers: Speaker[]
  rooms: Room[]
  onFormChange: (form: ContingencyForm) => void
  onSave: () => void
  onClose: () => void
}

export function ContingencyModal({
  editingContingency,
  contingencyForm,
  speakers,
  rooms,
  onFormChange,
  onSave,
  onClose
}: ContingencyModalProps) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal w-full max-w-md" data-testid="contingency-modal">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-xl font-bold">{editingContingency ? 'עריכת תכנית חירום' : 'תכנית חירום חדשה'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg">
            <X size={24} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">סוג</label>
            <select
              value={contingencyForm.contingency_type}
              onChange={(e) => onFormChange({ ...contingencyForm, contingency_type: e.target.value as ContingencyType })}
              className="w-full border rounded-lg p-2"
              data-testid="contingency-type-select"
            >
              <option value="speaker_unavailable">דובר לא זמין</option>
              <option value="room_unavailable">חדר לא זמין</option>
              <option value="technical_failure">תקלה טכנית</option>
              <option value="weather">מזג אוויר</option>
              <option value="medical">רפואי</option>
              <option value="security">ביטחוני</option>
              <option value="other">אחר</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">רמת סיכון</label>
            <select
              value={contingencyForm.risk_level}
              onChange={(e) => onFormChange({ ...contingencyForm, risk_level: e.target.value as RiskLevel })}
              className="w-full border rounded-lg p-2"
              data-testid="contingency-risk-level"
            >
              <option value="low">נמוך</option>
              <option value="medium">בינוני</option>
              <option value="high">גבוה</option>
              <option value="critical">קריטי</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">תיאור הסיכון *</label>
            <textarea
              value={contingencyForm.description}
              onChange={(e) => onFormChange({ ...contingencyForm, description: e.target.value })}
              className="w-full border rounded-lg p-2"
              rows={2}
              data-testid="contingency-description-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">תכנית פעולה *</label>
            <textarea
              value={contingencyForm.action_plan}
              onChange={(e) => onFormChange({ ...contingencyForm, action_plan: e.target.value })}
              className="w-full border rounded-lg p-2"
              rows={3}
              data-testid="contingency-action-plan-input"
            />
          </div>
          {contingencyForm.contingency_type === 'speaker_unavailable' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">דובר מושפע</label>
                <select
                  className="w-full border rounded-lg p-2"
                  data-testid="affected-speaker-select"
                >
                  <option value="">בחר דובר</option>
                  {speakers.map(speaker => (
                    <option key={speaker.id} value={speaker.id}>{speaker.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">דובר גיבוי</label>
                <select
                  value={contingencyForm.backup_speaker_id}
                  onChange={(e) => onFormChange({ ...contingencyForm, backup_speaker_id: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  data-testid="backup-speaker-select"
                >
                  <option value="">בחר דובר גיבוי</option>
                  {speakers.map(speaker => (
                    <option key={speaker.id} value={speaker.id}>{speaker.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          {contingencyForm.contingency_type === 'room_unavailable' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">חדר מושפע</label>
                <select
                  className="w-full border rounded-lg p-2"
                  data-testid="affected-room-select"
                >
                  <option value="">בחר חדר</option>
                  {rooms.map(room => (
                    <option key={room.id} value={room.id}>{room.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">חדר גיבוי</label>
                <select
                  value={contingencyForm.backup_room_id}
                  onChange={(e) => onFormChange({ ...contingencyForm, backup_room_id: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  data-testid="backup-room-select"
                >
                  <option value="">בחר חדר גיבוי</option>
                  {rooms.map(room => (
                    <option key={room.id} value={room.id}>{room.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">ביטול</button>
          <button onClick={onSave} className="btn-primary" data-testid="save-contingency-button">
            <Save size={18} className="inline mr-2" />
            שמור
          </button>
        </div>
      </div>
    </div>
  )
}
