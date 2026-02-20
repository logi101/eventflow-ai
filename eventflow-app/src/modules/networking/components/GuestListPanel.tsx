import { useMemo, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Search, UserCheck, User } from 'lucide-react'
import type { SeatingParticipant, TableAssignment } from '../types'

interface GuestListPanelProps {
  participants: SeatingParticipant[]
  assignments: TableAssignment[]
  onRemoveAssignment: (participantId: string) => void
}

interface DraggableGuestProps {
  participant: SeatingParticipant
  tableNum?: number
  seatNum?: number
}

function DraggableGuest({ participant, tableNum, seatNum }: DraggableGuestProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `guest-${participant.id}`,
    data: { participantId: participant.id, type: 'guest-panel' },
  })

  const isAssigned = tableNum !== undefined

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg border cursor-grab active:cursor-grabbing select-none transition-all
        ${isDragging ? 'opacity-30' : ''}
        ${isAssigned
          ? 'bg-zinc-800 border-zinc-600'
          : 'bg-zinc-900 border-zinc-700 hover:border-zinc-500'}
      `}
    >
      <div className={`
        w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
        ${participant.is_vip ? 'bg-purple-600 text-white' : 'bg-zinc-700 text-zinc-200'}
      `}>
        {participant.first_name[0]}{participant.last_name[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-zinc-200 truncate">
          {participant.first_name} {participant.last_name}
          {participant.is_vip && <span className="mr-1 text-purple-400">⭐</span>}
        </p>
        {isAssigned && (
          <p className="text-[10px] text-zinc-500">
            שולחן {tableNum}{seatNum ? ` · מקום ${seatNum}` : ''}
          </p>
        )}
      </div>
    </div>
  )
}

export function GuestListPanel({ participants, assignments, onRemoveAssignment }: GuestListPanelProps) {
  const [search, setSearch] = useState('')
  const [showAssigned, setShowAssigned] = useState(true)

  const assignmentMap = useMemo(() => {
    const m = new Map<string, { tableNum: number; seatNum?: number }>()
    assignments.forEach(a => m.set(a.participant_id, { tableNum: a.table_number, seatNum: a.seat_number }))
    return m
  }, [assignments])

  const { unassigned, assigned } = useMemo(() => {
    const filtered = participants.filter(p => {
      const fullName = `${p.first_name} ${p.last_name}`.toLowerCase()
      return !search || fullName.includes(search.toLowerCase())
    })
    const unassigned = filtered.filter(p => !assignmentMap.has(p.id))
    const assigned = filtered.filter(p => assignmentMap.has(p.id))
    return { unassigned, assigned }
  }, [participants, assignmentMap, search])

  return (
    <div className="w-56 shrink-0 bg-zinc-900 border-r border-zinc-700 flex flex-col overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="p-3 border-b border-zinc-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">אורחים</h3>
          <span className="text-xs text-zinc-500">
            {participants.length - unassigned.length}/{participants.length}
          </span>
        </div>
        <div className="relative">
          <Search size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חפש אורח..."
            className="w-full pr-7 pl-2 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg text-xs placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
          />
        </div>
      </div>

      {/* Guest List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* Unassigned */}
        {unassigned.length > 0 && (
          <>
            <p className="text-[10px] font-bold text-zinc-500 uppercase px-1 py-1 flex items-center gap-1">
              <User size={10} />
              ממתינים לשיבוץ ({unassigned.length})
            </p>
            {unassigned.map(p => (
              <DraggableGuest key={p.id} participant={p} />
            ))}
          </>
        )}

        {/* Assigned */}
        {assigned.length > 0 && (
          <>
            <button
              onClick={() => setShowAssigned(!showAssigned)}
              className="w-full text-[10px] font-bold text-zinc-500 uppercase px-1 py-1 flex items-center gap-1 hover:text-zinc-300 transition-colors mt-2"
            >
              <UserCheck size={10} />
              משובצים ({assigned.length})
              <span className="mr-auto">{showAssigned ? '▲' : '▼'}</span>
            </button>
            {showAssigned && assigned.map(p => {
              const a = assignmentMap.get(p.id)!
              return (
                <div key={p.id} className="relative group">
                  <DraggableGuest participant={p} tableNum={a.tableNum} seatNum={a.seatNum} />
                  <button
                    onClick={() => onRemoveAssignment(p.id)}
                    className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-all text-xs leading-none"
                    title="הסר שיבוץ"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </>
        )}

        {unassigned.length === 0 && assigned.length === 0 && (
          <p className="text-xs text-zinc-600 text-center py-8">אין אורחים</p>
        )}
      </div>
    </div>
  )
}
