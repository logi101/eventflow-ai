import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import {
  suggestContingencyAction,
  executeContingencyAction,
  rejectContingencyAction,
} from '../services'
import type {
  ContingencyActionType,
  ContingencyActionData,
  ContingencySuggestion,
  ContingencyExecutionResult,
} from '../types'

interface UseContingencyOptions {
  eventId: string
  onSuggestSuccess?: (suggestion: ContingencySuggestion) => void
  onExecuteSuccess?: (result: ContingencyExecutionResult) => void
  onError?: (error: Error) => void
}

/**
 * Hook for contingency suggest/execute/reject operations.
 */
export function useContingency({
  eventId,
  onSuggestSuccess,
  onExecuteSuccess,
  onError,
}: UseContingencyOptions) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Suggest mutation
  const suggestMutation = useMutation({
    mutationKey: ['contingency', 'suggest', eventId],
    mutationFn: async ({
      actionType,
      actionData,
      reason,
    }: {
      actionType: ContingencyActionType
      actionData: ContingencyActionData
      reason: string
    }) => {
      if (!user) throw new Error('User not authenticated')
      return suggestContingencyAction(
        supabase,
        eventId,
        actionType,
        actionData,
        reason,
        user.id
      )
    },
    onSuccess: (data) => {
      onSuggestSuccess?.(data)
    },
    onError: (error) => {
      console.error('Suggest contingency failed:', error)
      onError?.(error as Error)
    },
  })

  // Execute mutation
  const executeMutation = useMutation({
    mutationKey: ['contingency', 'execute', eventId],
    mutationFn: async (actionId: string) => {
      if (!user) throw new Error('User not authenticated')
      return executeContingencyAction(supabase, actionId, user.id)
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['schedules', eventId] })
      queryClient.invalidateQueries({ queryKey: ['contingency-history', eventId] })
      onExecuteSuccess?.(data)
    },
    onError: (error) => {
      console.error('Execute contingency failed:', error)
      onError?.(error as Error)
    },
  })

  // Reject mutation
  const rejectMutation = useMutation({
    mutationKey: ['contingency', 'reject', eventId],
    mutationFn: async ({
      actionId,
      reason,
    }: {
      actionId: string
      reason?: string
    }) => {
      if (!user) throw new Error('User not authenticated')
      return rejectContingencyAction(supabase, actionId, user.id, reason)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contingency-history', eventId] })
    },
    onError: (error) => {
      console.error('Reject contingency failed:', error)
      onError?.(error as Error)
    },
  })

  return {
    // Suggest
    suggest: suggestMutation.mutate,
    suggestAsync: suggestMutation.mutateAsync,
    isSuggesting: suggestMutation.isPending,
    suggestion: suggestMutation.data,

    // Execute
    execute: executeMutation.mutate,
    executeAsync: executeMutation.mutateAsync,
    isExecuting: executeMutation.isPending,
    executionResult: executeMutation.data,

    // Reject
    reject: rejectMutation.mutate,
    rejectAsync: rejectMutation.mutateAsync,
    isRejecting: rejectMutation.isPending,

    // Reset
    reset: () => {
      suggestMutation.reset()
      executeMutation.reset()
      rejectMutation.reset()
    },

    // Combined loading state
    isLoading: suggestMutation.isPending || executeMutation.isPending || rejectMutation.isPending,
  }
}
