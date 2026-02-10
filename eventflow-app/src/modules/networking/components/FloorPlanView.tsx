import { useState } from 'react'
import { motion } from 'framer-motion'
import { VisualTable } from './VisualTable'
import type { TableWithParticipants } from '../types'

interface FloorPlanViewProps {
  tables: TableWithParticipants[]
  onTableClick?: (tableNumber: number) => void
}

export function FloorPlanView({ tables, onTableClick }: FloorPlanViewProps) {
  const [zoom, setZoom] = useState(1)

  // תבנית פריסה אוטומטית פשוטה (Grid)
  // בעתיד נוכל לשמור קואורדינטות X,Y ב-Database
  const getTablePosition = (index: number) => {
    const cols = 4
    const row = Math.floor(index / cols)
    const col = index % cols
    return {
      x: col * 250,
      y: row * 250
    }
  }

  return (
    <div className="relative w-full overflow-auto bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 min-h-[600px] p-12">
      {/* Zoom Controls */}
      <div className="absolute top-4 left-4 flex gap-2 z-10">
        <button 
          onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
          className="w-10 h-10 bg-white shadow-sm border border-gray-200 rounded-full flex items-center justify-center font-bold hover:bg-gray-50"
        >
          -
        </button>
        <button 
          onClick={() => setZoom(z => Math.min(2, z + 0.1))}
          className="w-10 h-10 bg-white shadow-sm border border-gray-200 rounded-full flex items-center justify-center font-bold hover:bg-gray-50"
        >
          +
        </button>
      </div>

      {/* Map Content */}
      <motion.div 
        animate={{ scale: zoom }}
        className="relative transition-transform origin-top-left"
        style={{ width: 1200, height: 1000 }}
      >
        {/* Stage / Screen Indicator */}
        <div className="w-1/2 h-8 bg-slate-200 mx-auto mb-20 rounded-b-3xl flex items-center justify-center text-slate-400 font-bold text-sm tracking-widest">
          במה / מסך מרכזי
        </div>

        {/* Render Tables */}
        {tables.map((table, index) => {
          const pos = getTablePosition(index)
          return (
            <div 
              key={table.tableNumber}
              className="absolute"
              style={{ left: pos.x, top: pos.y }}
            >
              <VisualTable
                id={`vtable-${table.tableNumber}`}
                tableNumber={table.tableNumber}
                type={table.capacity > 4 ? 'round' : 'rect'}
                capacity={table.capacity}
                participants={table.participants}
                isVip={table.isVipTable}
              />
            </div>
          )
        })}
      </motion.div>

      {/* Empty State */}
      {tables.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-slate-400">
          <span className="text-4xl mb-4">🏠</span>
          <p>טרם הוגדרו שולחנות לאירוע זה</p>
        </div>
      )}
    </div>
  )
}
