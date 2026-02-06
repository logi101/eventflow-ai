// EventFlow AI Chat - AI Confirmation Hook
// Manages the confirmation workflow for AI write operations

import { useState, useCallback } from 'react'
import type { AIWriteAction, ActionRisk } from '../types/chat'
import { supabase } from '../lib/supabase'

interface AIConfirmationState {
  pendingAction: AIWriteAction | null
  isExecuting: boolean
  dialogOpen: boolean
}

export function useAIConfirmation() {
  const [state, setState] = useState<AIConfirmationState>({
    pendingAction: null,
    isExecuting: false,
    dialogOpen: false
  })

  /**
   * Calculate action risk level based on conflicts and impact
   */
  const getActionRisk = useCallback((action: AIWriteAction): ActionRisk => {
    // Critical: Has error-level conflicts
    if (action.conflicts.some(c => c.severity === 'error')) {
      return 'critical'
    }

    // High: Affects VIPs or has warnings
    if (action.impact.vip_count > 0 || action.conflicts.some(c => c.severity === 'warning')) {
      return 'high'
    }

    // Medium: Requires notifications or affects many participants
    if (action.impact.requires_notifications || action.impact.affected_participants > 50) {
      return 'medium'
    }

    // Low: Safe change
    return 'low'
  }, [])

  /**
   * Request confirmation for an AI action
   */
  const requestConfirmation = useCallback((action: AIWriteAction) => {
    setState({
      pendingAction: action,
      isExecuting: false,
      dialogOpen: true
    })
  }, [])

  /**
   * Approve and execute the pending action
   */
  const approve = useCallback(async (): Promise<{ success: boolean; data?: unknown }> => {
    if (!state.pendingAction) {
      return { success: false }
    }

    setState(prev => ({ ...prev, isExecuting: true }))

    try {
      // Call execute-ai-action Edge Function
      const { data, error } = await supabase.functions.invoke('execute-ai-action', {
        body: {
          action_id: state.pendingAction.action_id,
          action_type: state.pendingAction.type,
          action_data: state.pendingAction.data
        }
      })

      if (error) {
        console.error('[AIConfirmation] Execution error:', error)
        throw new Error(error.message || 'שגיאה בביצוע הפעולה')
      }

      if (data?.error) {
        throw new Error(data.error)
      }

      // Close dialog
      setState({
        pendingAction: null,
        isExecuting: false,
        dialogOpen: false
      })

      return { success: true, data }
    } catch (error) {
      console.error('[AIConfirmation] Unexpected error:', error)
      setState(prev => ({ ...prev, isExecuting: false }))
      throw error
    }
  }, [state.pendingAction])

  /**
   * Reject the pending action
   */
  const reject = useCallback(async (): Promise<{ success: boolean }> => {
    if (!state.pendingAction) {
      return { success: false }
    }

    try {
      // Update audit log to mark as rejected
      const { error } = await supabase
        .from('ai_insights_log')
        .update({
          status: 'rejected',
          executed_at: new Date().toISOString(),
          execution_result: { reason: 'Manager rejected the suggestion' }
        })
        .eq('id', state.pendingAction.action_id)

      if (error) {
        console.error('[AIConfirmation] Failed to update audit log:', error)
        // Don't throw - rejection should always succeed from UI perspective
      }

      // Close dialog
      setState({
        pendingAction: null,
        isExecuting: false,
        dialogOpen: false
      })

      return { success: true }
    } catch (error) {
      console.error('[AIConfirmation] Unexpected error during rejection:', error)
      // Close dialog anyway
      setState({
        pendingAction: null,
        isExecuting: false,
        dialogOpen: false
      })
      return { success: true }
    }
  }, [state.pendingAction])

  /**
   * Dismiss dialog without action
   */
  const dismiss = useCallback(() => {
    setState({
      pendingAction: null,
      isExecuting: false,
      dialogOpen: false
    })
  }, [])

  return {
    pendingAction: state.pendingAction,
    isExecuting: state.isExecuting,
    dialogOpen: state.dialogOpen,
    requestConfirmation,
    approve,
    reject,
    dismiss,
    getActionRisk
  }
}
