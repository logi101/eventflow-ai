// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Room Grid View Component
// CSS grid layout visualization of room assignments with VIP highlighting
// ═══════════════════════════════════════════════════════════════════════════

import { Hotel, User } from 'lucide-react'
import { VIPBadge } from '../participants/VIPBadge'

interface RoomGridItem {
  id: string
  room_number: string
  building?: string
  floor?: string
  participant?: {
    id: string
    first_name: string
    last_name: string
    is_vip: boolean
  }
}

interface RoomGridViewProps {
  rooms: RoomGridItem[]
  onRoomClick?: (roomId: string) => void
}

export function RoomGridView({ rooms, onRoomClick }: RoomGridViewProps) {
  if (rooms.length === 0) {
    return (
      <div className="text-center py-12">
        <Hotel size={40} className="mx-auto text-[#D4CFC6] mb-3" />
        <p className="text-[#8B8680]">אין חדרים להצגה</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {rooms.map((room) => {
        const isEmpty = !room.participant
        const isVIP = room.participant?.is_vip

        return (
          <button
            key={room.id}
            onClick={() => onRoomClick?.(room.id)}
            className={`
              relative p-4 rounded-xl border-2 transition-all text-right
              ${isEmpty
                ? 'bg-white border-[#E8E4DD] hover:border-[#D4CFC6]'
                : isVIP
                  ? 'bg-purple-50 border-purple-200 hover:border-purple-300'
                  : 'bg-blue-50 border-blue-200 hover:border-blue-300'
              }
              hover:shadow-md active:scale-95
            `}
          >
            {/* Room Number */}
            <div className="flex items-center justify-between mb-2">
              <span className={`text-lg font-bold ${isEmpty ? 'text-[#1F1D1A]' : isVIP ? 'text-purple-700' : 'text-blue-700'}`}>
                {room.room_number}
              </span>
              {isVIP && <VIPBadge size="xs" />}
            </div>

            {/* Building & Floor */}
            {(room.building || room.floor) && (
              <div className="text-xs text-[#8B8680] mb-3">
                {room.building && <span>{room.building}</span>}
                {room.building && room.floor && <span> • </span>}
                {room.floor && <span>קומה {room.floor}</span>}
              </div>
            )}

            {/* Participant or Empty State */}
            {isEmpty ? (
              <div className="flex items-center justify-center gap-1.5 text-[#D4CFC6]">
                <User size={16} />
                <span className="text-xs">פנוי</span>
              </div>
            ) : (
              <div className={`text-sm font-medium ${isVIP ? 'text-purple-900' : 'text-blue-900'}`}>
                {room.participant?.first_name} {room.participant?.last_name}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default RoomGridView
