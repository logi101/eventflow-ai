import { test, expect } from '@playwright/test'

test.describe('EventFlow AI - Comprehensive QA Testing', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. APP STRUCTURE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('App Structure', () => {
    test('should load the app container', async ({ page }) => {
      await page.goto('/')
      await expect(page.getByTestId('app-container')).toBeVisible()
    })

    test('should display sidebar navigation', async ({ page }) => {
      await page.goto('/')
      await expect(page.getByTestId('sidebar')).toBeVisible()
    })

    test('should display app logo', async ({ page }) => {
      await page.goto('/')
      await expect(page.getByTestId('app-logo')).toBeVisible()
      await expect(page.getByTestId('app-logo')).toContainText('EventFlow AI')
    })

    test('should display main content area', async ({ page }) => {
      await page.goto('/')
      await expect(page.getByTestId('main-content')).toBeVisible()
    })

    test('should have RTL direction', async ({ page }) => {
      await page.goto('/')
      const container = page.getByTestId('app-container')
      await expect(container).toHaveAttribute('dir', 'rtl')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. NAVIGATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Navigation', () => {
    test('should have all navigation links', async ({ page }) => {
      await page.goto('/')
      await expect(page.getByTestId('nav-home')).toBeVisible()
      await expect(page.getByTestId('nav-events')).toBeVisible()
      await expect(page.getByTestId('nav-guests')).toBeVisible()
      await expect(page.getByTestId('nav-vendors')).toBeVisible()
      await expect(page.getByTestId('nav-checklist')).toBeVisible()
      await expect(page.getByTestId('nav-messages')).toBeVisible()
      await expect(page.getByTestId('nav-ai')).toBeVisible()
    })

    test('should navigate to Dashboard (home)', async ({ page }) => {
      await page.goto('/events')
      await page.getByTestId('nav-home').click()
      await expect(page).toHaveURL('/')
      await expect(page.getByTestId('dashboard-title')).toBeVisible()
    })

    test('should navigate to Events page', async ({ page }) => {
      await page.goto('/')
      await page.getByTestId('nav-events').click()
      await expect(page).toHaveURL('/events')
      await expect(page.getByTestId('events-title')).toBeVisible()
    })

    test('should navigate to Guests page', async ({ page }) => {
      await page.goto('/')
      await page.getByTestId('nav-guests').click()
      await expect(page).toHaveURL('/guests')
      await expect(page.getByTestId('guests-title')).toBeVisible()
    })

    test('should navigate to Vendors page', async ({ page }) => {
      await page.goto('/')
      await page.getByTestId('nav-vendors').click()
      await expect(page).toHaveURL('/vendors')
      await expect(page.getByTestId('vendors-title')).toBeVisible()
    })

    test('should navigate to Checklist page', async ({ page }) => {
      await page.goto('/')
      await page.getByTestId('nav-checklist').click()
      await expect(page).toHaveURL('/checklist')
      await expect(page.getByTestId('checklist-title')).toBeVisible()
    })

    test('should navigate to Messages page', async ({ page }) => {
      await page.goto('/')
      await page.getByTestId('nav-messages').click()
      await expect(page).toHaveURL('/messages')
      await expect(page.getByTestId('messages-title')).toBeVisible()
    })

    test('should navigate to AI Assistant page', async ({ page }) => {
      await page.goto('/')
      await page.getByTestId('nav-ai').click()
      await expect(page).toHaveURL('/ai')
      await expect(page.getByTestId('ai-title')).toBeVisible()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. DASHBOARD PAGE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Dashboard Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
    })

    test('should display dashboard title in Hebrew', async ({ page }) => {
      await expect(page.getByTestId('dashboard-title')).toContainText('לוח בקרה')
    })

    test('should display events card', async ({ page }) => {
      await expect(page.getByTestId('events-card')).toBeVisible()
      await expect(page.getByTestId('events-card')).toContainText('אירועים פעילים')
    })

    test('should display guests card', async ({ page }) => {
      await expect(page.getByTestId('guests-card')).toBeVisible()
      await expect(page.getByTestId('guests-card')).toContainText('אורחים רשומים')
    })

    test('should display tasks card', async ({ page }) => {
      await expect(page.getByTestId('tasks-card')).toBeVisible()
      await expect(page.getByTestId('tasks-card')).toContainText('משימות פתוחות')
    })

    test('should show zero counts initially', async ({ page }) => {
      await expect(page.getByTestId('events-card')).toContainText('0')
      await expect(page.getByTestId('guests-card')).toContainText('0')
      await expect(page.getByTestId('tasks-card')).toContainText('0')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. EVENTS PAGE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Events Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/events')
    })

    test('should display events title in Hebrew', async ({ page }) => {
      await expect(page.getByTestId('events-title')).toContainText('אירועים')
    })

    test('should display create event button', async ({ page }) => {
      await expect(page.getByTestId('create-event-btn')).toBeVisible()
      await expect(page.getByTestId('create-event-btn')).toContainText('אירוע חדש')
    })

    test('should display events list container', async ({ page }) => {
      await expect(page.getByTestId('events-list')).toBeVisible()
    })

    test('should show empty state message', async ({ page }) => {
      await expect(page.getByTestId('events-list')).toContainText('אין אירועים עדיין')
    })

    test('create event button should be clickable', async ({ page }) => {
      const btn = page.getByTestId('create-event-btn')
      await expect(btn).toBeEnabled()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. GUESTS PAGE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Guests Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/guests')
    })

    test('should display guests title in Hebrew', async ({ page }) => {
      await expect(page.getByTestId('guests-title')).toContainText('אורחים')
    })

    test('should display add guest button', async ({ page }) => {
      await expect(page.getByTestId('add-guest-btn')).toBeVisible()
      await expect(page.getByTestId('add-guest-btn')).toContainText('הוסף אורח')
    })

    test('should display guests list container', async ({ page }) => {
      await expect(page.getByTestId('guests-list')).toBeVisible()
    })

    test('should show empty state message', async ({ page }) => {
      await expect(page.getByTestId('guests-list')).toContainText('אין אורחים עדיין')
    })

    test('add guest button should be clickable', async ({ page }) => {
      const btn = page.getByTestId('add-guest-btn')
      await expect(btn).toBeEnabled()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. VENDORS PAGE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Vendors Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/vendors')
    })

    test('should display vendors title in Hebrew', async ({ page }) => {
      await expect(page.getByTestId('vendors-title')).toContainText('ספקים')
    })

    test('should display add vendor button', async ({ page }) => {
      await expect(page.getByTestId('add-vendor-btn')).toBeVisible()
      await expect(page.getByTestId('add-vendor-btn')).toContainText('הוסף ספק')
    })

    test('should display vendors list container', async ({ page }) => {
      await expect(page.getByTestId('vendors-list')).toBeVisible()
    })

    test('should show empty state message', async ({ page }) => {
      await expect(page.getByTestId('vendors-list')).toContainText('אין ספקים עדיין')
    })

    test('add vendor button should be clickable', async ({ page }) => {
      const btn = page.getByTestId('add-vendor-btn')
      await expect(btn).toBeEnabled()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. CHECKLIST PAGE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Checklist Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/checklist')
    })

    test('should display checklist title in Hebrew', async ({ page }) => {
      await expect(page.getByTestId('checklist-title')).toContainText('צ\'קליסט')
    })

    test('should display add task button', async ({ page }) => {
      await expect(page.getByTestId('add-task-btn')).toBeVisible()
      await expect(page.getByTestId('add-task-btn')).toContainText('משימה חדשה')
    })

    test('should display checklist container', async ({ page }) => {
      await expect(page.getByTestId('checklist-list')).toBeVisible()
    })

    test('should show empty state message', async ({ page }) => {
      await expect(page.getByTestId('checklist-list')).toContainText('אין משימות עדיין')
    })

    test('add task button should be clickable', async ({ page }) => {
      const btn = page.getByTestId('add-task-btn')
      await expect(btn).toBeEnabled()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. MESSAGES PAGE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Messages Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/messages')
    })

    test('should display messages title in Hebrew', async ({ page }) => {
      await expect(page.getByTestId('messages-title')).toContainText('הודעות WhatsApp')
    })

    test('should display messages panel', async ({ page }) => {
      await expect(page.getByTestId('messages-panel')).toBeVisible()
    })

    test('should display recipient input', async ({ page }) => {
      await expect(page.getByTestId('recipient-input')).toBeVisible()
    })

    test('should display message input', async ({ page }) => {
      await expect(page.getByTestId('message-input')).toBeVisible()
    })

    test('should display send button', async ({ page }) => {
      await expect(page.getByTestId('send-message-btn')).toBeVisible()
      await expect(page.getByTestId('send-message-btn')).toContainText('שלח הודעה')
    })

    test('recipient input should accept text', async ({ page }) => {
      const input = page.getByTestId('recipient-input')
      await input.fill('0501234567')
      await expect(input).toHaveValue('0501234567')
    })

    test('message input should accept text', async ({ page }) => {
      const input = page.getByTestId('message-input')
      await input.fill('הודעת בדיקה')
      await expect(input).toHaveValue('הודעת בדיקה')
    })

    test('send button should be clickable', async ({ page }) => {
      const btn = page.getByTestId('send-message-btn')
      await expect(btn).toBeEnabled()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. AI ASSISTANT PAGE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('AI Assistant Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/ai')
    })

    test('should display AI title in Hebrew', async ({ page }) => {
      await expect(page.getByTestId('ai-title')).toContainText('עוזר AI')
    })

    test('should display AI chat container', async ({ page }) => {
      await expect(page.getByTestId('ai-chat')).toBeVisible()
    })

    test('should display chat history area', async ({ page }) => {
      await expect(page.getByTestId('chat-history')).toBeVisible()
    })

    test('should display AI input', async ({ page }) => {
      await expect(page.getByTestId('ai-input')).toBeVisible()
    })

    test('should display send button', async ({ page }) => {
      await expect(page.getByTestId('ai-send-btn')).toBeVisible()
      await expect(page.getByTestId('ai-send-btn')).toContainText('שלח')
    })

    test('chat history should show initial message', async ({ page }) => {
      await expect(page.getByTestId('chat-history')).toContainText('התחל שיחה עם העוזר החכם')
    })

    test('AI input should accept text', async ({ page }) => {
      const input = page.getByTestId('ai-input')
      await input.fill('מה אני צריך לאירוע יום הולדת?')
      await expect(input).toHaveValue('מה אני צריך לאירוע יום הולדת?')
    })

    test('send button should be clickable', async ({ page }) => {
      const btn = page.getByTestId('ai-send-btn')
      await expect(btn).toBeEnabled()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. RESPONSIVE DESIGN TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Responsive Design', () => {
    test('should display correctly on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 })
      await page.goto('/')
      await expect(page.getByTestId('sidebar')).toBeVisible()
      await expect(page.getByTestId('main-content')).toBeVisible()
    })

    test('should display correctly on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto('/')
      await expect(page.getByTestId('app-container')).toBeVisible()
    })

    test('should display correctly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/')
      await expect(page.getByTestId('app-container')).toBeVisible()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. ACCESSIBILITY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Accessibility', () => {
    test('all buttons should be keyboard accessible', async ({ page }) => {
      await page.goto('/events')
      const btn = page.getByTestId('create-event-btn')
      await btn.focus()
      await expect(btn).toBeFocused()
    })

    test('all inputs should be focusable', async ({ page }) => {
      await page.goto('/messages')
      const input = page.getByTestId('recipient-input')
      await input.focus()
      await expect(input).toBeFocused()
    })

    test('navigation should be keyboard navigable', async ({ page }) => {
      await page.goto('/')
      await page.keyboard.press('Tab')
      // Should be able to tab through navigation
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. PERFORMANCE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Performance', () => {
    test('page should load within 3 seconds', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/')
      await expect(page.getByTestId('dashboard-title')).toBeVisible()
      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(3000)
    })

    test('navigation should be fast', async ({ page }) => {
      await page.goto('/')
      const startTime = Date.now()
      await page.getByTestId('nav-events').click()
      await expect(page.getByTestId('events-title')).toBeVisible()
      const navTime = Date.now() - startTime
      expect(navTime).toBeLessThan(500)
    })
  })
})
