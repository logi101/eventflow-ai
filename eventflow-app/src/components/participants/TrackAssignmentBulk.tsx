// ═══════════════════════════════════════════════════════════════════════════
// TrackAssignmentBulk Component - Bulk track assignment bar
// ═══════════════════════════════════════════════════════════════════════════
// Bar that appears when participants are selected, allowing bulk track assignment

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useTrackAssignment } from '@/hooks/useTrackAssignment'
import type { Track } from '@/types'

interface TrackAssignmentBulkProps {
  eventId: string
  selectedParticipantIds: string[]
  onClearSelection: () => void
}

export function TrackAssignmentBulk({
  eventId,
  selectedParticipantIds,
  onClearSelection,
}: TrackAssignmentBulkProps) {
  const { assignTracks } = useTrackAssignment(eventId)

  // Fetch active tracks for this event
  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return data as Track[]
    },
  })

  const handleAssignTrack = async (trackId: string) => {
    try {
      await assignTracks.mutateAsync({
        participantIds: selectedParticipantIds,
        trackId,
        isPrimary: false,
      })
      // Clear selection after successful assignment
      onClearSelection()
    } catch (error) {
      console.error('Failed to assign track:', error)
      // Error handling can be enhanced with toast notifications
    }
  }

  if (selectedParticipantIds.length === 0) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-blue-50 border-t border-blue-200 shadow-lg z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Selection count */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-blue-900">
              {selectedParticipantIds.length} נבחרו
            </span>
          </div>

          {/* Track buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-blue-700">הקצה למסלול:</span>
            {tracks.map((track) => (
              <button
                key={track.id}
                onClick={() => handleAssignTrack(track.id)}
                disabled={assignTracks.isPending}
                className="px-3 py-1.5 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                style={{
                  backgroundColor: track.color,
                  color: '#ffffff',
                }}
              >
                {track.name}
              </button>
            ))}
          </div>

          {/* Clear selection button */}
          <button
            onClick={onClearSelection}
            disabled={assignTracks.isPending}
            className="px-4 py-2 bg-white border border-blue-300 text-blue-900 rounded-lg font-medium text-sm hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ביטול בחירה
          </button>
        </div>

        {/* Loading indicator */}
        {assignTracks.isPending && (
          <div className="mt-2 text-center text-sm text-blue-700">
            מקצה מסלולים...
          </div>
        )}
      </div>
    </div>
  )
}
