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
import { LayoutGrid, Map as MapIcon, Settings2 } from 'lucide-react'
import { TableAssignmentCard } from './TableAssignmentCard'
import { FloorPlanView } from './FloorPlanView'
import { TableManagerPanel } from './TableManagerPanel'
import { DraggableParticipant } from '@/components/networking/DraggableParticipant'
import type { SeatingParticipant, TableWithParticipants, VenueTable } from '@/modules/networking/types'

interface SeatingPlanViewProps {
  tables: TableWithParticipants[]
  onMoveParticipant: (participantId: string, fromTable: number, toTable: number) => void
  onGenerateSeating: () => void
  trackColors?: Map<string, string>
  isLoading?: boolean
  venueTableConfigs: VenueTable[]
  onTableMove: (tableId: string, x: number, y: number) => void
  onAddTable: (name: string, shape: 'round' | 'rect', capacity: number) => void
  onUpdateTable: (id: string, changes: Partial<Pick<VenueTable, 'name' | 'shape' | 'capacity'>>) => void
  onDeleteTable: (id: string) => void
  onOpenLayoutSelector: () => void
}

export function SeatingPlanView({
  tables,
  onMoveParticipant,
  onGenerateSeating,
  trackColors,
  isLoading = false,
  venueTableConfigs,
  onTableMove,
  onAddTable,
  onUpdateTable,
  onDeleteTable,
  onOpenLayoutSelector,
}: SeatingPlanViewProps) {
  const [editMode, setEditMode] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'floor'>('grid')
  const [floorZoom, setFloorZoom] = useState(1)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeParticipant, setActiveParticipant] = useState<SeatingParticipant | null>(null)
  const [tablePanelOpen, setTablePanelOpen] = useState(true)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Merge tables with venue configs for floor view
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
    if (!editMode) return

    const { active } = event
    const participantId = active.data.current?.participantId
    const sourceTable = active.data.current?.sourceTable

    setActiveId(active.id as string)

    if (sourceTable && participantId) {
      const table = tables.find((t) => t.tableNumber === sourceTable)
      const participant = table?.participants.find((p) => p.id === participantId)
      if (participant) setActiveParticipant(participant)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    setActiveParticipant(null)

    if (!editMode) return

    const { active, over } = event

    // Handle table drag in floor view
    if (active.data.current?.type === 'table') {
      const tableId = active.data.current?.tableId as string | undefined
      const tableNumber = active.data.current?.tableNumber as number | undefined
      const cfg = tableId ? venueTableConfigs.find((v) => v.id === tableId) : venueTableConfigs.find((v) => v.table_number === tableNumber)
      if (tableId && active.rect.current?.translated) {
        const canvasEl = document.getElementById('floor-plan-canvas')
        const canvasRect = canvasEl?.getBoundingClientRect()
        if (canvasRect) {
          const newX = (active.rect.current.translated.left - canvasRect.left) / floorZoom
          const newY = (active.rect.current.translated.top - canvasRect.top) / floorZoom
          onTableMove(tableId, Math.max(0, newX), Math.max(0, newY))
        }
      } else if (!tableId && cfg?.id && active.rect.current?.translated) {
        const canvasEl = document.getElementById('floor-plan-canvas')
        const canvasRect = canvasEl?.getBoundingClientRect()
        if (canvasRect) {
          const newX = (active.rect.current.translated.left - canvasRect.left) / floorZoom
          const newY = (active.rect.current.translated.top - canvasRect.top) / floorZoom
          onTableMove(cfg.id, Math.max(0, newX), Math.max(0, newY))
        }
      }
      return
    }

    if (!over) return

    const participantId = active.data.current?.participantId
    const sourceTable = active.data.current?.sourceTable

    const overId = over.id as string
    let targetTable: number | undefined

    if (overId.startsWith('table-')) {
      const parts = overId.split('-')
      targetTable = parseInt(parts[1])
    }

    if (!sourceTable || !targetTable || sourceTable === targetTable) return

    const targetTableObj = tables.find((t) => t.tableNumber === targetTable)
    if (targetTableObj && targetTableObj.participants.length >= targetTableObj.capacity) {
      return
    }

    onMoveParticipant(participantId, sourceTable, targetTable)
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Actions */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">תכנון שולחנות והושבה</h2>
            <p className="text-sm text-gray-500">
              {tables.reduce((acc, t) => acc + t.participants.length, 0)} משתתפים משובצים ב-{tables.length} שולחנות
            </p>
          </div>

          {/* View Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LayoutGrid size={16} />
              רשת
            </button>
            <button
              onClick={() => setViewMode('floor')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'floor' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <MapIcon size={16} />
              מפת אולם
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onOpenLayoutSelector}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Settings2 size={18} />
            הגדרות אולם
          </button>

          <button
            onClick={onGenerateSeating}
            disabled={isLoading || editMode}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span>🤖</span>
            <span>{isLoading ? 'מחשב...' : 'יצירת שיבוץ חכם'}</span>
          </button>

          <button
            onClick={() => setEditMode(!editMode)}
            className={`
              flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors
              ${editMode ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}
            `}
          >
            {editMode ? '✅ סיום עריכה' : '✏️ עריכה ידנית'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {tables.map((table) => (
              <TableAssignmentCard
                key={table.tableNumber}
                table={table}
                editable={editMode}
                trackColors={trackColors}
              />
            ))}
          </div>
        ) : (
          <div className="flex rounded-2xl overflow-hidden border border-zinc-700">
            <div className="flex-1" id="floor-plan-canvas">
              <FloorPlanView
                tables={mergedFloorTables}
                editable={editMode}
                zoom={floorZoom}
                onZoomChange={setFloorZoom}
              />
            </div>
            <TableManagerPanel
              tables={venueTableConfigs}
              onAdd={onAddTable}
              onUpdate={onUpdateTable}
              onDelete={onDeleteTable}
              isOpen={tablePanelOpen}
              onToggle={() => setTablePanelOpen(!tablePanelOpen)}
            />
          </div>
        )}

        {/* Drag Overlay */}
        <DragOverlay>
          {activeId && activeParticipant ? (
            <div className="opacity-90 rotate-3 scale-105 pointer-events-none">
              <DraggableParticipant
                participant={activeParticipant}
                tableNumber={0}
                trackColors={trackColors}
                disabled={false}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
