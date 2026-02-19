import { useState } from 'react'
import { X } from 'lucide-react'
import type { VenueTable } from '../types'

interface LayoutPreset {
  id: string
  name: string
  tables: Omit<VenueTable, 'id' | 'event_id' | 'created_at' | 'updated_at'>[]
}

interface VenueLayoutSelectorProps {
  onSelect: (preset: LayoutPreset) => void
  onClose: () => void
  eventId: string
}

const presets: LayoutPreset[] = [
  {
    id: 'banquet',
    name: 'בנקווט',
    tables: Array.from({ length: 8 }, (_, i) => ({
      table_number: i + 1,
      name: `שולחן ${i + 1}`,
      shape: 'round' as const,
      capacity: 8,
      x: 80 + (i % 4) * 300,
      y: 100 + Math.floor(i / 4) * 300,
      rotation: 0,
    })),
  },
  {
    id: 'classroom',
    name: 'כיתה',
    tables: Array.from({ length: 6 }, (_, i) => ({
      table_number: i + 1,
      name: `שולחן ${i + 1}`,
      shape: 'rect' as const,
      capacity: 6,
      x: 80 + (i % 2) * 350,
      y: 100 + Math.floor(i / 2) * 250,
      rotation: 0,
    })),
  },
  {
    id: 'cocktail',
    name: 'קוקטייל',
    tables: [
      { table_number: 1, name: 'שולחן 1', shape: 'round' as const, capacity: 4, x: 100, y: 80, rotation: 0 },
      { table_number: 2, name: 'שולחן 2', shape: 'round' as const, capacity: 4, x: 400, y: 120, rotation: 0 },
      { table_number: 3, name: 'שולחן 3', shape: 'round' as const, capacity: 4, x: 700, y: 60, rotation: 0 },
      { table_number: 4, name: 'שולחן 4', shape: 'round' as const, capacity: 4, x: 200, y: 300, rotation: 0 },
      { table_number: 5, name: 'שולחן 5', shape: 'round' as const, capacity: 4, x: 550, y: 280, rotation: 0 },
      { table_number: 6, name: 'שולחן 6', shape: 'round' as const, capacity: 4, x: 850, y: 320, rotation: 0 },
      { table_number: 7, name: 'שולחן 7', shape: 'round' as const, capacity: 4, x: 120, y: 520, rotation: 0 },
      { table_number: 8, name: 'שולחן 8', shape: 'round' as const, capacity: 4, x: 430, y: 500, rotation: 0 },
      { table_number: 9, name: 'שולחן 9', shape: 'round' as const, capacity: 4, x: 700, y: 540, rotation: 0 },
      { table_number: 10, name: 'שולחן 10', shape: 'round' as const, capacity: 4, x: 950, y: 480, rotation: 0 },
    ],
  },
  {
    id: 'theatre',
    name: 'תיאטרון',
    tables: Array.from({ length: 10 }, (_, i) => ({
      table_number: i + 1,
      name: `שולחן ${i + 1}`,
      shape: 'rect' as const,
      capacity: 6,
      x: 80 + (i % 5) * 250,
      y: 200 + Math.floor(i / 5) * 300,
      rotation: 0,
    })),
  },
  {
    id: 'custom',
    name: 'ריק',
    tables: [],
  },
]

function MiniPreview({ preset }: { preset: LayoutPreset }) {
  const w = 120
  const h = 80
  const maxX = Math.max(1, ...preset.tables.map((t) => t.x + 50))
  const maxY = Math.max(1, ...preset.tables.map((t) => t.y + 50))

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="mx-auto">
      <rect width={w} height={h} fill="transparent" />
      {preset.tables.map((t) => {
        const cx = (t.x / maxX) * (w - 16) + 8
        const cy = (t.y / maxY) * (h - 16) + 8
        return t.shape === 'round' ? (
          <circle key={t.table_number} cx={cx} cy={cy} r={4} fill="#3b82f6" opacity={0.7} />
        ) : (
          <rect key={t.table_number} x={cx - 5} y={cy - 3} width={10} height={6} rx={1} fill="#3b82f6" opacity={0.7} />
        )
      })}
      {preset.tables.length === 0 && (
        <text x={w / 2} y={h / 2} textAnchor="middle" dominantBaseline="middle" fill="#71717a" fontSize={10}>
          קנבס ריק
        </text>
      )}
    </svg>
  )
}

export function VenueLayoutSelector({ onSelect, onClose }: VenueLayoutSelectorProps) {
  const [selected, setSelected] = useState<string | null>(null)

  const selectedPreset = presets.find((p) => p.id === selected)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-zinc-800 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700">
          <h2 className="text-lg font-bold text-zinc-100">בחר פריסת אולם</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200" aria-label="סגור">
            <X size={20} />
          </button>
        </div>

        {/* Presets grid */}
        <div className="p-6 grid grid-cols-3 gap-4">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => setSelected(preset.id)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:bg-zinc-700/50 ${
                selected === preset.id
                  ? 'ring-2 ring-blue-500 border-blue-500/50 bg-zinc-700/30'
                  : 'border-zinc-700'
              }`}
            >
              <MiniPreview preset={preset} />
              <span className="text-sm font-medium text-zinc-200">{preset.name}</span>
              <span className="text-xs text-zinc-500">
                {preset.tables.length > 0 ? `${preset.tables.length} שולחנות` : 'קנבס ריק'}
              </span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex flex-col items-center gap-2">
          <button
            disabled={!selectedPreset}
            onClick={() => selectedPreset && onSelect(selectedPreset)}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
          >
            בחר פריסה
          </button>
          <button onClick={onClose} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            דלג
          </button>
        </div>
      </div>
    </div>
  )
}

export type { LayoutPreset }
