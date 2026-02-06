import { Plus, Edit2, Trash2, Clock, Calendar, Building2, User, AlertTriangle } from 'lucide-react'
import type { Track, ProgramDay, Room, ExtendedSchedule } from '../../../types'

type ViewMode = 'list' | 'timeline' | 'grid' | 'calendar'

interface ProgramSessionsSectionProps {
  sessions: ExtendedSchedule[]
  filteredSessions: ExtendedSchedule[]
  tracks: Track[]
  programDays: ProgramDay[]
  rooms: Room[]
  viewMode: ViewMode
  selectedDayFilter: string
  selectedTrackFilter: string
  onDayFilterChange: (value: string) => void
  onTrackFilterChange: (value: string) => void
  onAddSession: () => void
  onEditSession: (session: ExtendedSchedule) => void
  onDeleteSession: (session: ExtendedSchedule) => void
  onOpenContingency: (session: ExtendedSchedule) => void
}

export function ProgramSessionsSection({
  sessions,
  filteredSessions,
  tracks,
  programDays,
  rooms,
  viewMode,
  selectedDayFilter,
  selectedTrackFilter,
  onDayFilterChange,
  onTrackFilterChange,
  onAddSession,
  onEditSession,
  onDeleteSession,
  onOpenContingency
}: ProgramSessionsSectionProps) {
  return (
    <div className="card" data-testid="session-builder">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">מפגשים</h2>
        <div className="flex gap-2">
          <select
            value={selectedDayFilter}
            onChange={(e) => onDayFilterChange(e.target.value)}
            className="border rounded-lg px-3 py-1 text-sm"
            data-testid="day-filter-select"
          >
            <option value="all">כל הימים</option>
            {programDays.map((day, i) => (
              <option key={day.id} value={day.id}>יום {i + 1} - {day.theme || new Date(day.date).toLocaleDateString('he-IL')}</option>
            ))}
          </select>
          <select
            value={selectedTrackFilter}
            onChange={(e) => onTrackFilterChange(e.target.value)}
            className="border rounded-lg px-3 py-1 text-sm"
            data-testid="track-filter-select"
          >
            <option value="all">כל המסלולים</option>
            {tracks.map(track => (
              <option key={track.id} value={track.id}>{track.name}</option>
            ))}
          </select>
          <button
            onClick={onAddSession}
            className="btn-primary flex items-center gap-2"
            data-testid="add-session-button"
            aria-label="הוסף מפגש חדש"
          >
            <Plus size={18} />
            הוסף מפגש
          </button>
        </div>
      </div>

      {/* Sessions List View */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              data-testid="session-card"
              data-track-index={tracks.findIndex(t => t.id === session.track_id)}
              data-day-index={programDays.findIndex(d => d.id === session.program_day_id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {session.track_id && (
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tracks.find(t => t.id === session.track_id)?.color || '#ccc' }}
                        data-testid="session-track-indicator"
                        data-track-index={tracks.findIndex(t => t.id === session.track_id)}
                      ></div>
                    )}
                    <h3 className="font-bold">{session.title}</h3>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
                    <span data-testid="session-duration">
                      <Clock size={14} className="inline mr-1" />
                      {new Date(session.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })} -
                      {new Date(session.end_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {session.room_id && (
                      <span>
                        <Building2 size={14} className="inline mr-1" />
                        {rooms.find(r => r.id === session.room_id)?.name}
                      </span>
                    )}
                    {session.program_day_id && (
                      <span data-testid="session-day-indicator" data-day-index={programDays.findIndex(d => d.id === session.program_day_id)}>
                        <Calendar size={14} className="inline mr-1" />
                        יום {programDays.findIndex(d => d.id === session.program_day_id) + 1}
                      </span>
                    )}
                  </div>
                  {session.session_speakers && session.session_speakers.length > 0 && (
                    <div className="flex gap-2 mt-2" data-testid="session-speakers">
                      {session.session_speakers.map(ss => (
                        <span key={ss.id} className="text-xs bg-white/5 px-2 py-1 rounded flex items-center gap-1">
                          <User size={12} />
                          {ss.speaker?.name || 'דובר'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => onOpenContingency(session)}
                    className="p-1 hover:bg-orange-500/10 rounded text-orange-500"
                    title="הפעל תוכנית מגירה"
                    data-testid="contingency-session-button"
                  >
                    <AlertTriangle size={16} />
                  </button>
                  <button
                    onClick={() => onEditSession(session)}
                    className="p-1 hover:bg-white/5 rounded"
                    data-testid="edit-session-button"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => onDeleteSession(session)}
                    className="p-1 hover:bg-red-500/10 rounded text-red-500"
                    data-testid="delete-session-button"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredSessions.length === 0 && (
            <div className="text-center py-8 text-zinc-400">
              <Calendar className="mx-auto mb-2" size={32} />
              <p>אין מפגשים עדיין</p>
            </div>
          )}
        </div>
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div data-testid="timeline-view">
          <div className="relative border-r-2 border-orange-500/30 pr-4">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className="mb-4 relative"
                data-testid="timeline-session"
                draggable
              >
                <div className="absolute -right-2 top-0 w-4 h-4 rounded-full bg-orange-500"></div>
                <div className="mr-4 border rounded-lg p-3 hover:shadow-md transition-shadow">
                  <p className="text-xs text-zinc-400">
                    {new Date(session.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <h4 className="font-bold">{session.title}</h4>
                </div>
              </div>
            ))}
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="mb-4 h-12 border border-dashed rounded" data-testid="timeline-slot"></div>
            ))}
          </div>
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-3 gap-4" data-testid="grid-view">
          {tracks.map(track => (
            <div key={track.id} className="border rounded-lg p-4">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: track.color }}></div>
                {track.name}
              </h3>
              <div className="space-y-2">
                {filteredSessions.filter(s => s.track_id === track.id).map(session => (
                  <div key={session.id} className="border rounded p-2 text-sm">
                    <p className="font-medium">{session.title}</p>
                    <p className="text-zinc-400 text-xs">
                      {new Date(session.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div data-testid="calendar-view">
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(day => (
              <div key={day} className="text-center font-bold text-zinc-400 p-2">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {programDays.map(day => (
              <div key={day.id} className="border rounded p-2 min-h-[100px]">
                <p className="font-bold text-sm">{new Date(day.date).getDate()}</p>
                <div className="space-y-1 mt-1">
                  {sessions.filter(s => s.program_day_id === day.id).slice(0, 3).map(session => (
                    <div key={session.id} className="text-xs bg-orange-100 p-1 rounded truncate">
                      {session.title}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
