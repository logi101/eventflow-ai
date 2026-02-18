import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useDroppable } from '@dnd-kit/core'
import { calculateRoundTableSeats, calculateRectTableSeats } from '../utils/geometry'
import { VIPBadge } from '@/components/participants/VIPBadge'
import type { SeatingParticipant } from '../types'
import type { Ref } from 'react'

interface VisualTableProps {
  id: string
  tableNumber: number
  type: 'round' | 'rect'
  capacity: number
  participants: SeatingParticipant[]
  isVip?: boolean
  x?: number
  y?: number
  onSeatClick?: (seatNumber: number) => void
}

interface SeatGroupProps {
  tableNumber: number
  seatNumber: number
  seatRadius: number
  participant: SeatingParticipant | null
  position: { x: number; y: number }
}

function SeatGroup({ tableNumber, seatNumber, seatRadius, participant, position }: SeatGroupProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `table-${tableNumber}-seat-${seatNumber}`,
    disabled: !!participant,
  })

  return (
    <g key={seatNumber} ref={setNodeRef as Ref<SVGGElement>}>
      <circle
        cx={position.x}
        cy={position.y}
        r={seatRadius}
        className={`
          transition-colors stroke-2 
          ${participant
            ? participant.is_vip
              ? 'fill-purple-100 stroke-purple-400'
              : 'fill-blue-100 stroke-blue-400'
            : isOver
              ? 'fill-green-100 stroke-green-500'
              : 'fill-white stroke-gray-200'}
        `}
      />
      <text
        x={position.x}
        y={position.y}
        textAnchor="middle"
        dy=".3em"
        className="text-[10px] font-bold fill-gray-600 select-none pointer-events-none"
      >
        {participant ? `${participant.first_name[0]}${participant.last_name[0]}` : seatNumber}
      </text>
      {participant && <title>{`${participant.first_name} ${participant.last_name}`}</title>}
    </g>
  )
}

export function VisualTable({
  tableNumber,
  type,
  capacity,
  participants,
  isVip = false,
  x = 0,
  y = 0,
}: VisualTableProps) {
  const tableSize = 120
  const seatRadius = 15

  // Calculate seat positions
  const seatPositions = useMemo(() => {
    if (type === 'round') {
      return calculateRoundTableSeats({ x: tableSize / 2, y: tableSize / 2 }, tableSize / 2 + 25, capacity)
    } else {
      return calculateRectTableSeats(0, 0, tableSize, 60, capacity)
    }
  }, [type, capacity])

  // Map participants to seat slots
  const seats = useMemo(() => {
    return Array.from({ length: capacity }, (_, i) => ({
      number: i + 1,
      participant: participants[i] || null,
      position: seatPositions[i],
    }))
  }, [capacity, participants, seatPositions])

  const { setNodeRef, isOver } = useDroppable({
    id: `table-${tableNumber}`,
    data: { tableNumber },
  })

  return (
    <div
      ref={setNodeRef}
      className="relative"
      style={{
        width: tableSize + 100,
        height: tableSize + 100,
        left: x,
        top: y,
      }}
    >
      <svg
        viewBox={`-50 -50 ${tableSize + 100} ${tableSize + 100}`}
        className="w-full h-full"
      >
        {/* Seats */}
        {seats.map((seat) => (
          <SeatGroup
            key={seat.number}
            tableNumber={tableNumber}
            seatNumber={seat.number}
            seatRadius={seatRadius}
            participant={seat.participant}
            position={seat.position}
          />
        ))}

        {/* Table Body */}
        <motion.circle
          cx={tableSize / 2}
          cy={tableSize / 2}
          r={tableSize / 2}
          initial={false}
          animate={{
            scale: isOver ? 1.05 : 1,
            stroke: isOver ? '#3b82f6' : isVip ? '#a855f7' : '#e5e7eb',
          }}
          className={`
            fill-white stroke-[4px] shadow-sm
            ${isVip ? 'stroke-purple-200' : 'stroke-gray-100'}
          `}
        />

        {/* Table Number */}
        <text
          x={tableSize / 2}
          y={tableSize / 2}
          textAnchor="middle"
          dy=".3em"
          className="text-lg font-black fill-gray-400 select-none"
        >
          {tableNumber}
        </text>
      </svg>

      {/* VIP Indicator Badge */}
      {isVip && (
        <div className="absolute top-0 right-0">
          <VIPBadge size="md" />
        </div>
      )}
    </div>
  )
}
