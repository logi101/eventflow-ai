// ═══════════════════════════════════════════════════════════════════════════
// useTrackAssignment Hook - Track assignment operations
// ═══════════════════════════════════════════════════════════════════════════
// Manages participant track assignments using TanStack Query
// Provides: assignTracks, removeTrack, toggleTrack mutations

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface AssignTracksParams {
  participantIds: string[]
  trackId: string
  isPrimary?: boolean
}

interface RemoveTrackParams {
  participantId: string
  trackId: string
}

interface ToggleTrackParams {
  participantId: string
  trackId: string
  isPrimary?: boolean
}

export function useTrackAssignment(eventId: string) {
  const queryClient = useQueryClient()

  /**
   * Bulk assign a track to multiple participants
   * הקצאת מסלול לריבוי משתתפים בבת אחת
   */
  const assignTracks = useMutation({
    mutationFn: async ({ participantIds, trackId, isPrimary = false }: AssignTracksParams) => {
      // Build insert records
      const records = participantIds.map((participantId) => ({
        participant_id: participantId,
        track_id: trackId,
        is_primary: isPrimary,
        registered_at: new Date().toISOString(),
      }))

      // Bulk insert with upsert (ON CONFLICT DO NOTHING)
      const { data, error } = await supabase
        .from('participant_tracks')
        .upsert(records, {
          onConflict: 'participant_id,track_id',
          ignoreDuplicates: true,
        })
        .select()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidate participant queries to refetch with updated tracks
      queryClient.invalidateQueries({ queryKey: ['participants', eventId] })
      queryClient.invalidateQueries({ queryKey: ['track-statistics', eventId] })
    },
  })

  /**
   * Remove a track from a single participant
   * הסרת מסלול ממשתתף
   */
  const removeTrack = useMutation({
    mutationFn: async ({ participantId, trackId }: RemoveTrackParams) => {
      const { error } = await supabase
        .from('participant_tracks')
        .delete()
        .eq('participant_id', participantId)
        .eq('track_id', trackId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants', eventId] })
      queryClient.invalidateQueries({ queryKey: ['track-statistics', eventId] })
    },
  })

  /**
   * Toggle track assignment for a participant
   * Toggle on/off - if exists, remove; if not, add
   * הפעלת/כיבוי מסלול למשתתף
   */
  const toggleTrack = useMutation({
    mutationFn: async ({ participantId, trackId, isPrimary = false }: ToggleTrackParams) => {
      // Check if assignment exists
      const { data: existing } = await supabase
        .from('participant_tracks')
        .select('id')
        .eq('participant_id', participantId)
        .eq('track_id', trackId)
        .single()

      if (existing) {
        // Remove assignment
        const { error } = await supabase
          .from('participant_tracks')
          .delete()
          .eq('participant_id', participantId)
          .eq('track_id', trackId)

        if (error) throw error
        return { action: 'removed' }
      } else {
        // Add assignment
        const { error } = await supabase
          .from('participant_tracks')
          .insert({
            participant_id: participantId,
            track_id: trackId,
            is_primary: isPrimary,
            registered_at: new Date().toISOString(),
          })

        if (error) throw error
        return { action: 'added' }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants', eventId] })
      queryClient.invalidateQueries({ queryKey: ['track-statistics', eventId] })
    },
  })

  return {
    assignTracks,
    removeTrack,
    toggleTrack,
  }
}
