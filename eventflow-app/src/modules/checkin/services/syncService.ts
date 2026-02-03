import { supabase } from '../../../lib/supabase'
import { getPendingCheckIns, markCheckInSynced, incrementSyncRetry } from '../db'
import type { OfflineCheckIn } from '../db/schema'

// Rate limiting configuration
const RATE_LIMIT_KEY = 'eventflow_sync_rate_limit'
const MAX_REQUESTS_PER_MINUTE = 10
const RATE_WINDOW_MS = 60 * 1000
const MAX_RETRY_COUNT = 5

interface RateLimitState {
  count: number
  windowStart: number
}

// ============== Rate Limiting ==============

function getRateLimitState(): RateLimitState {
  const stored = localStorage.getItem(RATE_LIMIT_KEY)
  if (!stored) {
    return { count: 0, windowStart: Date.now() }
  }

  const state = JSON.parse(stored) as RateLimitState
  const now = Date.now()

  // Reset if window expired
  if (now - state.windowStart > RATE_WINDOW_MS) {
    return { count: 0, windowStart: now }
  }

  return state
}

function incrementRateLimit(): boolean {
  const state = getRateLimitState()

  if (state.count >= MAX_REQUESTS_PER_MINUTE) {
    return false  // Rate limited
  }

  const newState = {
    count: state.count + 1,
    windowStart: state.windowStart
  }
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(newState))
  return true
}

function canMakeRequest(): boolean {
  const state = getRateLimitState()
  return state.count < MAX_REQUESTS_PER_MINUTE
}

// ============== Exponential Backoff ==============

function getBackoffDelay(retryCount: number): number {
  // 200ms, 400ms, 800ms, 1600ms, 3200ms + jitter
  const baseDelay = 200 * Math.pow(2, retryCount)
  const jitter = Math.random() * baseDelay * 0.3  // 30% jitter
  return Math.min(baseDelay + jitter, 5000)  // Cap at 5 seconds
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============== Sync Operations ==============

async function syncSingleCheckIn(checkIn: OfflineCheckIn): Promise<boolean> {
  if (!canMakeRequest()) {
    console.log('[Sync] Rate limited, will retry later')
    return false
  }

  if (checkIn.syncRetries >= MAX_RETRY_COUNT) {
    console.warn(`[Sync] Max retries exceeded for check-in ${checkIn.id}`)
    return false
  }

  try {
    incrementRateLimit()

    const { error } = await supabase
      .from('participants')
      .update({
        status: 'checked_in',
        checked_in_at: checkIn.checkedInAt.toISOString()
      })
      .eq('id', checkIn.participantId)

    if (error) {
      if (error.code === '429') {
        // Server rate limited - back off more
        await delay(getBackoffDelay(checkIn.syncRetries + 2))
      }
      throw error
    }

    await markCheckInSynced(checkIn.id!)
    console.log(`[Sync] Check-in ${checkIn.id} synced successfully`)
    return true

  } catch (error) {
    console.error(`[Sync] Failed to sync check-in ${checkIn.id}:`, error)
    await incrementSyncRetry(checkIn.id!)
    return false
  }
}

export async function syncPendingCheckIns(eventId?: string): Promise<{
  synced: number
  failed: number
  rateLimited: boolean
}> {
  const pending = await getPendingCheckIns(eventId)

  if (pending.length === 0) {
    return { synced: 0, failed: 0, rateLimited: false }
  }

  console.log(`[Sync] Starting sync of ${pending.length} pending check-ins`)

  let synced = 0
  let failed = 0
  let rateLimited = false

  for (const checkIn of pending) {
    if (!canMakeRequest()) {
      rateLimited = true
      console.log('[Sync] Rate limited, stopping batch')
      break
    }

    const success = await syncSingleCheckIn(checkIn)
    if (success) {
      synced++
    } else {
      failed++
    }

    // Small delay between requests to be nice to the server
    await delay(100)
  }

  console.log(`[Sync] Complete: ${synced} synced, ${failed} failed, rateLimited: ${rateLimited}`)
  return { synced, failed, rateLimited }
}

// Auto-sync when coming online
export function setupAutoSync() {
  window.addEventListener('online', async () => {
    console.log('[Sync] Connection restored, starting auto-sync')
    // Small delay to ensure stable connection
    await delay(1000)
    await syncPendingCheckIns()
  })
}

// Export for manual trigger if needed
export { canMakeRequest, MAX_REQUESTS_PER_MINUTE }
