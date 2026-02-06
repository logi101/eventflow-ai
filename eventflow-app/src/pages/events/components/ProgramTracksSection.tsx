import { Plus, Edit2, Trash2 } from 'lucide-react'
import type { Track, ExtendedSchedule } from '../../../types'

interface ProgramTracksSectionProps {
  tracks: Track[]
  sessions: ExtendedSchedule[]
  onAddTrack: () => void
  onEditTrack: (track: Track) => void
  onDeleteTrack: (track: Track) => void
}

export function ProgramTracksSection({
  tracks,
  sessions,
  onAddTrack,
  onEditTrack,
  onDeleteTrack
}: ProgramTracksSectionProps) {
  return (
    <div className="card mb-6" data-testid="tracks-section">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold" data-testid="tracks-title">מסלולים</h2>
        <button
          onClick={onAddTrack}
          className="btn-primary flex items-center gap-2"
          data-testid="add-track-button"
        >
          <Plus size={18} />
          הוסף מסלול
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tracks.map(track => (
          <div key={track.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow" data-testid="track-card">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: track.color }}
                  data-testid="track-color-indicator"
                ></div>
                <h3 className="font-bold">{track.name}</h3>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => onEditTrack(track)}
                  className="p-1 hover:bg-white/5 rounded"
                  data-testid="edit-track-button"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => onDeleteTrack(track)}
                  className="p-1 hover:bg-red-500/10 rounded text-red-500"
                  data-testid="delete-track-button"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            {track.description && <p className="text-sm text-zinc-400 mt-2">{track.description}</p>}
            <p className="text-sm text-zinc-400 mt-2" data-testid="track-sessions-count">
              {sessions.filter(s => s.track_id === track.id).length} מפגשים
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
