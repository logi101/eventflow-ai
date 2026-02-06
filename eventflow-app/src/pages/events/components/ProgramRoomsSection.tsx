import { Plus, Edit2, Trash2, Users, Shield, Monitor, Mic, Video, FileText } from 'lucide-react'
import type { Room } from '../../../types'

interface ProgramRoomsSectionProps {
  rooms: Room[]
  onAddRoom: () => void
  onEditRoom: (room: Room) => void
  onDeleteRoom: (room: Room) => void
}

export function ProgramRoomsSection({
  rooms,
  onAddRoom,
  onEditRoom,
  onDeleteRoom
}: ProgramRoomsSectionProps) {
  return (
    <div className="card mb-6" data-testid="rooms-section">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold" data-testid="rooms-title">חדרים</h2>
        <button
          onClick={onAddRoom}
          className="btn-primary flex items-center gap-2"
          data-testid="add-room-button"
        >
          <Plus size={18} />
          הוסף חדר
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {rooms.map(room => (
          <div key={room.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow" data-testid="room-card">
            <div className="flex justify-between items-start">
              <h3 className="font-bold">{room.name}</h3>
              <div className="flex gap-1">
                <button
                  onClick={() => onEditRoom(room)}
                  className="p-1 hover:bg-white/5 rounded"
                  data-testid="edit-room-button"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => onDeleteRoom(room)}
                  className="p-1 hover:bg-red-500/10 rounded text-red-500"
                  data-testid="delete-room-button"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-400 mt-2" data-testid="room-capacity">
              <Users size={14} />
              {room.capacity || '---'} מקומות
            </div>
            {room.equipment && room.equipment.length > 0 && (
              <div className="flex gap-1 mt-2" data-testid="room-equipment">
                {room.equipment.map(eq => (
                  <span key={eq} className="text-xs bg-white/5 px-2 py-1 rounded">
                    {eq === 'projector' && <Monitor size={12} className="inline" />}
                    {eq === 'microphone' && <Mic size={12} className="inline" />}
                    {eq === 'livestream' && <Video size={12} className="inline" />}
                    {eq === 'whiteboard' && <FileText size={12} className="inline" />}
                  </span>
                ))}
              </div>
            )}
            {room.backup_room_id && (
              <div className="flex items-center gap-1 text-xs text-emerald-400 mt-2" data-testid="backup-room-indicator">
                <Shield size={12} />
                חדר גיבוי מוגדר
              </div>
            )}
            <div className="mt-2" data-testid="room-availability-indicator">
              <span className="text-xs text-emerald-400">זמין</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
