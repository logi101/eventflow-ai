import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { addOfflineCheckIn, updateCachedParticipantStatus } from '../db'
import { syncPendingCheckIns } from '../services/syncService'
import { useOnlineStatus } from './useOnlineStatus'

interface CheckInResult {
  participantId: string
  localId: number
  synced: boolean
}

interface Participant {
  id: string
  status: string
  checked_in_at?: string
}

export function useOfflineCheckIn(eventId: string) {
  const queryClient = useQueryClient()
  const { isOnline } = useOnlineStatus()

  return useMutation({
    mutationFn: async (participantId: string): Promise<CheckInResult> => {
      // Always write to IndexedDB first (offline-safe)
      const localId = await addOfflineCheckIn(participantId, eventId)

      // Update local cache immediately
      await updateCachedParticipantStatus(participantId, 'checked_in')

      // If online, try to sync immediately
      if (isOnline) {
        try {
          const { error } = await supabase
            .from('participants')
            .update({
              status: 'checked_in',
              checked_in_at: new Date().toISOString()
            })
            .eq('id', participantId)

          if (!error) {
            // Mark as synced in IndexedDB (update synced field to true)
            const { markCheckInSynced } = await import('../db')
            await markCheckInSynced(localId)
            return { participantId, localId, synced: true }
          }
        } catch (e) {
          console.warn('[CheckIn] Online sync failed, stored locally:', e)
        }
      }

      return { participantId, localId, synced: false }
    },

    // Optimistic update for instant UI feedback
    onMutate: async (participantId) => {
      await queryClient.cancelQueries({ queryKey: ['participants', eventId] })

      const previous = queryClient.getQueryData(['participants', eventId])

      // Optimistically update TanStack Query cache
      queryClient.setQueryData(['participants', eventId], (old: Participant[] | undefined) => {
        if (!old) return old
        return old.map((p: Participant) =>
          p.id === participantId
            ? { ...p, status: 'checked_in', checked_in_at: new Date().toISOString() }
            : p
        )
      })

      return { previous }
    },

    onError: (_err, _participantId, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(['participants', eventId], context.previous)
      }
    },

    onSettled: () => {
      // Always invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['participants', eventId] })
    }
  })
}

// Hook for manual sync trigger (if needed)
export function useManualSync(eventId?: string) {
  const { isOnline } = useOnlineStatus()

  return useMutation({
    mutationFn: async () => {
      if (!isOnline) {
        throw new Error('Cannot sync while offline')
      }
      return syncPendingCheckIns(eventId)
    }
  })
}
