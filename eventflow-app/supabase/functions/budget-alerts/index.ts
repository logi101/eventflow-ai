import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BudgetCheckResult {
  checklistItemId: string
  title: string
  budgetAmount: number
  currentAmount: number
  percentage: number
  threshold: 'warning' | 'critical'
  alreadySent: boolean
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { eventId, organizationId, checkNow } = await req.json()

    if (!eventId) {
      return new Response(JSON.stringify({ error: 'eventId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch checklist items with budgets and linked vendor quotes
    const { data: items, error: itemsError } = await supabase
      .from('checklist_items')
      .select(`
        id,
        title,
        budget_allocation,
        event_vendors!assigned_vendor_id (
          id,
          quoted_amount,
          approved_amount,
          status
        )
      `)
      .eq('event_id', eventId)
      .not('budget_allocation', 'is', null)
      .not('assigned_vendor_id', 'is', null)

    if (itemsError) throw itemsError

    // Check existing alerts
    const { data: existingAlerts } = await supabase
      .from('budget_alert_history')
      .select('checklist_item_id, alert_type, acknowledged_at')
      .eq('event_id', eventId)
      .is('acknowledged_at', null)  // Only unacknowledged

    const alertMap = new Map<string, Set<string>>()
    existingAlerts?.forEach(a => {
      if (!alertMap.has(a.checklist_item_id)) {
        alertMap.set(a.checklist_item_id, new Set())
      }
      alertMap.get(a.checklist_item_id)!.add(a.alert_type)
    })

    const alerts: BudgetCheckResult[] = []
    const newAlertsToSend: BudgetCheckResult[] = []

    for (const item of items || []) {
      if (!item.event_vendors) continue

      // Use approved_amount if available, otherwise quoted_amount
      const vendorData = item.event_vendors as any
      const currentAmount = vendorData.approved_amount || vendorData.quoted_amount || 0
      const percentage = (currentAmount / item.budget_allocation) * 100

      const existingForItem = alertMap.get(item.id) || new Set()

      // Check critical threshold (100%)
      if (percentage >= 100) {
        const alreadySent = existingForItem.has('critical')
        alerts.push({
          checklistItemId: item.id,
          title: item.title,
          budgetAmount: item.budget_allocation,
          currentAmount,
          percentage,
          threshold: 'critical',
          alreadySent
        })
        if (!alreadySent) {
          newAlertsToSend.push({
            checklistItemId: item.id,
            title: item.title,
            budgetAmount: item.budget_allocation,
            currentAmount,
            percentage,
            threshold: 'critical',
            alreadySent: false
          })
        }
      }
      // Check warning threshold (80%)
      else if (percentage >= 80) {
        const alreadySent = existingForItem.has('warning')
        alerts.push({
          checklistItemId: item.id,
          title: item.title,
          budgetAmount: item.budget_allocation,
          currentAmount,
          percentage,
          threshold: 'warning',
          alreadySent
        })
        if (!alreadySent) {
          newAlertsToSend.push({
            checklistItemId: item.id,
            title: item.title,
            budgetAmount: item.budget_allocation,
            currentAmount,
            percentage,
            threshold: 'warning',
            alreadySent: false
          })
        }
      }
    }

    // If checkNow flag, send new alerts
    if (checkNow && newAlertsToSend.length > 0) {
      // Get event manager phone for WhatsApp
      const { data: event } = await supabase
        .from('events')
        .select('organization_id, user_profiles!events_created_by_fkey(phone_normalized)')
        .eq('id', eventId)
        .single()

      const managerPhone = (event?.user_profiles as any)?.phone_normalized

      for (const alert of newAlertsToSend) {
        // Record in alert history
        await supabase.from('budget_alert_history').insert({
          checklist_item_id: alert.checklistItemId,
          event_id: eventId,
          organization_id: organizationId || event?.organization_id,
          alert_type: alert.threshold,
          threshold_percentage: alert.threshold === 'critical' ? 100 : 80,
          current_amount: alert.currentAmount,
          budget_amount: alert.budgetAmount,
          sent_via: managerPhone ? 'both' : 'app'
        })

        // Send WhatsApp if manager phone available
        if (managerPhone) {
          const message = alert.threshold === 'critical'
            ? `🚨 *תקציב חרג!*\n\nפריט: ${alert.title}\n📊 ${Math.round(alert.percentage)}% מהתקציב\n💰 ${alert.currentAmount.toLocaleString()} ₪ מתוך ${alert.budgetAmount.toLocaleString()} ₪\n\nיש לפעול מיד.`
            : `⚠️ *אזהרת תקציב*\n\nפריט: ${alert.title}\n📊 ${Math.round(alert.percentage)}% מהתקציב\n💰 ${alert.currentAmount.toLocaleString()} ₪ מתוך ${alert.budgetAmount.toLocaleString()} ₪`

          // Call send-whatsapp edge function
          await supabase.functions.invoke('send-whatsapp', {
            body: {
              recipientPhone: managerPhone,
              message,
              eventId
            }
          })
        }
      }
    }

    return new Response(JSON.stringify({
      alerts,
      newAlertsSent: newAlertsToSend.length,
      totalChecked: items?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Budget alert error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
