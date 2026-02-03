/**
 * TableCard Component
 *
 * כרטיס שולחן עם רשימת משתתפים
 * Table card showing assigned participants with drop zone
 */

import { useDroppable } from '@dnd-kit/core'
import { DraggableParticipant } from './DraggableParticipant'
import type { SeatingParticipant } from '@/modules/networking/types'

interface TableCardProps {
  tableNumber: number
  capacity: number
  participants: SeatingParticipant[]
  isVipTable?: boolean
  disabled?: boolean
  trackColors?: Map<string, string>
}

/**
 * רכיב כרטיס שולחן
 */
export function TableCard({
  tableNumber,
  capacity,
  participants,
  isVipTable = false,
  disabled = false,
  trackColors,
}: TableCardProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `table-${tableNumber}`,
    data: {
      tableNumber,
      capacity,
      currentSize: participants.length,
    },
    disabled,
  })

  const vipCount = participants.filter((p) => p.is_vip).length
  const isFull = participants.length >= capacity
  const isEmpty = participants.length === 0

  return (
    <div
      ref={setNodeRef}
      className={`
        relative rounded-lg border-2 p-4
        transition-all duration-200
        ${isOver && !isFull ? 'border-purple-400 bg-purple-50 shadow-lg' : 'border-gray-300 bg-white'}
        ${isFull ? 'border-orange-300 bg-orange-50' : ''}
        ${isEmpty ? 'border-dashed' : ''}
      `}
    >
      {/* Table header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-lg">
            שולחן {tableNumber}
          </h3>
          {isVipTable && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
              VIP
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm">
          {/* VIP count indicator */}
          {vipCount > 0 && (
            <span className="text-purple-600 font-medium" title={`${vipCount} משתתפי VIP`}>
              💎 {vipCount}
            </span>
          )}

          {/* Capacity indicator */}
          <span
            className={`font-medium ${
              isFull ? 'text-orange-600' : 'text-gray-600'
            }`}
          >
            {participants.length}/{capacity}
          </span>
        </div>
      </div>

      {/* Participants list */}
      <div className="space-y-2 min-h-[100px]">
        {participants.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
            גרור משתתפים לשולחן זה
          </div>
        ) : (
          participants.map((participant) => (
            <DraggableParticipant
              key={participant.id}
              participant={participant}
              tableNumber={tableNumber}
              disabled={disabled}
              trackColors={trackColors}
            />
          ))
        )}
      </div>

      {/* Full indicator */}
      {isFull && (
        <div className="mt-2 text-xs text-orange-600 text-center">
          שולחן מלא
        </div>
      )}

      {/* Drop zone indicator */}
      {isOver && !isFull && (
        <div className="absolute inset-0 flex items-center justify-center bg-purple-100 bg-opacity-50 rounded-lg pointer-events-none">
          <span className="text-purple-700 font-bold text-lg">
            שחרר כאן
          </span>
        </div>
      )}
    </div>
  )
}
