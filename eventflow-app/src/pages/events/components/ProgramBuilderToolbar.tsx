import { List, Clock, Grid3X3, CalendarDays, Download, AlertTriangle } from 'lucide-react'

type ViewMode = 'list' | 'timeline' | 'grid' | 'calendar'

interface Conflict {
  type: string
  message: string
  scheduleId: string
}

interface ProgramBuilderToolbarProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  conflicts: Conflict[]
  showConflictPanel: boolean
  onToggleConflictPanel: () => void
  onExportCsv: () => void
}

export function ProgramBuilderToolbar({
  viewMode,
  onViewModeChange,
  conflicts,
  showConflictPanel,
  onToggleConflictPanel,
  onExportCsv
}: ProgramBuilderToolbarProps) {
  return (
    <>
      {/* Program Builder Toolbar */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => onViewModeChange('list')}
            aria-label="תצוגת רשימה"
            aria-pressed={viewMode === 'list'}
            className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-orange-500 text-white' : 'hover:bg-white/5'}`}
            data-testid="view-toggle-list"
          >
            <List size={20} />
          </button>
          <button
            onClick={() => onViewModeChange('timeline')}
            aria-label="תצוגת ציר זמן"
            aria-pressed={viewMode === 'timeline'}
            className={`p-2 rounded-lg ${viewMode === 'timeline' ? 'bg-orange-500 text-white' : 'hover:bg-white/5'}`}
            data-testid="view-toggle-timeline"
          >
            <Clock size={20} />
          </button>
          <button
            onClick={() => onViewModeChange('grid')}
            aria-label="תצוגת גריד"
            aria-pressed={viewMode === 'grid'}
            className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-orange-500 text-white' : 'hover:bg-white/5'}`}
            data-testid="view-toggle-grid"
          >
            <Grid3X3 size={20} />
          </button>
          <button
            onClick={() => onViewModeChange('calendar')}
            aria-label="תצוגת לוח שנה"
            aria-pressed={viewMode === 'calendar'}
            className={`p-2 rounded-lg ${viewMode === 'calendar' ? 'bg-orange-500 text-white' : 'hover:bg-white/5'}`}
            data-testid="view-toggle-calendar"
          >
            <CalendarDays size={20} />
          </button>
        </div>

        <div className="flex gap-2 mr-auto">
          <button
            onClick={onExportCsv}
            className="btn-secondary flex items-center gap-2"
            data-testid="export-program-csv-button"
          >
            <Download size={18} />
            CSV
          </button>
          <button
            onClick={onToggleConflictPanel}
            className={`btn-secondary flex items-center gap-2 ${conflicts.length > 0 ? 'text-red-500' : ''}`}
            data-testid="conflicts-panel-toggle"
          >
            <AlertTriangle size={18} />
            התנגשויות ({conflicts.length})
          </button>
        </div>
      </div>

      {/* Conflicts Panel */}
      {showConflictPanel && (
        <div className="card mb-6 border-red-500/30 bg-red-500/10" data-testid="conflicts-panel">
          <h3 className="font-bold text-red-400 mb-2">התנגשויות שזוהו</h3>
          <p data-testid="conflicts-count">{conflicts.length} התנגשויות</p>
          <div className="space-y-2 mt-2">
            {conflicts.map((c, i) => (
              <div key={i} className="p-2 bg-[#1a1d27] rounded border border-red-200">
                <p className="text-sm">{c.message}</p>
              </div>
            ))}
            {conflicts.length === 0 && (
              <p className="text-emerald-400">אין התנגשויות!</p>
            )}
          </div>
        </div>
      )}

      {/* Live Update Indicator */}
      <div className="flex items-center gap-2 mb-4 text-sm text-zinc-400" data-testid="live-update-indicator">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
        <span>עדכון בזמן אמת</span>
      </div>
    </>
  )
}
