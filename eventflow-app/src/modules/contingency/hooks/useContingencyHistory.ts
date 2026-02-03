import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { getContingencyHistory } from '../services'

interface UseContingencyHistoryOptions {
  eventId: string
  enabled?: boolean
}

/**
 * Hook for fetching contingency audit history.
 */
export function useContingencyHistory({
  eventId,
  enabled = true,
}: UseContingencyHistoryOptions) {
  const query = useQuery({
    queryKey: ['contingency-history', eventId],
    queryFn: async () => {
      return getContingencyHistory(supabase, eventId)
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  })

  return {
    history: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,

    // Helpers
    hasHistory: (query.data?.length ?? 0) > 0,
    executedCount: query.data?.filter(a => a.execution_status === 'executed').length ?? 0,
    pendingCount: query.data?.filter(a => a.execution_status === 'suggested').length ?? 0,
  }
}
