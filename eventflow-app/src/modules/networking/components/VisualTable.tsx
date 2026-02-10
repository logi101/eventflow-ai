import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useDroppable } from '@dnd-kit/core'
import { calculateRoundTableSeats, calculateRectTableSeats } from '../utils/geometry'
import { VIPBadge } from '@/components/participants/VIPBadge'
import type { SeatingParticipant } from '../types'

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

export function VisualTable({
  id,
  tableNumber,
  type,
  capacity,
  participants,
  isVip = false,
  x = 0,
  y = 0,
  onSeatClick,
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
        {seats.map((seat) => {
          const { isOver: isSeatOver, setNodeRef: setSeatRef } = useDroppable({
            id: `table-${tableNumber}-seat-${seat.number}`,
            disabled: !!seat.participant,
          })

          return (
            <g key={seat.number}>
              {/* Seat Circle */}
              <circle
                cx={seat.position.x}
                cy={seat.position.y}
                r={seatRadius}
                className={`
                  transition-colors stroke-2 
                  ${seat.participant 
                    ? seat.participant.is_vip ? 'fill-purple-100 stroke-purple-400' : 'fill-blue-100 stroke-blue-400'
                    : isSeatOver ? 'fill-green-100 stroke-green-500' : 'fill-white stroke-gray-200'}
                `}
              />
              
              {/* Initials or Placeholder */}
              <text
                x={seat.position.x}
                y={seat.position.y}
                textAnchor="middle"
                dy=".3em"
                className="text-[10px] font-bold fill-gray-600 select-none pointer-events-none"
              >
                {seat.participant 
                  ? `${seat.participant.first_name[0]}${seat.participant.last_name[0]}`
                  : seat.number}
              </text>

              {/* Tooltip on hover (simulated) */}
              {seat.participant && (
                <title>{`${seat.participant.first_name} ${seat.participant.last_name}`}</title>
              )}
            </g>
          )
        })}

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
