import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  checkBudgetAlerts,
  getActiveAlerts,
  acknowledgeAlert,
  acknowledgeItemAlerts
} from '../services/budgetService'

export function useBudgetAlerts(eventId: string | undefined) {
  const queryClient = useQueryClient()

  // Get active (unacknowledged) alerts
  const {
    data: alerts,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['budgetAlerts', eventId],
    queryFn: () => getActiveAlerts(eventId!),
    enabled: !!eventId,
    refetchInterval: 5 * 60 * 1000  // Refetch every 5 minutes
  })

  // Check and send new alerts
  const checkAlerts = useMutation({
    mutationFn: () => checkBudgetAlerts(eventId!, { sendAlerts: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetAlerts', eventId] })
    }
  })

  // Acknowledge single alert
  const acknowledge = useMutation({
    mutationFn: acknowledgeAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetAlerts', eventId] })
    }
  })

  // Acknowledge all alerts for a checklist item
  const acknowledgeItem = useMutation({
    mutationFn: (checklistItemId: string) =>
      acknowledgeItemAlerts(eventId!, checklistItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetAlerts', eventId] })
    }
  })

  // Computed values
  const criticalAlerts = alerts?.filter(a => a.threshold === 'critical') || []
  const warningAlerts = alerts?.filter(a => a.threshold === 'warning') || []
  const hasAlerts = (alerts?.length || 0) > 0
  const hasCritical = criticalAlerts.length > 0

  return {
    alerts: alerts || [],
    criticalAlerts,
    warningAlerts,
    hasAlerts,
    hasCritical,
    isLoading,
    error,
    refetch,
    checkAlerts,
    acknowledge,
    acknowledgeItem
  }
}

// Lightweight hook just for badge count
export function useBudgetAlertCount(eventId: string | undefined) {
  const { data: alerts } = useQuery({
    queryKey: ['budgetAlerts', eventId],
    queryFn: () => getActiveAlerts(eventId!),
    enabled: !!eventId,
    staleTime: 60 * 1000  // 1 minute
  })

  return {
    count: alerts?.length || 0,
    hasCritical: alerts?.some(a => a.threshold === 'critical') || false
  }
}
