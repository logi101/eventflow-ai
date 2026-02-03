// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Room List View Component
// Table view of room assignments with filtering and VIP indicators
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { Building2, DoorOpen, User, Check, X } from 'lucide-react'
import { VIPBadge } from '../participants/VIPBadge'

interface RoomListItem {
  id: string
  room_number: string
  building?: string
  floor?: string
  room_type?: string
  participant?: {
    id: string
    first_name: string
    last_name: string
    is_vip: boolean
  }
}

interface RoomListViewProps {
  rooms: RoomListItem[]
  onRoomClick?: (roomId: string) => void
}

type FilterType = 'all' | 'assigned' | 'available'

export function RoomListView({ rooms, onRoomClick }: RoomListViewProps) {
  const [filter, setFilter] = useState<FilterType>('all')

  // Filter rooms
  const filteredRooms = rooms.filter((room) => {
    if (filter === 'assigned') return !!room.participant
    if (filter === 'available') return !room.participant
    return true
  })

  if (rooms.length === 0) {
    return (
      <div className="text-center py-12">
        <DoorOpen size={40} className="mx-auto text-[#D4CFC6] mb-3" />
        <p className="text-[#8B8680]">אין חדרים להצגה</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-[#C4704B] text-white'
              : 'bg-white border border-[#E8E4DD] text-[#8B8680] hover:border-[#D4CFC6]'
          }`}
        >
          הכל ({rooms.length})
        </button>
        <button
          onClick={() => setFilter('assigned')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'assigned'
              ? 'bg-[#C4704B] text-white'
              : 'bg-white border border-[#E8E4DD] text-[#8B8680] hover:border-[#D4CFC6]'
          }`}
        >
          משויכים ({rooms.filter((r) => r.participant).length})
        </button>
        <button
          onClick={() => setFilter('available')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'available'
              ? 'bg-[#C4704B] text-white'
              : 'bg-white border border-[#E8E4DD] text-[#8B8680] hover:border-[#D4CFC6]'
          }`}
        >
          פנויים ({rooms.filter((r) => !r.participant).length})
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E8E4DD] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#FAF8F5] border-b border-[#E8E4DD]">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-semibold text-[#1F1D1A]">
                  <div className="flex items-center gap-2">
                    <DoorOpen size={16} />
                    חדר
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-[#1F1D1A]">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} />
                    בניין
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-[#1F1D1A]">קומה</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-[#1F1D1A]">סטטוס</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-[#1F1D1A]">
                  <div className="flex items-center gap-2">
                    <User size={16} />
                    משתתף
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E4DD]">
              {filteredRooms.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#8B8680]">
                    לא נמצאו חדרים תואמים
                  </td>
                </tr>
              ) : (
                filteredRooms.map((room) => (
                  <tr
                    key={room.id}
                    onClick={() => onRoomClick?.(room.id)}
                    className="hover:bg-[#FAF8F5] cursor-pointer transition-colors"
                  >
                    {/* Room Number */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#1F1D1A]">{room.room_number}</span>
                        {room.room_type === 'vip' && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                            VIP
                          </span>
                        )}
                        {room.room_type === 'accessible' && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                            נגיש
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Building */}
                    <td className="px-4 py-3 text-sm text-[#8B8680]">{room.building || '-'}</td>

                    {/* Floor */}
                    <td className="px-4 py-3 text-sm text-[#8B8680]">{room.floor || '-'}</td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {room.participant ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#6B9B7A]/10 text-[#6B9B7A]">
                          <Check size={14} />
                          <span className="text-xs font-medium">משויך</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#D4CFC6]/20 text-[#8B8680]">
                          <X size={14} />
                          <span className="text-xs font-medium">פנוי</span>
                        </div>
                      )}
                    </td>

                    {/* Participant */}
                    <td className="px-4 py-3">
                      {room.participant ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[#1F1D1A]">
                            {room.participant.first_name} {room.participant.last_name}
                          </span>
                          {room.participant.is_vip && <VIPBadge size="xs" />}
                        </div>
                      ) : (
                        <span className="text-sm text-[#D4CFC6]">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="text-sm text-[#8B8680]">
        מציג {filteredRooms.length} מתוך {rooms.length} חדרים
      </div>
    </div>
  )
}

export default RoomListView
