import { Plus, Edit2, Trash2, User, Shield } from 'lucide-react'
import type { Speaker, ExtendedSchedule } from '../../../types'

interface ProgramSpeakersSectionProps {
  speakers: Speaker[]
  sessions: ExtendedSchedule[]
  speakerFilter: string
  onSpeakerFilterChange: (filter: string) => void
  onAddSpeaker: () => void
  onEditSpeaker: (speaker: Speaker) => void
  onDeleteSpeaker: (speaker: Speaker) => void
}

export function ProgramSpeakersSection({
  speakers,
  sessions,
  speakerFilter,
  onSpeakerFilterChange,
  onAddSpeaker,
  onEditSpeaker,
  onDeleteSpeaker
}: ProgramSpeakersSectionProps) {
  return (
    <div className="card mb-6" data-testid="speakers-section">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold" data-testid="speakers-title">דוברים</h2>
        <div className="flex gap-2">
          <select
            value={speakerFilter}
            onChange={(e) => onSpeakerFilterChange(e.target.value)}
            className="border rounded-lg px-3 py-1 text-sm"
            data-testid="speaker-filter-select"
          >
            <option value="all">כל הדוברים</option>
            <option value="confirmed">מאושרים</option>
            <option value="pending">ממתינים</option>
          </select>
          <button
            onClick={onAddSpeaker}
            className="btn-primary flex items-center gap-2"
            data-testid="add-speaker-button"
          >
            <Plus size={18} />
            הוסף דובר
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {speakers
          .filter(s => speakerFilter === 'all' || (speakerFilter === 'confirmed' ? s.is_confirmed : !s.is_confirmed))
          .map(speaker => (
            <div key={speaker.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow" data-testid="speaker-card">
              <div className="flex gap-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center" data-testid="speaker-photo">
                  {speaker.photo_url ? (
                    <img src={speaker.photo_url} alt={speaker.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User size={24} className="text-zinc-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold">{speaker.name}</h3>
                      {speaker.title && <p className="text-sm text-zinc-400">{speaker.title}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => onEditSpeaker(speaker)}
                        className="p-1 hover:bg-white/5 rounded"
                        data-testid="edit-speaker-button"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => onDeleteSpeaker(speaker)}
                        className="p-1 hover:bg-red-500/10 rounded text-red-500"
                        data-testid="delete-speaker-button"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <span className={`text-xs px-2 py-1 rounded ${speaker.is_confirmed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`} data-testid="speaker-status">
                      {speaker.is_confirmed ? 'מאושר' : 'ממתין לאישור'}
                    </span>
                  </div>
                  {speaker.backup_speaker_id && (
                    <div className="flex items-center gap-1 text-xs text-emerald-400 mt-2" data-testid="backup-speaker-indicator">
                      <Shield size={12} />
                      דובר גיבוי מוגדר
                    </div>
                  )}
                  <p className="text-sm text-zinc-400 mt-2" data-testid="speaker-sessions-count">
                    {sessions.filter(s => s.session_speakers?.some(ss => ss.speaker_id === speaker.id)).length} מפגשים
                  </p>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
