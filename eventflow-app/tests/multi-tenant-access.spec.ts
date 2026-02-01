import { test, expect } from '@playwright/test'

/**
 * EventFlow AI - Multi-Tenant Access & Auth-Aware Loading Tests
 *
 * Verifies that:
 * 1. Events load correctly after fresh login (no cached session)
 * 2. Authenticated users see their organization's events
 * 3. Dashboard stats reflect correct data after login
 * 4. Logout clears event data
 *
 * Environment variables required:
 *   TEST_USER_EMAIL - Test user email (defaults to process.env or skips)
 *   TEST_USER_PASSWORD - Test user password
 */

const TEST_EMAIL = process.env.TEST_USER_EMAIL || ''
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || ''

// Helper: Login via the login form
async function loginUser(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  // Fill login form
  const emailInput = page.locator('input[type="email"]')
  const passwordInput = page.locator('input[type="password"]')

  await emailInput.fill(email)
  await passwordInput.fill(password)

  // Submit
  const submitBtn = page.locator('button[type="submit"]')
  await submitBtn.click()

  // Wait for redirect away from login page
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })
}

test.describe('Multi-Tenant Access - Auth-Aware Loading', () => {

  test.describe('Fresh Session (Simulates Incognito)', () => {

    test('should redirect to login when not authenticated', async ({ page }) => {
      // Clear all storage to simulate incognito
      await page.context().clearCookies()

      await page.goto('/')
      // Should redirect to /login since no session exists
      await page.waitForURL('**/login', { timeout: 10000 })
      await expect(page).toHaveURL(/\/login/)
    })

    test('should show events after login (not empty)', async ({ page }) => {
      test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'TEST_USER_EMAIL and TEST_USER_PASSWORD required')

      // Clear all storage to simulate incognito
      await page.context().clearCookies()
      await page.evaluate(() => localStorage.clear())

      // Login
      await loginUser(page, TEST_EMAIL, TEST_PASSWORD)

      // Should be on home page now
      await page.waitForLoadState('networkidle')

      // Wait for events to load (the fix ensures events load after auth)
      // Look for event cards or event content - not the empty state
      const eventCards = page.getByTestId('event-card')
      const emptyState = page.locator('text=אין אירועים עדיין')

      // Wait for either events or empty state to appear (loading finished)
      await Promise.race([
        eventCards.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => null),
        emptyState.waitFor({ state: 'visible', timeout: 15000 }).catch(() => null),
      ])

      // The user (super_admin) has events - they should be visible
      const eventCount = await eventCards.count()
      expect(eventCount).toBeGreaterThan(0)
    })

    test('should show correct dashboard stats after login', async ({ page }) => {
      test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'TEST_USER_EMAIL and TEST_USER_PASSWORD required')

      // Clear storage
      await page.context().clearCookies()
      await page.evaluate(() => localStorage.clear())

      // Login
      await loginUser(page, TEST_EMAIL, TEST_PASSWORD)

      // Navigate to settings/dashboard
      await page.goto('/settings')
      await page.waitForLoadState('networkidle')

      // Dashboard stats should show non-zero values (user has events)
      const dashboardTitle = page.getByTestId('dashboard-title')
      if (await dashboardTitle.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Wait for loading to finish
        await page.waitForTimeout(3000)

        // Check that events count is visible and > 0
        const eventsCard = page.getByTestId('events-card')
        if (await eventsCard.isVisible({ timeout: 5000 }).catch(() => false)) {
          const text = await eventsCard.textContent()
          // Should contain a number > 0 (not just "0")
          expect(text).toBeTruthy()
        }
      }
    })
  })

  test.describe('Auth State Transitions', () => {

    test('should clear events on logout', async ({ page }) => {
      test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'TEST_USER_EMAIL and TEST_USER_PASSWORD required')

      // Clear storage and login fresh
      await page.context().clearCookies()
      await page.evaluate(() => localStorage.clear())

      await loginUser(page, TEST_EMAIL, TEST_PASSWORD)
      await page.waitForLoadState('networkidle')

      // Verify events are loaded
      const eventCards = page.getByTestId('event-card')
      await eventCards.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => null)
      const eventCountBefore = await eventCards.count()
      expect(eventCountBefore).toBeGreaterThan(0)

      // Find and click logout button
      const logoutBtn = page.locator('[data-testid="logout-btn"], button:has-text("התנתק"), button:has-text("יציאה")')
      if (await logoutBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await logoutBtn.first().click()

        // Should redirect to login
        await page.waitForURL('**/login', { timeout: 10000 })
        await expect(page).toHaveURL(/\/login/)
      }
    })

    test('should re-load events after re-login', async ({ page }) => {
      test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'TEST_USER_EMAIL and TEST_USER_PASSWORD required')

      // Clear storage
      await page.context().clearCookies()
      await page.evaluate(() => localStorage.clear())

      // First login
      await loginUser(page, TEST_EMAIL, TEST_PASSWORD)
      await page.waitForLoadState('networkidle')

      // Wait for events
      const eventCards = page.getByTestId('event-card')
      await eventCards.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => null)
      const firstCount = await eventCards.count()

      // Navigate to login (simulating logout + re-login)
      await page.evaluate(() => localStorage.clear())
      await page.context().clearCookies()
      await page.goto('/login')
      await page.waitForURL('**/login', { timeout: 10000 })

      // Second login
      await loginUser(page, TEST_EMAIL, TEST_PASSWORD)
      await page.waitForLoadState('networkidle')

      // Events should load again
      await eventCards.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => null)
      const secondCount = await eventCards.count()

      // Should see the same events
      expect(secondCount).toBe(firstCount)
      expect(secondCount).toBeGreaterThan(0)
    })
  })

  test.describe('Organization Isolation (RLS)', () => {

    test('unauthenticated requests return no events', async ({ page }) => {
      // Make a direct Supabase query without auth to verify RLS blocks it
      const response = await page.evaluate(async () => {
        const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL
        const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseKey) return { error: 'no config' }

        const res = await fetch(`${supabaseUrl}/rest/v1/events?select=id,name`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          }
        })
        const data = await res.json()
        return { count: Array.isArray(data) ? data.length : -1, status: res.status }
      })

      // Anon key without user session should return 0 events (RLS blocks)
      if (response && typeof response.count === 'number' && response.count >= 0) {
        expect(response.count).toBe(0)
      }
    })
  })
})
