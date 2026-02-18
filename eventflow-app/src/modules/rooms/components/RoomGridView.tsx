import { useState } from 'react'
import GridLayout from 'react-grid-layout'
import type { Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import type { Room, ParticipantRoom, Participant } from '@/types'

interface RoomGridViewProps {
  rooms: Room[]
  assignments: ParticipantRoom[]
  participants: Participant[]
  onRoomClick: (room: Room) => void
  readOnly?: boolean
}

interface RoomWithAssignment extends Room {
  assignment?: ParticipantRoom
  participant?: Participant
}

export function RoomGridView({
  rooms,
  assignments,
  participants,
  onRoomClick,
  readOnly = false,
}: RoomGridViewProps) {
  const [layout, setLayout] = useState<Layout>(generateLayout(rooms))

  // Merge room data with assignments
  const enrichedRooms: RoomWithAssignment[] = rooms.map(room => {
    const assignment = assignments.find(a => a.room_number === room.name) // Assuming room.name matches room_number
    const participant = assignment 
      ? participants.find(p => p.id === assignment.participant_id)
      : undefined
    
    return { ...room, assignment, participant }
  })

  // Simple heuristic layout generator based on building/floor/room number
  function generateLayout(rooms: Room[]): Layout {
    return rooms.map((room) => {
      // Parse room number for X position (e.g. 101 -> 1)
      const roomNum = parseInt(room.name.replace(/\D/g, '')) || 0
      const x = roomNum % 10
      
      // Parse floor for Y position
      const floor = parseInt(room.floor || '0') || 0
      
      return {
        i: room.id,
        x: x,
        y: floor * 2, // Spacing
        w: 1,
        h: 1,
        static: readOnly,
      }
    })
  }

  function handleLayoutChange(newLayout: Layout) {
    setLayout([...newLayout])
    // In a real app, save layout positions to DB
  }

  const gridProps = {
    className: "layout",
    layout: layout,
    cols: 12,
    rowHeight: 80,
    width: 1000,
    onLayoutChange: handleLayoutChange,
    isDraggable: !readOnly,
    isResizable: false
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 min-h-[500px]" dir="ltr">
      <GridLayout {...gridProps}>
        {enrichedRooms.map((room) => {
          const isOccupied = !!room.assignment
          const isVip = room.participant?.is_vip
          
          return (
            <div
              key={room.id}
              onClick={() => onRoomClick(room)}
              className={`
                border rounded-lg p-2 shadow-sm cursor-pointer transition-colors
                flex flex-col justify-between overflow-hidden
                ${isOccupied 
                  ? isVip 
                    ? 'bg-purple-100 border-purple-300' 
                    : 'bg-blue-100 border-blue-300' 
                  : 'bg-white border-gray-300 hover:border-gray-400'}
              `}
            >
              <div className="flex justify-between items-start">
                <span className="font-bold text-xs">{room.name}</span>
                {room.capacity && (
                  <span className="text-[10px] text-gray-500">
                    {room.capacity}👤
                  </span>
                )}
              </div>
              
              {room.participant ? (
                <div className="text-xs truncate font-medium">
                  {isVip && '💎 '}
                  {room.participant.first_name} {room.participant.last_name?.charAt(0)}.
                </div>
              ) : (
                <div className="text-[10px] text-green-600 font-medium">פנוי</div>
              )}
            </div>
          )
        })}
      </GridLayout>
    </div>
  )
}
