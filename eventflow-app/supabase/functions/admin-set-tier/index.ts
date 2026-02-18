// Supabase Edge Function: Admin Set Tier
// v1: Admin interface for updating organization tiers with audit trail
//
// This function allows super_admins to change an organization's tier:
// - Updates the tier field in organizations table
// - Logs the change to audit_trail table
// - Updates tier_updated_at and tier_updated_by fields
// - Resets usage counters if downgrading to base tier
// - Handles trial start/stop appropriately

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================================
// CORS Configuration
// ============================================================================

function isAllowedOrigin(origin: string): boolean {
  if (origin === 'https://eventflow-ai-prod.web.app') return true
  if (origin === 'https://eventflow-ai-prod.firebaseapp.com') return true

  const prodOrigin = Deno.env.get('ALLOWED_ORIGIN')
  if (prodOrigin && origin === prodOrigin) return true

  if (origin.startsWith('http://localhost:')) return true

  return false
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && isAllowedOrigin(origin)
    ? origin
    : 'https://eventflow-ai-prod.web.app'

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  }
}

// ============================================================================
// Types
// ============================================================================

interface SetTierRequest {
  organizationId: string
  newTier: 'base' | 'premium' | 'legacy_premium'
  reason: string
}

interface SetTierResponse {
  success: boolean
  message: string
  auditId?: string
  organizationId?: string
  oldTier?: string
  newTier?: string
}

// ============================================================================
// Helper Functions
// ============================================================================

function getTierLimits(tier: 'base' | 'premium' | 'legacy_premium'): Record<string, number> {
  if (tier === 'premium' || tier === 'legacy_premium') {
    return {
      events_per_year: -1,
      participants_per_event: -1,
      messages_per_month: -1,
      ai_chat_messages_per_month: -1
    }
  }
  return {
    events_per_year: 5,
    participants_per_event: 100,
    messages_per_month: 200,
    ai_chat_messages_per_month: 50
  }
}

function getPeriodRange(): { start: string; end: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0 = January
  
  const startDate = new Date(year, month, 1, 0, 0, 0).toISOString()
  const nextMonth = new Date(year, month + 1, 1, 0, 0, 0)
  const endDate = nextMonth.toISOString()
  
  return { start: startDate, end: endDate }
}

function resetUsageMetrics(tier: 'base' | 'premium' | 'legacy_premium'): Record<string, number | null> {
  // Reset all counters to zero
  return {
    events_count: 0,
    participants_count: 0,
    messages_sent: 0,
    ai_messages_sent: 0,
    period_start: tier === 'base' ? getPeriodRange().start : null,
    period_end: tier === 'base' ? getPeriodRange().end : null,
    warned_this_month: false
  }
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req.headers.get('origin')) })
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Parse request body
    let body: SetTierRequest
    try {
      body = await req.json()
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } }
      )
    }

    const { organizationId, newTier, reason } = body

    if (!organizationId || !newTier || !reason) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: organizationId, newTier, reason' }),
        { status: 400, headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } }
      )
    }

    if (!['base', 'premium', 'legacy_premium'].includes(newTier)) {
      return new Response(
        JSON.stringify({ error: 'Invalid tier. Must be: base, premium, or legacy_premium' }),
        { status: 400, headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } }
      )
    }

    if (reason.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: 'Reason must be at least 10 characters' }),
        { status: 400, headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log(`Setting tier for org ${organizationId}: ${newTier}. Reason: ${reason}`)

    // Get current organization state
    const { data: org, error: fetchError } = await supabase
      .from('organizations')
      .select('id, name, tier, trial_ends_at, trial_started_at, current_usage, tier_limits')
      .eq('id', organizationId)
      .single()

    if (fetchError) throw fetchError
    if (!org) throw new Error('Organization not found')

    const oldTier = org.tier

    // Check if user is super_admin (service role bypasses RLS)
    // Get user from auth header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } }
      )
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (userError) throw userError

    const userRole = user?.user_metadata?.role
    if (userRole !== 'super_admin') {
      console.log(`Non-admin user ${user.id} attempted to set tier for org ${organizationId}`)
      return new Response(
        JSON.stringify({ error: 'Forbidden: Only super_admin can change tiers' }),
        { status: 403, headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } }
      )
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      tier: newTier,
      tier_updated_at: new Date().toISOString(),
      tier_updated_by: user.id
    }

    // Handle trial fields
    const isDowngradingToBase = oldTier !== 'base' && newTier === 'base'
    const isUpgradingToPremium = oldTier !== 'premium' && oldTier !== 'legacy_premium' && (newTier === 'premium' || newTier === 'legacy_premium')

    if (isUpgradingToPremium) {
      // Starting Premium: clear trial fields
      updateData.trial_ends_at = null
      updateData.trial_started_at = null
    }

    if (isDowngradingToBase) {
      // Downgrading to Base: reset trial fields
      updateData.trial_ends_at = null
      updateData.trial_started_at = null
      
      // Reset usage counters if downgrading
      const resetUsage = resetUsageMetrics('base')
      updateData.current_usage = resetUsage
      
      console.log(`Resetting usage for ${organizationId}:`, resetUsage)
    }

    // Update tier limits
    updateData.tier_limits = getTierLimits(newTier)

    // Perform the update
    const { error: updateError } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId)
      .select('id')

    if (updateError) throw updateError

    // Log to audit trail
    const { error: auditError } = await supabase
      .from('audit_trail')
      .insert({
        organization_id: organizationId,
        action_type: 'tier_change',
        action_details: JSON.stringify({
          old_tier: oldTier,
          new_tier: newTier,
          reason,
          admin_id: user.id,
          admin_email: user.email,
          admin_name: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`
        }),
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
        created_at: new Date().toISOString()
      })

    if (auditError) {
      console.error('Failed to log to audit_trail:', auditError)
      // Don't fail if audit logging fails
    }

    console.log(`Tier change logged to audit_trail for org ${organizationId}`)

    const response: SetTierResponse = {
      success: true,
      message: `Tier changed from ${oldTier} to ${newTier}`,
      organizationId,
      oldTier,
      newTier
    }

    console.log(`Successfully set tier for org ${organizationId} from ${oldTier} to ${newTier}`)

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    console.error('Error in admin-set-tier:', error)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } }
    )
  }
})
