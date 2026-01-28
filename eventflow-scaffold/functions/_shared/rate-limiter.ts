// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Rate Limiter for Edge Functions
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RateLimitConfig {
  maxRequests: number      // Maximum requests per window
  windowMs: number         // Time window in milliseconds
  identifier: string       // Unique identifier (IP, user_id, org_id)
  endpoint: string         // The endpoint being rate limited
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
}

/**
 * Simple in-memory rate limiter using Supabase table for persistence
 * For production, consider using Redis or a dedicated rate limiting service
 */
export async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { maxRequests, windowMs, identifier, endpoint } = config
  const now = Date.now()
  const windowStart = new Date(now - windowMs).toISOString()

  // Count recent requests
  const { count, error } = await supabase
    .from('rate_limit_log')
    .select('*', { count: 'exact', head: true })
    .eq('identifier', identifier)
    .eq('endpoint', endpoint)
    .gte('created_at', windowStart)

  if (error) {
    console.error('Rate limit check error:', error)
    // Fail open - allow request if rate limit check fails
    return { allowed: true, remaining: maxRequests - 1, resetAt: new Date(now + windowMs) }
  }

  const requestCount = count || 0
  const allowed = requestCount < maxRequests
  const remaining = Math.max(0, maxRequests - requestCount - 1)
  const resetAt = new Date(now + windowMs)

  if (allowed) {
    // Log this request
    await supabase
      .from('rate_limit_log')
      .insert({
        identifier,
        endpoint,
        created_at: new Date().toISOString()
      })
  }

  return { allowed, remaining, resetAt }
}

/**
 * Get client identifier from request (IP address)
 */
export function getClientIdentifier(req: Request): string {
  // Try various headers for real IP behind proxies
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    return xff.split(',')[0].trim()
  }

  const realIp = req.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Fallback - use a hash of user-agent as identifier
  const ua = req.headers.get('user-agent') || 'unknown'
  return `ua-${hashCode(ua)}`
}

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

/**
 * Rate limit headers to include in response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toISOString(),
  }
}

/**
 * Create a rate limited response (429 Too Many Requests)
 */
export function rateLimitExceededResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please try again later.',
      retry_after: Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        ...getRateLimitHeaders(result),
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil((result.resetAt.getTime() - Date.now()) / 1000).toString()
      }
    }
  )
}

// Default rate limits for different endpoints
export const RATE_LIMITS = {
  // WhatsApp: 30 messages per minute per organization
  WHATSAPP: { maxRequests: 30, windowMs: 60 * 1000 },
  // AI Chat: 20 requests per minute per user
  AI_CHAT: { maxRequests: 20, windowMs: 60 * 1000 },
  // Reminders: Internal only, higher limit
  REMINDER: { maxRequests: 1000, windowMs: 60 * 1000 },
}
