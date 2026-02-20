import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { Settings2 } from 'lucide-react'
import { FloorPlanView } from './FloorPlanView'
import { TableToolbox } from './TableToolbox'
import { GuestListPanel } from './GuestListPanel'
import type { SeatingParticipant, TableAssignment, TableWithParticipants, VenueTable } from '@/modules/networking/types'

interface SeatingPlanViewProps {
  tables: TableWithParticipants[]
  participants: SeatingParticipant[]
  assignments: TableAssignment[]
  onMoveParticipant: (participantId: string, fromTable: number, toTable: number) => void
  onAssignToSeat: (participantId: string, tableNumber: number, seatNumber: number) => void
  onRemoveAssignment: (participantId: string) => void
  onGenerateSeating: () => void
  trackColors?: Map<string, string>
  isLoading?: boolean
  venueTableConfigs: VenueTable[]
  onTableMove: (tableId: string, x: number, y: number) => void
  onAddTable: (name: string, shape: 'round' | 'rect', capacity: number) => void
  onUpdateTable: (id: string, changes: Partial<Pick<VenueTable, 'name' | 'shape' | 'capacity'>>) => void
  onOpenLayoutSelector: () => void
}

export function SeatingPlanView({
  tables,
  participants,
  assignments,
  onMoveParticipant,
  onAssignToSeat,
  onRemoveAssignment,
  onGenerateSeating,
  isLoading = false,
  venueTableConfigs,
  onTableMove,
  onAddTable,
  onOpenLayoutSelector,
}: SeatingPlanViewProps) {
  const [editMode, setEditMode] = useState(false)
  const [floorZoom, setFloorZoom] = useState(1)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeParticipant, setActiveParticipant] = useState<SeatingParticipant | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const mergedFloorTables = tables.map((t) => {
    const cfg = venueTableConfigs.find((v) => v.table_number === t.tableNumber)
    return {
      ...t,
      id: cfg?.id,
      x: cfg?.x ?? 0,
      y: cfg?.y ?? 0,
      shape: cfg?.shape ?? ('round' as const),
      name: cfg?.name ?? `שולחן ${t.tableNumber}`,
      rotation: cfg?.rotation,
    }
  })

  function handleDragStart(event: DragStartEvent) {
    const { active } = event
    setActiveId(active.id as string)

    // Guest from panel
    if (active.data.current?.type === 'guest-panel') {
      const pid = active.data.current?.participantId as string
      const p = participants.find(x => x.id === pid)
      if (p) setActiveParticipant(p)
      return
    }

    // Participant from table (edit mode)
    if (editMode) {
      const participantId = active.data.current?.participantId
      const sourceTable = active.data.current?.sourceTable
      if (sourceTable && participantId) {
        const table = tables.find((t) => t.tableNumber === sourceTable)
        const participant = table?.participants.find((p) => p.id === participantId)
        if (participant) setActiveParticipant(participant)
      }
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    setActiveParticipant(null)

    const { active, over } = event

    // Handle table move in floor view (edit mode)
    if (active.data.current?.type === 'table' && editMode) {
      const tableId = active.data.current?.tableId as string | undefined
      const tableNumber = active.data.current?.tableNumber as number | undefined
      const cfg = tableId
        ? venueTableConfigs.find((v) => v.id === tableId)
        : venueTableConfigs.find((v) => v.table_number === tableNumber)
      const resolvedId = tableId ?? cfg?.id
      if (resolvedId && active.rect.current?.translated) {
        const canvasEl = document.getElementById('floor-plan-canvas')
        const canvasRect = canvasEl?.getBoundingClientRect()
        if (canvasRect) {
          const newX = (active.rect.current.translated.left - canvasRect.left) / floorZoom
          const newY = (active.rect.current.translated.top - canvasRect.top) / floorZoom
          onTableMove(resolvedId, Math.max(0, newX), Math.max(0, newY))
        }
      }
      return
    }

    if (!over) return

    const overId = over.id as string

    // Guest dragged from panel → seat
    if (active.data.current?.type === 'guest-panel') {
      const participantId = active.data.current?.participantId as string
      // seat drop: "table-{N}-seat-{M}"
      const seatMatch = overId.match(/^table-(\d+)-seat-(\d+)$/)
      if (seatMatch) {
        const tableNum = parseInt(seatMatch[1])
        const seatNum = parseInt(seatMatch[2])
        onAssignToSeat(participantId, tableNum, seatNum)
        return
      }
      // table drop (any seat): "table-{N}"
      const tableMatch = overId.match(/^table-(\d+)$/)
      if (tableMatch) {
        const tableNum = parseInt(tableMatch[1])
        // find first empty seat
        const table = tables.find(t => t.tableNumber === tableNum)
        if (table) {
          const occupied = new Set(
            assignments.filter(a => a.table_number === tableNum).map(a => a.seat_number).filter(Boolean)
          )
          let firstEmpty = 1
          for (let s = 1; s <= table.capacity; s++) {
            if (!occupied.has(s)) { firstEmpty = s; break }
          }
          onAssignToSeat(participantId, tableNum, firstEmpty)
        }
        return
      }
    }

    // Participant dragged within floor (edit mode) between tables
    if (editMode) {
      const participantId = active.data.current?.participantId
      const sourceTable = active.data.current?.sourceTable

      let targetTable: number | undefined
      const parts = overId.split('-')
      if (overId.startsWith('table-') && parts.length >= 2) {
        targetTable = parseInt(parts[1])
      }
      if (!sourceTable || !targetTable || sourceTable === targetTable) return
      const targetTableObj = tables.find((t) => t.tableNumber === targetTable)
      if (targetTableObj && targetTableObj.participants.length >= targetTableObj.capacity) return
      onMoveParticipant(participantId, sourceTable, targetTable)
    }
  }

  const assignedCount = assignments.length

  return (
    <div className="flex flex-col gap-0" dir="rtl">
      {/* Top bar */}
      <div className="flex justify-between items-center bg-zinc-900 border border-zinc-700 rounded-t-xl px-4 py-3">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-base font-bold text-zinc-100">תכנון שולחנות והושבה</h2>
            <p className="text-xs text-zinc-500">
              {assignedCount} משובצים · {participants.length - assignedCount} ממתינים · {tables.length} שולחנות
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onOpenLayoutSelector}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-600 text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors text-sm"
          >
            <Settings2 size={15} />
            פריסת אולם
          </button>

          <button
            onClick={onGenerateSeating}
            disabled={isLoading || editMode}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm transition-colors"
          >
            <span>🤖</span>
            <span>{isLoading ? 'מחשב...' : 'שיבוץ חכם'}</span>
          </button>

          <button
            onClick={() => setEditMode(!editMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg transition-colors text-sm ${
              editMode
                ? 'bg-orange-900/40 border-orange-600 text-orange-300'
                : 'border-zinc-600 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            {editMode ? '✅ סיום' : '✏️ עריכה'}
          </button>
        </div>
      </div>

      {/* 3-column body */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex border-x border-b border-zinc-700 rounded-b-xl overflow-hidden" dir="ltr" style={{ minHeight: 600 }}>
          {/* Left: Toolbox */}
          <TableToolbox onAddTable={onAddTable} />

          {/* Center: Floor plan */}
          <div className="flex-1 relative min-w-0" id="floor-plan-canvas">
            <FloorPlanView
              tables={mergedFloorTables}
              editable={editMode}
              zoom={floorZoom}
              onZoomChange={setFloorZoom}
            />
          </div>

          {/* Right: Guest list */}
          <GuestListPanel
            participants={participants}
            assignments={assignments}
            onRemoveAssignment={onRemoveAssignment}
          />
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeId && activeParticipant ? (
            <div className="opacity-90 rotate-1 scale-105 pointer-events-none bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 flex items-center gap-2 shadow-xl">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                activeParticipant.is_vip ? 'bg-purple-600 text-white' : 'bg-zinc-700 text-zinc-200'
              }`}>
                {activeParticipant.first_name[0]}{activeParticipant.last_name[0]}
              </div>
              <span className="text-xs text-zinc-200 whitespace-nowrap">
                {activeParticipant.first_name} {activeParticipant.last_name}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
