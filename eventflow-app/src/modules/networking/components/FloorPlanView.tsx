import { useDraggable } from '@dnd-kit/core'
import { VisualTable } from './VisualTable'
import type { TableWithParticipants } from '../types'

interface FloorPlanViewProps {
  tables: (TableWithParticipants & { id?: string; x?: number; y?: number; rotation?: number; name?: string; shape?: 'round' | 'rect' })[]
  onTableMove?: (tableId: string, x: number, y: number) => void
  onParticipantMove?: (participantId: string, fromTable: number, toTable: number) => void
  zoom: number
  onZoomChange: (z: number) => void
}

function getAutoPosition(index: number) {
  const cols = 4
  const row = Math.floor(index / cols)
  const col = index % cols
  return { x: 80 + col * 250, y: 100 + row * 250 }
}

interface DraggableTableWrapperProps {
  table: FloorPlanViewProps['tables'][number]
  index: number
  children: React.ReactNode
}

function DraggableTableWrapper({ table, index, children }: DraggableTableWrapperProps) {
  const auto = getAutoPosition(index)
  const posX = table.x ?? auto.x
  const posY = table.y ?? auto.y

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `drag-table-${table.tableNumber}`,
    data: { type: 'table', tableNumber: table.tableNumber, tableId: table.id },
  })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="absolute"
      style={{
        left: posX,
        top: posY,
        transform: isDragging && transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: isDragging ? 50 : 1,
      }}
    >
      {children}
    </div>
  )
}

export function FloorPlanView({
  tables,
  zoom,
  onZoomChange,
}: FloorPlanViewProps) {
  return (
    <div
      className="relative w-full overflow-auto bg-zinc-900 rounded-2xl border border-zinc-700 min-h-[600px]"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      {/* Zoom Controls */}
      <div className="absolute top-4 left-4 flex gap-2 z-10">
        <button
          onClick={() => onZoomChange(Math.round(Math.max(0.5, zoom - 0.1) * 10) / 10)}
          aria-label="הקטן תצוגה"
          className="w-9 h-9 bg-zinc-800 border border-zinc-600 text-zinc-200 rounded-lg flex items-center justify-center font-bold hover:bg-zinc-700 transition-colors"
        >
          -
        </button>
        <button
          onClick={() => onZoomChange(Math.round(Math.min(2.0, zoom + 0.1) * 10) / 10)}
          aria-label="הגדל תצוגה"
          className="w-9 h-9 bg-zinc-800 border border-zinc-600 text-zinc-200 rounded-lg flex items-center justify-center font-bold hover:bg-zinc-700 transition-colors"
        >
          +
        </button>
      </div>

      {/* Canvas */}
      <div
        className="relative origin-top-left"
        style={{ width: 1600, height: 1000, transform: `scale(${zoom})` }}
      >
        {/* Stage */}
        <div className="w-1/3 h-8 bg-zinc-700 mx-auto rounded-b-3xl flex items-center justify-center text-zinc-400 text-xs tracking-widest font-bold">
          במה / מסך מרכזי
        </div>

        {/* Tables */}
        {tables.map((table, index) => (
          <DraggableTableWrapper
            key={table.tableNumber}
            table={table}
            index={index}
          >
            <VisualTable
              id={`vtable-${table.tableNumber}`}
              tableNumber={table.tableNumber}
              type={table.shape ?? (table.capacity > 4 ? 'round' : 'rect')}
              capacity={table.capacity}
              participants={table.participants}
              isVip={table.isVipTable}
            />
            <p className="text-xs text-zinc-400 text-center mt-1">
              {table.name ?? `שולחן ${table.tableNumber}`}
            </p>
          </DraggableTableWrapper>
        ))}
      </div>

      {/* Empty State */}
      {tables.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
          <span className="text-4xl mb-4">🏠</span>
          <p>גרור שולחנות לאולם</p>
        </div>
      )}
    </div>
  )
}
