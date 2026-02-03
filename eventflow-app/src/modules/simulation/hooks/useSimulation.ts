import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { runSimulation } from '../services'
import type { SimulationResult } from '../types'

interface UseSimulationOptions {
  onSuccess?: (result: SimulationResult) => void
  onError?: (error: Error) => void
}

/**
 * Hook for running day simulation.
 * Returns mutation for triggering simulation + result state.
 */
export function useSimulation(eventId: string, options?: UseSimulationOptions) {

  const mutation = useMutation({
    mutationKey: ['simulation', eventId],
    mutationFn: async () => {
      return runSimulation(supabase, eventId)
    },
    onSuccess: (data) => {
      options?.onSuccess?.(data)
    },
    onError: (error) => {
      console.error('Simulation failed:', error)
      options?.onError?.(error as Error)
    },
  })

  return {
    // Mutation controls
    runSimulation: mutation.mutate,
    runSimulationAsync: mutation.mutateAsync,
    reset: mutation.reset,

    // State
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,

    // Result
    result: mutation.data,
    hasResult: !!mutation.data,

    // Summary helpers
    hasCriticalIssues: (mutation.data?.critical ?? 0) > 0,
    hasWarnings: (mutation.data?.warnings ?? 0) > 0,
    totalIssues: mutation.data?.total_issues ?? 0,
  }
}
