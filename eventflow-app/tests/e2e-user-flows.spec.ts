import { test, expect } from '@playwright/test'

/**
 * EventFlow AI - E2E User Flow Tests
 *
 * Complete user journey tests - flexible to handle features not yet implemented
 * Tests check for element existence before interacting
 */

test.describe('EventFlow AI - E2E User Flows', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. EVENT CREATION FLOW
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Event Creation Flow', () => {
    test('should navigate to events page and view list', async ({ page }) => {
      await page.goto('/')
      await expect(page.getByTestId('dashboard-title')).toBeVisible()

      await page.getByTestId('nav-events').click()
      await expect(page.getByTestId('events-title')).toBeVisible()
      await expect(page.getByTestId('events-list')).toBeVisible()
    })

    test('should have create event button', async ({ page }) => {
      await page.goto('/events')
      await expect(page.getByTestId('events-title')).toBeVisible()
      await expect(page.getByTestId('create-event-btn')).toBeVisible()
    })

    test('should display event items or empty state', async ({ page }) => {
      await page.goto('/events')
      await expect(page.getByTestId('events-list')).toBeVisible()

      // Either has events or shows empty state
      const eventsList = page.getByTestId('events-list')
      const content = await eventsList.textContent()
      expect(content).toBeTruthy()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. GUEST MANAGEMENT FLOW
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Guest Management Flow', () => {
    test('should navigate to guests page', async ({ page }) => {
      await page.goto('/guests')
      await expect(page.getByTestId('guests-title')).toBeVisible()
      await expect(page.getByTestId('guests-list')).toBeVisible()
    })

    test('should show empty state when no guests', async ({ page }) => {
      await page.goto('/guests')
      const guestsList = page.getByTestId('guests-list')
      await expect(guestsList).toContainText('אין אורחים עדיין')
    })

    test('should have add guest button', async ({ page }) => {
      await page.goto('/guests')
      await expect(page.getByTestId('add-guest-btn')).toBeVisible()
    })

    test('should have import and export functionality', async ({ page }) => {
      await page.goto('/guests')
      await expect(page.getByTestId('import-csv-btn')).toBeVisible()
      await expect(page.getByTestId('export-csv-btn')).toBeVisible()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. VENDOR SELECTION FLOW
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Vendor Selection Flow', () => {
    test('should navigate to vendors page', async ({ page }) => {
      await page.goto('/vendors')
      await expect(page.getByTestId('vendors-title')).toBeVisible()
      await expect(page.getByTestId('vendors-list')).toBeVisible()
    })

    test('should display vendor categories or empty state', async ({ page }) => {
      await page.goto('/vendors')
      const vendorsList = page.getByTestId('vendors-list')
      await expect(vendorsList).toBeVisible()

      const content = await vendorsList.textContent()
      expect(content).toBeTruthy()
    })

    test('should have category filter', async ({ page }) => {
      await page.goto('/vendors')
      await expect(page.getByTestId('category-filter')).toBeVisible()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. MESSAGING FLOW
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Messaging Flow', () => {
    test('should navigate to messages page', async ({ page }) => {
      await page.goto('/messages')
      await expect(page.getByTestId('messages-panel')).toBeVisible()
    })

    test('should have message input fields', async ({ page }) => {
      await page.goto('/messages')

      await expect(page.getByTestId('recipient-input')).toBeVisible()
      await expect(page.getByTestId('message-input')).toBeVisible()
      await expect(page.getByTestId('send-message-btn')).toBeVisible()
    })

    test('should allow entering message details', async ({ page }) => {
      await page.goto('/messages')

      await page.getByTestId('recipient-input').fill('0501234567')
      await page.getByTestId('message-input').fill('הודעת בדיקה')

      await expect(page.getByTestId('recipient-input')).toHaveValue('0501234567')
      await expect(page.getByTestId('message-input')).toHaveValue('הודעת בדיקה')
    })

    test('should have send button enabled when form is valid', async ({ page }) => {
      await page.goto('/messages')

      await page.getByTestId('recipient-input').fill('0501234567')
      await page.getByTestId('message-input').fill('Test')

      await expect(page.getByTestId('send-message-btn')).toBeEnabled()
    })

    test.skip('should have template selection (not yet implemented)', async ({ page }) => {
      await page.goto('/messages')
      await expect(page.getByTestId('template-select')).toBeVisible()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. AI ASSISTANT FLOW
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('AI Assistant Flow', () => {
    test('should navigate to AI chat page', async ({ page }) => {
      await page.goto('/ai')
      await expect(page.getByTestId('ai-title')).toBeVisible()
      await expect(page.getByTestId('ai-chat')).toBeVisible()
    })

    test('should have chat input and send button', async ({ page }) => {
      await page.goto('/ai')

      await expect(page.getByTestId('ai-input')).toBeVisible()
      await expect(page.getByTestId('ai-send-btn')).toBeVisible()
    })

    test('should allow entering chat message', async ({ page }) => {
      await page.goto('/ai')

      await page.getByTestId('ai-input').fill('שלום, אני צריך עזרה')
      await expect(page.getByTestId('ai-input')).toHaveValue('שלום, אני צריך עזרה')
    })

    test('should show chat history area', async ({ page }) => {
      await page.goto('/ai')

      await expect(page.getByTestId('chat-history')).toBeVisible()
      await expect(page.getByTestId('chat-history')).toContainText('התחל שיחה')
    })

    test.skip('should have new chat button (not yet implemented)', async ({ page }) => {
      await page.goto('/ai')
      await expect(page.getByTestId('new-chat-btn')).toBeVisible()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. CHECKLIST FLOW
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Checklist Flow', () => {
    test('should navigate to checklist page', async ({ page }) => {
      await page.goto('/checklist')
      await expect(page.getByTestId('checklist-title')).toBeVisible()
      await expect(page.getByTestId('checklist-list')).toBeVisible()
    })

    test('should display checklist items or default state', async ({ page }) => {
      await page.goto('/checklist')
      const checklistList = page.getByTestId('checklist-list')
      await expect(checklistList).toBeVisible()

      const content = await checklistList.textContent()
      expect(content).toBeTruthy()
    })

    test.skip('should have add item button (not yet implemented)', async ({ page }) => {
      await page.goto('/checklist')
      await expect(page.getByTestId('add-item-btn')).toBeVisible()
    })

    test.skip('should have filter functionality (not yet implemented)', async ({ page }) => {
      await page.goto('/checklist')
      await expect(page.getByTestId('checklist-filter')).toBeVisible()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. CHECK-IN FLOW (Optional Feature)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Check-in Flow', () => {
    test('should navigate to check-in page', async ({ page }) => {
      await page.goto('/checkin')
      await expect(page).toHaveURL(/checkin/)
      await expect(page.getByTestId('checkin-title')).toBeVisible()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. COMPLETE USER JOURNEY
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Complete User Journey', () => {
    test('should navigate through all main pages successfully', async ({ page }) => {
      // Start at dashboard
      await page.goto('/')
      await expect(page.getByTestId('dashboard-title')).toBeVisible()

      // Events
      await page.getByTestId('nav-events').click()
      await expect(page.getByTestId('events-title')).toBeVisible()

      // Guests
      await page.getByTestId('nav-guests').click()
      await expect(page.getByTestId('guests-title')).toBeVisible()

      // Vendors
      await page.getByTestId('nav-vendors').click()
      await expect(page.getByTestId('vendors-title')).toBeVisible()

      // Checklist
      await page.getByTestId('nav-checklist').click()
      await expect(page.getByTestId('checklist-title')).toBeVisible()

      // Messages
      await page.getByTestId('nav-messages').click()
      await expect(page.getByTestId('messages-panel')).toBeVisible()

      // AI
      await page.getByTestId('nav-ai').click()
      await expect(page.getByTestId('ai-title')).toBeVisible()

      // Return to dashboard (home)
      await page.getByTestId('nav-home').click()
      await expect(page.getByTestId('dashboard-title')).toBeVisible()
    })

    test('should handle browser back/forward navigation', async ({ page }) => {
      await page.goto('/')

      // Navigate forward
      await page.getByTestId('nav-events').click()
      await expect(page.getByTestId('events-title')).toBeVisible()

      await page.getByTestId('nav-guests').click()
      await expect(page.getByTestId('guests-title')).toBeVisible()

      // Go back
      await page.goBack()
      await expect(page.getByTestId('events-title')).toBeVisible()

      // Go forward
      await page.goForward()
      await expect(page.getByTestId('guests-title')).toBeVisible()
    })

    test('should maintain app stability during rapid navigation', async ({ page }) => {
      await page.goto('/')

      // Rapid navigation
      const navItems = ['events', 'guests', 'vendors', 'checklist', 'messages', 'ai', 'home']

      for (const item of navItems) {
        await page.getByTestId(`nav-${item}`).click()
      }

      // Should end at home (dashboard)
      await expect(page.getByTestId('dashboard-title')).toBeVisible()

      // App should be functional
      await expect(page.getByTestId('app-container')).toBeVisible()
    })

    test('should not have JavaScript errors during navigation', async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', err => errors.push(err.message))

      await page.goto('/')
      await page.getByTestId('nav-events').click()
      await page.getByTestId('nav-guests').click()
      await page.getByTestId('nav-vendors').click()
      await page.getByTestId('nav-home').click()

      // No critical errors
      expect(errors.filter(e => !e.includes('ResizeObserver')).length).toBe(0)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. FORM INTERACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Form Interactions', () => {
    test('should handle Hebrew text input correctly', async ({ page }) => {
      await page.goto('/messages')

      const input = page.getByTestId('message-input')
      await input.fill('שלום עולם! זוהי הודעת בדיקה בעברית')

      await expect(input).toHaveValue('שלום עולם! זוהי הודעת בדיקה בעברית')
    })

    test('should handle phone number input', async ({ page }) => {
      await page.goto('/messages')

      const phoneInput = page.getByTestId('recipient-input')
      await phoneInput.fill('0501234567')
      await expect(phoneInput).toHaveValue('0501234567')

      await phoneInput.clear()
      await phoneInput.fill('+972501234567')
      await expect(phoneInput).toHaveValue('+972501234567')
    })

    test('should handle emoji in messages', async ({ page }) => {
      await page.goto('/messages')

      const input = page.getByTestId('message-input')
      await input.fill('שלום! 🎉 מזל טוב! 🎂')

      await expect(input).toHaveValue('שלום! 🎉 מזל טוב! 🎂')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. RESPONSIVE BEHAVIOR
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Responsive Behavior', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/')

      await expect(page.getByTestId('app-container')).toBeVisible()
      await expect(page.getByTestId('dashboard-title')).toBeVisible()
    })

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto('/')

      await expect(page.getByTestId('app-container')).toBeVisible()
      await expect(page.getByTestId('dashboard-title')).toBeVisible()
    })

    test('should work on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 })
      await page.goto('/')

      await expect(page.getByTestId('app-container')).toBeVisible()
      await expect(page.getByTestId('dashboard-title')).toBeVisible()
    })
  })
})
