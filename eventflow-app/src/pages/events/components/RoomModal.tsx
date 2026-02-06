import { X, Save } from 'lucide-react'
import type { Room } from '../../../types'

interface RoomForm {
  name: string
  capacity: string
  floor: string
  equipment: string[]
  backup_room_id: string
}

interface RoomModalProps {
  editingRoom: Room | null
  roomForm: RoomForm
  rooms: Room[]
  onFormChange: (form: RoomForm) => void
  onSave: () => void
  onClose: () => void
}

export function RoomModal({
  editingRoom,
  roomForm,
  rooms,
  onFormChange,
  onSave,
  onClose
}: RoomModalProps) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal w-full max-w-md" data-testid="room-modal">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-xl font-bold">{editingRoom ? 'עריכת חדר' : 'חדר חדש'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg">
            <X size={24} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">שם החדר *</label>
            <input
              type="text"
              value={roomForm.name}
              onChange={(e) => onFormChange({ ...roomForm, name: e.target.value })}
              className="w-full border rounded-lg p-2"
              data-testid="room-name-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">תכולה (מקומות)</label>
            <input
              type="number"
              value={roomForm.capacity}
              onChange={(e) => onFormChange({ ...roomForm, capacity: e.target.value })}
              className="w-full border rounded-lg p-2"
              data-testid="room-capacity-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">קומה</label>
            <input
              type="text"
              value={roomForm.floor}
              onChange={(e) => onFormChange({ ...roomForm, floor: e.target.value })}
              className="w-full border rounded-lg p-2"
              data-testid="room-floor-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ציוד</label>
            <div className="flex flex-wrap gap-2">
              {['projector', 'microphone', 'whiteboard', 'livestream'].map(eq => (
                <label key={eq} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={roomForm.equipment.includes(eq)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onFormChange({ ...roomForm, equipment: [...roomForm.equipment, eq] })
                      } else {
                        onFormChange({ ...roomForm, equipment: roomForm.equipment.filter(item => item !== eq) })
                      }
                    }}
                    data-testid={`equipment-${eq}`}
                  />
                  {eq === 'projector' && 'מקרן'}
                  {eq === 'microphone' && 'מיקרופון'}
                  {eq === 'whiteboard' && 'לוח'}
                  {eq === 'livestream' && 'שידור חי'}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">חדר גיבוי</label>
            <select
              value={roomForm.backup_room_id}
              onChange={(e) => onFormChange({ ...roomForm, backup_room_id: e.target.value })}
              className="w-full border rounded-lg p-2"
              data-testid="backup-room-select"
            >
              <option value="">ללא</option>
              {rooms.filter(r => r.id !== editingRoom?.id).map(room => (
                <option key={room.id} value={room.id}>{room.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">ביטול</button>
          <button onClick={onSave} className="btn-primary" data-testid="save-room-button">
            <Save size={18} className="inline mr-2" />
            שמור
          </button>
        </div>
      </div>
    </div>
  )
}
