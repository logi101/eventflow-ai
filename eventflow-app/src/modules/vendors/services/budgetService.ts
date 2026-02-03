import { supabase } from '../../../lib/supabase'

export interface BudgetAlert {
  checklistItemId: string
  title: string
  budgetAmount: number
  currentAmount: number
  percentage: number
  threshold: 'warning' | 'critical'
  alreadySent: boolean
}

export interface BudgetCheckResult {
  alerts: BudgetAlert[]
  newAlertsSent: number
  totalChecked: number
}

// Check budget thresholds for an event
export async function checkBudgetAlerts(
  eventId: string,
  options: { sendAlerts?: boolean } = {}
): Promise<BudgetCheckResult> {
  const { data, error } = await supabase.functions.invoke('budget-alerts', {
    body: {
      eventId,
      checkNow: options.sendAlerts ?? false
    }
  })

  if (error) throw error
  return data as BudgetCheckResult
}

// Get active (unacknowledged) alerts for an event
export async function getActiveAlerts(eventId: string): Promise<BudgetAlert[]> {
  const { data, error } = await supabase
    .from('budget_alert_history')
    .select(`
      id,
      checklist_item_id,
      alert_type,
      threshold_percentage,
      current_amount,
      budget_amount,
      checklist_items!checklist_item_id (title)
    `)
    .eq('event_id', eventId)
    .is('acknowledged_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data || []).map(row => {
    // Supabase returns relation as array or single object depending on query
    const items = row.checklist_items
    const checklistItem = Array.isArray(items) ? items[0] : items
    const title = checklistItem && typeof checklistItem === 'object' && 'title' in checklistItem
      ? (checklistItem as { title: string }).title
      : 'Unknown'

    return {
      checklistItemId: row.checklist_item_id,
      title,
      budgetAmount: row.budget_amount,
      currentAmount: row.current_amount,
      percentage: (row.current_amount / row.budget_amount) * 100,
      threshold: row.alert_type as 'warning' | 'critical',
      alreadySent: true
    }
  })
}

// Acknowledge an alert (dismiss badge but keep history)
export async function acknowledgeAlert(alertId: string): Promise<void> {
  const { error } = await supabase
    .from('budget_alert_history')
    .update({ acknowledged_at: new Date().toISOString() })
    .eq('id', alertId)

  if (error) throw error
}

// Acknowledge all alerts for a checklist item
export async function acknowledgeItemAlerts(
  eventId: string,
  checklistItemId: string
): Promise<void> {
  const { error } = await supabase
    .from('budget_alert_history')
    .update({ acknowledged_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .eq('checklist_item_id', checklistItemId)
    .is('acknowledged_at', null)

  if (error) throw error
}
