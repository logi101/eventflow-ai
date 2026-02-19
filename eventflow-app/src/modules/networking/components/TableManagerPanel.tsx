import { useState } from 'react'
import { ChevronRight, Trash2, X, Plus } from 'lucide-react'
import type { VenueTable } from '../types'

interface TableManagerPanelProps {
  tables: VenueTable[]
  onAdd: (name: string, shape: 'round' | 'rect', capacity: number) => void
  onUpdate: (id: string, changes: Partial<Pick<VenueTable, 'name' | 'shape' | 'capacity'>>) => void
  onDelete: (id: string) => void
  isOpen: boolean
  onToggle: () => void
}

export function TableManagerPanel({
  tables,
  onAdd,
  onUpdate,
  onDelete,
  isOpen,
  onToggle,
}: TableManagerPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newShape, setNewShape] = useState<'round' | 'rect'>('round')
  const [newCapacity, setNewCapacity] = useState(8)
  const [editingName, setEditingName] = useState<string | null>(null)
  const [editingCapacity, setEditingCapacity] = useState<string | null>(null)

  function handleAdd() {
    const name = newName.trim() || `שולחן ${tables.length + 1}`
    onAdd(name, newShape, newCapacity)
    setShowAddForm(false)
    setNewName('')
    setNewShape('round')
    setNewCapacity(8)
  }

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="w-8 bg-zinc-800 border-l border-zinc-700 flex items-center justify-center hover:bg-zinc-700 transition-colors shrink-0"
        aria-label="פתח ניהול שולחנות"
      >
        <ChevronRight size={16} className="text-zinc-400" />
      </button>
    )
  }

  return (
    <div className="w-[280px] bg-zinc-800 border-l border-zinc-700 flex flex-col shrink-0 overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
        <h3 className="text-sm font-bold text-zinc-200">ניהול שולחנות</h3>
        <button onClick={onToggle} className="text-zinc-400 hover:text-zinc-200" aria-label="סגור פאנל">
          <X size={16} />
        </button>
      </div>

      {/* Table list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {tables.map((table) => (
          <div key={table.id} className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-700/50">
            <span className="text-zinc-400 text-sm w-5 text-center">
              {table.shape === 'round' ? '●' : '▬'}
            </span>

            {editingName === table.id ? (
              <input
                autoFocus
                className="flex-1 bg-zinc-700 text-zinc-100 text-sm rounded px-1.5 py-0.5 outline-none"
                defaultValue={table.name}
                onBlur={(e) => { onUpdate(table.id, { name: e.target.value }); setEditingName(null) }}
                onKeyDown={(e) => { if (e.key === 'Enter') { onUpdate(table.id, { name: (e.target as HTMLInputElement).value }); setEditingName(null) } }}
              />
            ) : (
              <span
                className="flex-1 text-sm text-zinc-200 cursor-pointer truncate"
                onClick={() => setEditingName(table.id)}
              >
                {table.name}
              </span>
            )}

            {editingCapacity === table.id ? (
              <input
                autoFocus
                type="number"
                min={2}
                max={20}
                className="w-12 bg-zinc-700 text-zinc-100 text-xs rounded px-1 py-0.5 outline-none text-center"
                defaultValue={table.capacity}
                onBlur={(e) => { onUpdate(table.id, { capacity: Math.min(20, Math.max(2, Number(e.target.value))) }); setEditingCapacity(null) }}
                onKeyDown={(e) => { if (e.key === 'Enter') { onUpdate(table.id, { capacity: Math.min(20, Math.max(2, Number((e.target as HTMLInputElement).value))) }); setEditingCapacity(null) } }}
              />
            ) : (
              <span
                className="text-xs bg-zinc-600 text-zinc-300 px-2 py-0.5 rounded cursor-pointer"
                onClick={() => setEditingCapacity(table.id)}
              >
                {table.capacity} מקומות
              </span>
            )}

            <button
              onClick={() => onDelete(table.id)}
              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
              aria-label={`מחק ${table.name}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="px-3 pb-2 space-y-2 border-t border-zinc-700 pt-2">
          <input
            className="w-full bg-zinc-700 text-zinc-100 text-sm rounded-lg px-3 py-1.5 outline-none placeholder:text-zinc-500"
            placeholder={`שולחן ${tables.length + 1}`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setNewShape('round')}
              className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${newShape === 'round' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'border-zinc-600 text-zinc-400 hover:border-zinc-500'}`}
            >
              עגול ●
            </button>
            <button
              onClick={() => setNewShape('rect')}
              className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${newShape === 'rect' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'border-zinc-600 text-zinc-400 hover:border-zinc-500'}`}
            >
              מלבני ▬
            </button>
          </div>
          <input
            type="number"
            min={2}
            max={20}
            value={newCapacity}
            onChange={(e) => setNewCapacity(Number(e.target.value))}
            className="w-full bg-zinc-700 text-zinc-100 text-sm rounded-lg px-3 py-1.5 outline-none"
          />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-1.5 rounded-lg transition-colors">
              הוסף
            </button>
            <button onClick={() => setShowAddForm(false)} className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm py-1.5 rounded-lg transition-colors">
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* Add button */}
      {!showAddForm && (
        <div className="p-3 border-t border-zinc-700">
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors text-sm"
          >
            <Plus size={16} />
            הוסף שולחן
          </button>
        </div>
      )}
    </div>
  )
}
