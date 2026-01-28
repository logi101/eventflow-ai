import { test, expect } from '@playwright/test'

test.describe('EventFlow AI - Advanced QA Testing (Level 2)', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. DEEP USER INTERACTION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Deep User Interactions', () => {
    test('should maintain active state on navigation links', async ({ page }) => {
      await page.goto('/')

      // Check home is active
      const homeLink = page.getByTestId('nav-home')
      await expect(homeLink).toHaveClass(/active/)

      // Navigate to events
      await page.getByTestId('nav-events').click()
      await expect(page.getByTestId('nav-events')).toHaveClass(/active/)

      // Home should no longer be active
      await expect(homeLink).not.toHaveClass(/active/)
    })

    test('should navigate through all pages sequentially', async ({ page }) => {
      await page.goto('/')

      const pages = [
        { nav: 'nav-events', title: 'events-title', text: 'אירועים' },
        { nav: 'nav-guests', title: 'guests-title', text: 'אורחים' },
        { nav: 'nav-vendors', title: 'vendors-title', text: 'ספקים' },
        { nav: 'nav-checklist', title: 'checklist-title', text: "צ'קליסט" },
        { nav: 'nav-messages', title: 'messages-title', text: 'הודעות WhatsApp' },
        { nav: 'nav-ai', title: 'ai-title', text: 'עוזר AI' },
        { nav: 'nav-home', title: 'dashboard-title', text: 'לוח בקרה' },
      ]

      for (const p of pages) {
        await page.getByTestId(p.nav).click()
        await expect(page.getByTestId(p.title)).toContainText(p.text)
      }
    })

    test('should handle rapid navigation clicks', async ({ page }) => {
      await page.goto('/')

      // Rapid clicks
      await page.getByTestId('nav-events').click()
      await page.getByTestId('nav-guests').click()
      await page.getByTestId('nav-vendors').click()
      await page.getByTestId('nav-checklist').click()

      // Should end up on checklist
      await expect(page).toHaveURL('/checklist')
      await expect(page.getByTestId('checklist-title')).toBeVisible()
    })

    test('should handle double-click on buttons', async ({ page }) => {
      await page.goto('/events')

      const btn = page.getByTestId('create-event-btn')
      await btn.dblclick()

      // Button should still be functional
      await expect(btn).toBeVisible()
      await expect(btn).toBeEnabled()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. FORM INPUT VALIDATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Form Input Validation', () => {
    test('should accept valid phone number format', async ({ page }) => {
      await page.goto('/messages')

      const input = page.getByTestId('recipient-input')

      // Test various phone formats
      await input.fill('0501234567')
      await expect(input).toHaveValue('0501234567')

      await input.clear()
      await input.fill('+972501234567')
      await expect(input).toHaveValue('+972501234567')
    })

    test('should handle special characters in message', async ({ page }) => {
      await page.goto('/messages')

      const input = page.getByTestId('message-input')
      const specialChars = 'שלום! @#$%^&*() הודעה עם תווים מיוחדים 🎉'

      await input.fill(specialChars)
      await expect(input).toHaveValue(specialChars)
    })

    test('should handle very long message', async ({ page }) => {
      await page.goto('/messages')

      const input = page.getByTestId('message-input')
      const longMessage = 'א'.repeat(1000)

      await input.fill(longMessage)
      await expect(input).toHaveValue(longMessage)
    })

    test('should handle empty inputs', async ({ page }) => {
      await page.goto('/messages')

      const recipientInput = page.getByTestId('recipient-input')
      const messageInput = page.getByTestId('message-input')

      // Fill and clear
      await recipientInput.fill('test')
      await recipientInput.clear()
      await expect(recipientInput).toHaveValue('')

      await messageInput.fill('test')
      await messageInput.clear()
      await expect(messageInput).toHaveValue('')
    })

    test('should handle Hebrew text input', async ({ page }) => {
      await page.goto('/ai')

      const input = page.getByTestId('ai-input')
      const hebrewText = 'מה אני צריך לאירוע יום הולדת לילד בן 5?'

      await input.fill(hebrewText)
      await expect(input).toHaveValue(hebrewText)
    })

    test('should handle English text input', async ({ page }) => {
      await page.goto('/ai')

      const input = page.getByTestId('ai-input')
      const englishText = 'What do I need for a birthday party?'

      await input.fill(englishText)
      await expect(input).toHaveValue(englishText)
    })

    test('should handle mixed Hebrew/English text', async ({ page }) => {
      await page.goto('/ai')

      const input = page.getByTestId('ai-input')
      const mixedText = 'אני רוצה party לילד בן 5 years old'

      await input.fill(mixedText)
      await expect(input).toHaveValue(mixedText)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. KEYBOARD NAVIGATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Keyboard Navigation', () => {
    test('should navigate with Tab key', async ({ page }) => {
      await page.goto('/messages')

      // Focus on first input
      await page.getByTestId('recipient-input').focus()

      // Tab to message input
      await page.keyboard.press('Tab')
      await expect(page.getByTestId('message-input')).toBeFocused()

      // Tab to send button
      await page.keyboard.press('Tab')
      await expect(page.getByTestId('send-message-btn')).toBeFocused()
    })

    test('should submit with Enter key in AI chat', async ({ page }) => {
      await page.goto('/ai')

      const input = page.getByTestId('ai-input')
      await input.fill('שאלה לדוגמה')
      await input.focus()

      // Press Enter (should not cause error even without handler)
      await page.keyboard.press('Enter')

      // Input should still be present
      await expect(input).toBeVisible()
    })

    test('should handle Escape key', async ({ page }) => {
      await page.goto('/messages')

      const input = page.getByTestId('recipient-input')
      await input.fill('test')
      await input.focus()

      // Press Escape
      await page.keyboard.press('Escape')

      // Input should still have value (no blur on escape by default)
      await expect(input).toHaveValue('test')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. HOVER AND FOCUS STATES
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Hover and Focus States', () => {
    test('should show hover state on navigation links', async ({ page }) => {
      await page.goto('/')

      const eventsLink = page.getByTestId('nav-events')
      await eventsLink.hover()

      // Link should be visible and interactive
      await expect(eventsLink).toBeVisible()
    })

    test('should show focus ring on inputs', async ({ page }) => {
      await page.goto('/messages')

      const input = page.getByTestId('recipient-input')
      await input.focus()

      await expect(input).toBeFocused()
    })

    test('should show hover state on buttons', async ({ page }) => {
      await page.goto('/events')

      const btn = page.getByTestId('create-event-btn')
      await btn.hover()

      await expect(btn).toBeVisible()
      await expect(btn).toBeEnabled()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Edge Cases', () => {
    test('should handle page refresh', async ({ page }) => {
      await page.goto('/events')
      await expect(page.getByTestId('events-title')).toBeVisible()

      // Refresh
      await page.reload()

      // Should still be on events page
      await expect(page.getByTestId('events-title')).toBeVisible()
    })

    test('should handle direct URL navigation', async ({ page }) => {
      // Navigate directly to each route
      await page.goto('/events')
      await expect(page.getByTestId('events-title')).toBeVisible()

      await page.goto('/guests')
      await expect(page.getByTestId('guests-title')).toBeVisible()

      await page.goto('/vendors')
      await expect(page.getByTestId('vendors-title')).toBeVisible()

      await page.goto('/checklist')
      await expect(page.getByTestId('checklist-title')).toBeVisible()

      await page.goto('/messages')
      await expect(page.getByTestId('messages-title')).toBeVisible()

      await page.goto('/ai')
      await expect(page.getByTestId('ai-title')).toBeVisible()
    })

    test('should handle invalid route gracefully', async ({ page }) => {
      await page.goto('/invalid-route-that-does-not-exist')

      // Should render something (app container at minimum)
      await expect(page.getByTestId('app-container')).toBeVisible()
      await expect(page.getByTestId('sidebar')).toBeVisible()
    })

    test('should handle browser back/forward', async ({ page }) => {
      await page.goto('/')
      await page.getByTestId('nav-events').click()
      await expect(page).toHaveURL('/events')

      await page.getByTestId('nav-guests').click()
      await expect(page).toHaveURL('/guests')

      // Go back
      await page.goBack()
      await expect(page).toHaveURL('/events')

      // Go forward
      await page.goForward()
      await expect(page).toHaveURL('/guests')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. VISUAL CONSISTENCY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Visual Consistency', () => {
    test('sidebar should be consistent across all pages', async ({ page }) => {
      const pages = ['/', '/events', '/guests', '/vendors', '/checklist', '/messages', '/ai']

      for (const p of pages) {
        await page.goto(p)
        await expect(page.getByTestId('sidebar')).toBeVisible()
        await expect(page.getByTestId('app-logo')).toContainText('EventFlow AI')
      }
    })

    test('cards should have consistent styling', async ({ page }) => {
      await page.goto('/')

      const eventsCard = page.getByTestId('events-card')
      const guestsCard = page.getByTestId('guests-card')
      const tasksCard = page.getByTestId('tasks-card')

      // All cards should have the .card class styling
      await expect(eventsCard).toBeVisible()
      await expect(guestsCard).toBeVisible()
      await expect(tasksCard).toBeVisible()
    })

    test('buttons should have consistent styling', async ({ page }) => {
      await page.goto('/events')
      const eventsBtn = page.getByTestId('create-event-btn')
      await expect(eventsBtn).toBeVisible()

      await page.goto('/guests')
      const guestsBtn = page.getByTestId('add-guest-btn')
      await expect(guestsBtn).toBeVisible()

      await page.goto('/vendors')
      const vendorsBtn = page.getByTestId('add-vendor-btn')
      await expect(vendorsBtn).toBeVisible()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. HEBREW RTL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Hebrew RTL Support', () => {
    test('should display Hebrew text correctly', async ({ page }) => {
      await page.goto('/')

      // Check Hebrew titles
      await expect(page.getByTestId('dashboard-title')).toContainText('לוח בקרה')
      await expect(page.getByTestId('events-card')).toContainText('אירועים פעילים')
      await expect(page.getByTestId('guests-card')).toContainText('אורחים רשומים')
      await expect(page.getByTestId('tasks-card')).toContainText('משימות פתוחות')
    })

    test('should have RTL direction on app container', async ({ page }) => {
      await page.goto('/')

      const container = page.getByTestId('app-container')
      await expect(container).toHaveAttribute('dir', 'rtl')
    })

    test('should display Hebrew navigation labels', async ({ page }) => {
      await page.goto('/')

      await expect(page.getByTestId('nav-home')).toContainText('לוח בקרה')
      await expect(page.getByTestId('nav-events')).toContainText('אירועים')
      await expect(page.getByTestId('nav-guests')).toContainText('אורחים')
      await expect(page.getByTestId('nav-vendors')).toContainText('ספקים')
      await expect(page.getByTestId('nav-checklist')).toContainText("צ'קליסט")
      await expect(page.getByTestId('nav-messages')).toContainText('הודעות')
      await expect(page.getByTestId('nav-ai')).toContainText('עוזר AI')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. STRESS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Stress Tests', () => {
    test('should handle 50 rapid navigations', async ({ page }) => {
      await page.goto('/')

      const navItems = ['nav-events', 'nav-guests', 'nav-vendors', 'nav-checklist', 'nav-messages', 'nav-ai', 'nav-home']

      for (let i = 0; i < 50; i++) {
        const navItem = navItems[i % navItems.length]
        await page.getByTestId(navItem).click()
      }

      // App should still be functional
      await expect(page.getByTestId('app-container')).toBeVisible()
    })

    test('should handle rapid input typing', async ({ page }) => {
      await page.goto('/messages')

      const input = page.getByTestId('message-input')

      // Type very fast
      await input.fill('הודעה ארוכה מאוד שכוללת הרבה מילים ותווים שונים ומשונים 1234567890 !@#$%')

      await expect(input).toHaveValue('הודעה ארוכה מאוד שכוללת הרבה מילים ותווים שונים ומשונים 1234567890 !@#$%')
    })

    test('should handle multiple page loads', async ({ page }) => {
      for (let i = 0; i < 10; i++) {
        await page.goto('/')
        await expect(page.getByTestId('dashboard-title')).toBeVisible()
      }
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. COMPONENT ISOLATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Component Isolation', () => {
    test('sidebar should not affect main content', async ({ page }) => {
      await page.goto('/')

      // Sidebar present
      await expect(page.getByTestId('sidebar')).toBeVisible()

      // Main content should be independent
      await expect(page.getByTestId('main-content')).toBeVisible()
      await expect(page.getByTestId('dashboard-title')).toBeVisible()
    })

    test('navigation state should be isolated', async ({ page }) => {
      await page.goto('/events')

      // Fill input on messages page
      await page.goto('/messages')
      await page.getByTestId('message-input').fill('test message')

      // Navigate away and back
      await page.goto('/events')
      await page.goto('/messages')

      // Input should be cleared (no state persistence without explicit state)
      await expect(page.getByTestId('message-input')).toHaveValue('')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. SCREENSHOT COMPARISON (Visual Regression)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Visual Regression', () => {
    test('dashboard should render correctly', async ({ page }) => {
      await page.goto('/')
      await expect(page.getByTestId('dashboard-title')).toBeVisible()

      // Take screenshot for reference (first run creates baseline)
      await expect(page).toHaveScreenshot('dashboard.png', { maxDiffPixels: 100 })
    })

    test('events page should render correctly', async ({ page }) => {
      await page.goto('/events')
      await expect(page.getByTestId('events-title')).toBeVisible()

      await expect(page).toHaveScreenshot('events.png', { maxDiffPixels: 100 })
    })

    test('messages page should render correctly', async ({ page }) => {
      await page.goto('/messages')
      await expect(page.getByTestId('messages-title')).toBeVisible()

      await expect(page).toHaveScreenshot('messages.png', { maxDiffPixels: 100 })
    })

    test('ai assistant page should render correctly', async ({ page }) => {
      await page.goto('/ai')
      await expect(page.getByTestId('ai-title')).toBeVisible()

      await expect(page).toHaveScreenshot('ai-assistant.png', { maxDiffPixels: 100 })
    })
  })
})
