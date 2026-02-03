/**
 * DraggableParticipant Component
 *
 * משתתף הניתן לגרירה בין שולחנות
 * Draggable participant card for seating plan
 */

import { useDraggable } from '@dnd-kit/core'
import { VIPBadge } from '@/components/participants/VIPBadge'
import type { SeatingParticipant } from '@/modules/networking/types'

interface DraggableParticipantProps {
  participant: SeatingParticipant
  disabled?: boolean
  tableNumber: number
  trackColors?: Map<string, string>
}

/**
 * רכיב משתתף הניתן לגרירה
 */
export function DraggableParticipant({
  participant,
  disabled = false,
  tableNumber,
  trackColors,
}: DraggableParticipantProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${tableNumber}-${participant.id}`,
    data: {
      participantId: participant.id,
      sourceTable: tableNumber,
    },
    disabled,
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        flex items-center justify-between gap-2 px-3 py-2 rounded-lg
        bg-white border border-gray-200
        transition-all
        ${!disabled ? 'cursor-grab active:cursor-grabbing hover:shadow-md' : 'cursor-default'}
        ${isDragging ? 'opacity-50 shadow-lg' : ''}
      `}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="font-medium text-sm truncate">
          {participant.first_name} {participant.last_name}
        </span>
        {participant.is_vip && <VIPBadge size="xs" />}
      </div>

      {/* Track color indicators */}
      {participant.tracks.length > 0 && (
        <div className="flex gap-1">
          {participant.tracks.slice(0, 3).map((trackId) => (
            <div
              key={trackId}
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: trackColors?.get(trackId) || '#9CA3AF',
              }}
              title={`מסלול ${trackId}`}
            />
          ))}
          {participant.tracks.length > 3 && (
            <span className="text-xs text-gray-500">+{participant.tracks.length - 3}</span>
          )}
        </div>
      )}
    </div>
  )
}
