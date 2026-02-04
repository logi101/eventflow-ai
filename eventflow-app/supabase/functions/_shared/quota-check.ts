/**
 * Quota Check Middleware for Edge Functions
 * EventFlow AI v2.1 - SaaS Tier Structure
 *
 * Validates organization tier and usage quotas before processing requests.
 * Used by: ai-chat, send-reminder, budget-alerts, vendor-analysis, execute-ai-action
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Types
export type Tier = 'base' | 'premium' | 'legacy_premium'

export type QuotaType =
  | 'events'
  | 'participants'
  | 'whatsapp_messages'
  | 'ai_messages'

export interface TierLimits {
  events_per_year: number
  participants_per_event: number
  messages_per_month: number
  ai_chat_messages_per_month: number
}

export interface UsageMetrics {
  events_count: number
  participants_count: number
  messages_sent: number
  ai_messages_sent: number
  period_start: string
  period_end: string
  warned_this_month: boolean
}

export interface QuotaCheckResult {
  allowed: boolean
  remaining?: number
  resetDate?: string
  tier: Tier
  usage?: UsageMetrics
  limits?: TierLimits
}

export interface OrganizationData {
  id: string
  tier: Tier
  tier_limits: TierLimits
  current_usage: UsageMetrics
}

// Premium features that are completely blocked for Base tier
export const PREMIUM_FEATURES = [
  'simulation',
  'networking',
  'budget_alerts',
  'vendor_analysis',
  'offline_checkin'
] as const

export type PremiumFeature = typeof PREMIUM_FEATURES[number]

/**
 * Check if organization has access to a Premium-only feature
 */
export function isPremiumFeature(feature: string): boolean {
  return PREMIUM_FEATURES.includes(feature as PremiumFeature)
}

/**
 * Check if tier has Premium access (premium or legacy_premium)
 */
export function hasPremiumAccess(tier: Tier): boolean {
  return tier === 'premium' || tier === 'legacy_premium'
}

/**
 * Get organization data including tier and usage
 */
export async function getOrganizationData(
  supabase: SupabaseClient,
  organizationId: string
): Promise<OrganizationData | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, tier, tier_limits, current_usage')
    .eq('id', organizationId)
    .single()

  if (error || !data) {
    console.error('Failed to fetch organization:', error)
    return null
  }

  return data as OrganizationData
}

/**
 * Get organization ID from user profile
 */
export async function getOrganizationIdFromUser(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', userId)
    .single()

  if (error || !data) {
    console.error('Failed to fetch user profile:', error)
    return null
  }

  return data.organization_id
}

/**
 * Check quota directly by organization ID (for cron jobs and server-side batch processing)
 * Use this when you have organization_id but not user_id (e.g., send-reminder cron)
 */
export async function checkOrgQuota(
  supabase: SupabaseClient,
  organizationId: string,
  quotaType: QuotaType
): Promise<QuotaCheckResult> {
  const org = await getOrganizationData(supabase, organizationId)

  if (!org) {
    return {
      allowed: false,
      tier: 'base',
      remaining: 0
    }
  }

  // Premium = always allowed
  if (hasPremiumAccess(org.tier)) {
    return {
      allowed: true,
      tier: org.tier,
      usage: org.current_usage,
      limits: org.tier_limits
    }
  }

  // Base tier: check quota
  const limitKey = quotaTypeToLimitKey(quotaType)
  const usageKey = quotaTypeToUsageKey(quotaType)

  const limit = org.tier_limits?.[limitKey] ?? 200  // Default to base limit
  const used = org.current_usage?.[usageKey] ?? 0

  return {
    allowed: used < limit,
    remaining: Math.max(0, limit - used),
    resetDate: org.current_usage?.period_end,
    tier: org.tier,
    usage: org.current_usage,
    limits: org.tier_limits
  }
}

/**
 * Main quota check function
 * Returns whether the organization can perform the requested action
 */
export async function checkQuota(
  supabase: SupabaseClient,
  userId: string,
  quotaType: QuotaType
): Promise<QuotaCheckResult> {
  // 1. Get organization from user_profiles
  const organizationId = await getOrganizationIdFromUser(supabase, userId)

  if (!organizationId) {
    return {
      allowed: false,
      tier: 'base',
      remaining: 0
    }
  }

  // 2. Get tier and usage from organizations
  const org = await getOrganizationData(supabase, organizationId)

  if (!org) {
    return {
      allowed: false,
      tier: 'base',
      remaining: 0
    }
  }

  // 3. Premium = always allowed
  if (hasPremiumAccess(org.tier)) {
    return {
      allowed: true,
      tier: org.tier,
      usage: org.current_usage,
      limits: org.tier_limits
    }
  }

  // 4. Base tier: check quota
  const limitKey = quotaTypeToLimitKey(quotaType)
  const usageKey = quotaTypeToUsageKey(quotaType)

  const limit = org.tier_limits[limitKey]
  const used = org.current_usage[usageKey] || 0

  return {
    allowed: used < limit,
    remaining: Math.max(0, limit - used),
    resetDate: org.current_usage.period_end,
    tier: org.tier,
    usage: org.current_usage,
    limits: org.tier_limits
  }
}

/**
 * Check if organization can access a Premium feature
 */
export async function checkPremiumFeature(
  supabase: SupabaseClient,
  userId: string,
  feature: PremiumFeature
): Promise<QuotaCheckResult> {
  const organizationId = await getOrganizationIdFromUser(supabase, userId)

  if (!organizationId) {
    return { allowed: false, tier: 'base' }
  }

  const org = await getOrganizationData(supabase, organizationId)

  if (!org) {
    return { allowed: false, tier: 'base' }
  }

  return {
    allowed: hasPremiumAccess(org.tier),
    tier: org.tier,
    usage: org.current_usage,
    limits: org.tier_limits
  }
}

/**
 * Increment usage counter atomically
 */
export async function incrementUsage(
  supabase: SupabaseClient,
  organizationId: string,
  quotaType: QuotaType
): Promise<boolean> {
  const usageKey = quotaTypeToUsageKey(quotaType)

  // Use RPC for atomic increment to prevent race conditions
  const { error } = await supabase.rpc('increment_org_usage', {
    p_org_id: organizationId,
    p_usage_key: usageKey
  })

  if (error) {
    console.error('Failed to increment usage:', error)
    // Fallback to direct update if RPC doesn't exist
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        current_usage: supabase.rpc('jsonb_set_nested', {
          target: 'current_usage',
          path: `{${usageKey}}`,
          value: supabase.rpc('coalesce_jsonb_int', {
            target: 'current_usage',
            key: usageKey
          })
        })
      })
      .eq('id', organizationId)

    return !updateError
  }

  return true
}

/**
 * Create a 429 Too Many Requests response for quota exceeded
 */
export function createQuotaExceededResponse(
  quotaType: QuotaType,
  result: QuotaCheckResult
): Response {
  const quotaNames: Record<QuotaType, string> = {
    events: 'events',
    participants: 'participants',
    whatsapp_messages: 'WhatsApp messages',
    ai_messages: 'AI chat messages'
  }

  return new Response(
    JSON.stringify({
      error: 'Quota exceeded',
      message: `You have reached your ${quotaNames[quotaType]} limit for this period.`,
      tier: result.tier,
      remaining: result.remaining,
      resetDate: result.resetDate,
      upgradeUrl: '/settings/billing'
    }),
    {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

/**
 * Create a 403 Forbidden response for Premium-only features
 */
export function createPremiumRequiredResponse(
  feature: string
): Response {
  const featureNames: Record<string, string> = {
    simulation: 'Day Simulation',
    networking: 'Networking Engine',
    budget_alerts: 'Budget Alerts',
    vendor_analysis: 'Vendor Analysis',
    offline_checkin: 'Offline Check-in'
  }

  return new Response(
    JSON.stringify({
      error: 'Premium feature',
      message: `${featureNames[feature] || feature} is a Premium feature.`,
      feature,
      upgradeUrl: '/settings/billing'
    }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

// Helper functions
function quotaTypeToLimitKey(quotaType: QuotaType): keyof TierLimits {
  const mapping: Record<QuotaType, keyof TierLimits> = {
    events: 'events_per_year',
    participants: 'participants_per_event',
    whatsapp_messages: 'messages_per_month',
    ai_messages: 'ai_chat_messages_per_month'
  }
  return mapping[quotaType]
}

function quotaTypeToUsageKey(quotaType: QuotaType): keyof UsageMetrics {
  const mapping: Record<QuotaType, keyof UsageMetrics> = {
    events: 'events_count',
    participants: 'participants_count',
    whatsapp_messages: 'messages_sent',
    ai_messages: 'ai_messages_sent'
  }
  return mapping[quotaType]
}
