// Supabase Edge Function: Start 7-day Premium Trial
// v1: Trial activation with tier update and usage reset
//
// This function:
// - Starts a 7-day Premium trial
// - Sets trial_ends_at = NOW + 7 days
// - Sets trial_started_at = NOW
// - Resets usage counters to zero
// - Returns trial details to frontend

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

interface StartTrialRequest {
  organizationId: string
}

interface TrialDetails {
  organizationId: string
  trialStartedAt: string
  trialEndsAt: string
  trialDaysRemaining: number
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
    let body: StartTrialRequest
    try {
      body = await req.json()
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } }
      )
    }

    const { organizationId } = body

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: organizationId' }),
        { status: 400, headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role key for database writes
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if organization is already on trial or Premium
    const { data: org } = await supabase
      .from('organizations')
      .select('id, tier, trial_ends_at')
      .eq('id', organizationId)
      .single()

    if (!org) {
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { status: 404, headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } }
      )
    }

    // Check if already on trial or Premium
    if (org.tier === 'premium' || org.tier === 'legacy_premium' || org.trial_ends_at) {
      return new Response(
        JSON.stringify({
          error: 'Organization already has Premium access',
          tier: org.tier,
          trialEndsAt: org.trial_ends_at
        }),
        { status: 409, headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } }
      )
    }

    // Calculate trial dates
    const now = new Date()
    const trialStartedAt = now.toISOString()
    const trialEndsAt = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)).toISOString()
    const trialDaysRemaining = 7

    // Update organization with trial dates and Premium tier
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        tier: 'premium',
        trial_started_at: trialStartedAt,
        trial_ends_at: trialEndsAt,
        // Reset usage counters for trial
        current_usage: {
          events_count: 0,
          participants_count: 0,
          messages_sent: 0,
          ai_messages_sent: 0,
          period_start: trialStartedAt,
          period_end: trialEndsAt,
          warned_this_month: false
        }
      })
      .eq('id', organizationId)
      .select('id, tier, trial_started_at, trial_ends_at')

    if (updateError) {
      console.error('Failed to start trial:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to start trial' }),
        {
          status: 500,
          headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Trial started for organization ${organizationId}: ${trialStartedAt} to ${trialEndsAt}`)

    // Return trial details
    const trialDetails: TrialDetails = {
      organizationId,
      trialStartedAt,
      trialEndsAt,
      trialDaysRemaining
    }

    return new Response(
      JSON.stringify({
        success: true,
        trial: trialDetails
      }),
      {
        status: 200,
        headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    console.error('Error in start-trial:', error)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } }
    )
  }
})
