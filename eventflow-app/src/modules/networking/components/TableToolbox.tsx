import { useState } from 'react'
import { Plus } from 'lucide-react'

interface TableToolboxProps {
  onAddTable: (name: string, shape: 'round' | 'rect', capacity: number) => void
}

const PRESETS = [
  { label: 'שולחן ל-2', capacity: 2, shape: 'rect' as const, icon: '🪑' },
  { label: 'שולחן ל-4', capacity: 4, shape: 'round' as const, icon: '🪑' },
  { label: 'שולחן ל-8', capacity: 8, shape: 'round' as const, icon: '🪑' },
  { label: 'כסאות בלבד', capacity: 6, shape: 'rect' as const, icon: '🪑', chairsOnly: true },
]

export function TableToolbox({ onAddTable }: TableToolboxProps) {
  const [customCapacity, setCustomCapacity] = useState('')
  const [customShape, setCustomShape] = useState<'round' | 'rect'>('round')
  const [tableCount, setTableCount] = useState(1)

  function handlePreset(preset: typeof PRESETS[number]) {
    for (let i = 0; i < tableCount; i++) {
      onAddTable(
        preset.chairsOnly ? 'כסאות' : `שולחן ל-${preset.capacity}`,
        preset.shape,
        preset.capacity
      )
    }
  }

  function handleCustomAdd() {
    const cap = parseInt(customCapacity)
    if (!cap || cap < 1 || cap > 20) return
    for (let i = 0; i < tableCount; i++) {
      onAddTable(`שולחן ל-${cap}`, customShape, cap)
    }
    setCustomCapacity('')
  }

  return (
    <div className="w-52 shrink-0 bg-zinc-900 border-l border-zinc-700 p-4 flex flex-col gap-4 overflow-y-auto" dir="rtl">
      <div>
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">הוסף שולחנות</h3>

        {/* Count selector */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-zinc-400">כמות:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTableCount(Math.max(1, tableCount - 1))}
              className="w-6 h-6 bg-zinc-800 border border-zinc-600 text-zinc-200 rounded text-sm font-bold flex items-center justify-center hover:bg-zinc-700"
            >
              -
            </button>
            <span className="w-6 text-center text-zinc-200 text-sm font-bold">{tableCount}</span>
            <button
              onClick={() => setTableCount(Math.min(10, tableCount + 1))}
              className="w-6 h-6 bg-zinc-800 border border-zinc-600 text-zinc-200 rounded text-sm font-bold flex items-center justify-center hover:bg-zinc-700"
            >
              +
            </button>
          </div>
        </div>

        {/* Presets */}
        <div className="flex flex-col gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handlePreset(preset)}
              className="flex items-center gap-2 px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 hover:border-zinc-400 text-zinc-200 rounded-lg text-sm transition-all text-right"
            >
              <Plus size={14} className="text-zinc-400 shrink-0" />
              <span>{preset.label}</span>
              {preset.chairsOnly && (
                <span className="text-xs text-zinc-500 mr-auto">(ללא שולחן)</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Custom */}
      <div>
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">מותאם אישית</h3>
        <div className="flex flex-col gap-2">
          <input
            type="number"
            min={1}
            max={20}
            value={customCapacity}
            onChange={e => setCustomCapacity(e.target.value)}
            placeholder="מספר מקומות"
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 text-zinc-200 rounded-lg text-sm placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400"
            dir="rtl"
          />
          <div className="flex gap-1">
            <button
              onClick={() => setCustomShape('round')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                customShape === 'round'
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-zinc-800 border-zinc-600 text-zinc-400 hover:border-zinc-400'
              }`}
            >
              עגול
            </button>
            <button
              onClick={() => setCustomShape('rect')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                customShape === 'rect'
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-zinc-800 border-zinc-600 text-zinc-400 hover:border-zinc-400'
              }`}
            >
              מלבני
            </button>
          </div>
          <button
            onClick={handleCustomAdd}
            disabled={!customCapacity || parseInt(customCapacity) < 1}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
          >
            <Plus size={14} />
            הוסף
          </button>
        </div>
      </div>
    </div>
  )
}
