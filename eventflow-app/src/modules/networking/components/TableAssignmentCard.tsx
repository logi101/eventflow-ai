import { useDroppable } from '@dnd-kit/core'
import { DraggableParticipant } from '@/components/networking/DraggableParticipant'
import type { TableWithParticipants } from '@/modules/networking/types'

interface TableAssignmentCardProps {
  table: TableWithParticipants
  editable?: boolean
  trackColors?: Map<string, string>
}

export function TableAssignmentCard({
  table,
  editable = false,
  trackColors,
}: TableAssignmentCardProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: table.tableNumber.toString(),
    data: {
      tableNumber: table.tableNumber,
      currentCount: table.participants.length,
      capacity: table.capacity,
    },
    disabled: !editable,
  })

  const vipCount = table.participants.filter((p) => p.is_vip).length
  const isFull = table.participants.length >= table.capacity

  return (
    <div
      ref={setNodeRef}
      className={`
        flex flex-col gap-3 p-4 rounded-xl border-2 transition-all min-h-[200px]
        ${isOver && !isFull ? 'border-blue-500 bg-blue-50 scale-102' : 'border-gray-200 bg-white'}
        ${isFull && !isOver ? 'bg-gray-50' : ''}
        ${table.isVipTable ? 'border-purple-200 bg-purple-50/30' : ''}
      `}
    >
      {/* Table Header */}
      <div className="flex justify-between items-center pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🍽️</span>
          <div>
            <h3 className="font-bold text-gray-900">שולחן {table.tableNumber}</h3>
            {table.isVipTable && (
              <span className="text-xs text-purple-600 font-medium bg-purple-100 px-2 py-0.5 rounded-full">
                VIP
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className={`text-sm font-medium ${isFull ? 'text-red-500' : 'text-gray-600'}`}>
            {table.participants.length} / {table.capacity}
          </div>
          {vipCount > 0 && (
            <div className="text-xs text-purple-600 flex items-center justify-end gap-1">
              <span>💎</span>
              <span>{vipCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* Participants List */}
      <div className="flex flex-col gap-2 flex-1">
        {table.participants.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm italic py-4">
            גרור משתתפים לכאן
          </div>
        ) : (
          table.participants.map((participant) => (
            <DraggableParticipant
              key={participant.id}
              participant={participant}
              disabled={!editable}
              tableNumber={table.tableNumber}
              trackColors={trackColors}
            />
          ))
        )}
      </div>
    </div>
  )
}
