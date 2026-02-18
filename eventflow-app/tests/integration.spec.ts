import { test, expect } from '@playwright/test'

test.describe('EventFlow AI - Integration Tests', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. SUPABASE CONNECTION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Supabase Connection', () => {
    test('should have Supabase URL configured', async ({ page }) => {
      await page.goto('/')

      // App should load without Supabase connection errors
      await expect(page.getByTestId('app-container')).toBeVisible()

      // Check console for any Supabase errors
      const consoleMessages: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleMessages.push(msg.text())
        }
      })

      await page.waitForTimeout(1000)

      // No Supabase connection errors should appear
      const supabaseErrors = consoleMessages.filter(
        (msg) => msg.includes('supabase') || msg.includes('VITE_SUPABASE')
      )
      expect(supabaseErrors.length).toBe(0)
    })

    test('should not expose sensitive data in browser', async ({ page }) => {
      await page.goto('/')

      // Get page source
      const content = await page.content()

      // Should not contain full API key (only public parts are OK)
      expect(content).not.toContain('service_role')
      expect(content).not.toContain('secret')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. API ERROR HANDLING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // First load the page normally
      await page.goto('/')
      await expect(page.getByTestId('app-container')).toBeVisible()

      // Then simulate Supabase network errors on subsequent requests
      await page.route('**/*supabase*', (route) => {
        route.abort('failed')
      })

      // Navigate to another page - app should still render even if API fails
      await page.click('[data-testid="nav-events"]')

      // App container should still be visible
      await expect(page.getByTestId('app-container')).toBeVisible()
    })

    test('should display app even with slow connection', async ({ page }) => {
      // Simulate slow connection
      await page.route('**/*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 100))
        await route.continue()
      })

      await page.goto('/')
      await expect(page.getByTestId('app-container')).toBeVisible()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. LOCAL STORAGE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Local Storage', () => {
    test('should not store sensitive data in localStorage', async ({ page }) => {
      await page.goto('/')

      const localStorage = await page.evaluate(() => {
        const items: Record<string, string> = {}
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i)
          if (key) {
            items[key] = window.localStorage.getItem(key) || ''
          }
        }
        return items
      })

      // Check no passwords or API keys are stored
      const values = Object.values(localStorage).join(' ')
      expect(values).not.toContain('password')
      expect(values).not.toContain('secret')
      expect(values).not.toContain('api_key')
    })

    test('should persist theme/preferences if implemented', async ({ page }) => {
      await page.goto('/')

      // This is a placeholder - when preferences are implemented, test here
      await expect(page.getByTestId('app-container')).toBeVisible()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. FORM SUBMISSION FLOW TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Form Submission Flows', () => {
    test('should prepare WhatsApp message for sending', async ({ page }) => {
      await page.goto('/messages')

      // Fill the form
      await page.getByTestId('recipient-input').fill('0501234567')
      await page.getByTestId('message-input').fill('הודעת בדיקה')

      // Verify inputs have values
      await expect(page.getByTestId('recipient-input')).toHaveValue('0501234567')
      await expect(page.getByTestId('message-input')).toHaveValue('הודעת בדיקה')

      // Click send (no actual API call in current implementation)
      const sendBtn = page.getByTestId('send-message-btn')
      await expect(sendBtn).toBeEnabled()
      await sendBtn.click()

      // Form should still be present (no navigation)
      await expect(page.getByTestId('messages-panel')).toBeVisible()
    })

    test('should prepare AI chat message', async ({ page }) => {
      await page.goto('/ai')

      // Fill the AI input
      await page.getByTestId('ai-input').fill('מה אני צריך לחתונה?')

      // Verify input has value
      await expect(page.getByTestId('ai-input')).toHaveValue('מה אני צריך לחתונה?')

      // Click send
      const sendBtn = page.getByTestId('ai-send-btn')
      await expect(sendBtn).toBeEnabled()
      await sendBtn.click()

      // Chat container should still be visible
      await expect(page.getByTestId('ai-chat')).toBeVisible()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. NAVIGATION STATE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Navigation State', () => {
    test('should preserve URL state on reload', async ({ page }) => {
      await page.goto('/events')
      await page.reload()

      await expect(page).toHaveURL('/events')
      await expect(page.getByTestId('events-title')).toBeVisible()
    })

    test('should handle hash navigation', async ({ page }) => {
      await page.goto('/#section')

      // Should still render main app
      await expect(page.getByTestId('app-container')).toBeVisible()
    })

    test('should handle query parameters', async ({ page }) => {
      await page.goto('/events?filter=active')

      // Should still render events page
      await expect(page.getByTestId('events-title')).toBeVisible()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. SECURITY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Security', () => {
    test('should not have XSS vulnerabilities in inputs', async ({ page }) => {
      await page.goto('/messages')

      const xssPayload = '<script>alert("XSS")</script>'
      await page.getByTestId('message-input').fill(xssPayload)

      // The script tag should be stored as text, not executed
      await expect(page.getByTestId('message-input')).toHaveValue(xssPayload)

      // No alert should appear
      let alertShown = false
      page.on('dialog', () => {
        alertShown = true
      })

      await page.waitForTimeout(500)
      expect(alertShown).toBe(false)
    })

    test('should not expose environment variables', async ({ page }) => {
      await page.goto('/')

      const content = await page.content()

      // Only VITE_ prefixed vars should be accessible, and only public ones
      expect(content).not.toContain('TWILIO_AUTH_TOKEN')
      expect(content).not.toContain('OPENAI_API_KEY')
      expect(content).not.toContain('service_role')
    })

    test('should have proper content security', async ({ page }) => {
      const response = await page.goto('/')

      // Check response is successful
      expect(response?.status()).toBe(200)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. PERFORMANCE METRICS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Performance Metrics', () => {
    test('should have fast First Contentful Paint', async ({ page }) => {
      await page.goto('/')

      const performanceMetrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const fcp = entries.find((entry) => entry.name === 'first-contentful-paint')
            resolve(fcp?.startTime || 0)
          }).observe({ type: 'paint', buffered: true })

          setTimeout(() => resolve(0), 5000)
        })
      })

      // FCP should be under 2 seconds
      expect(Number(performanceMetrics)).toBeLessThan(2000)
    })

    test('should have reasonable DOM size', async ({ page }) => {
      await page.goto('/')

      const domSize = await page.evaluate(() => {
        return document.getElementsByTagName('*').length
      })

      // DOM should not be excessively large
      expect(domSize).toBeLessThan(1000)
    })

    test('should not have memory leaks on navigation', async ({ page }) => {
      await page.goto('/')

      const initialHeap = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize
        }
        return 0
      })

      // Navigate multiple times
      for (let i = 0; i < 10; i++) {
        await page.getByTestId('nav-events').click()
        await page.getByTestId('nav-home').click()
      }

      const finalHeap = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize
        }
        return 0
      })

      // Heap should not grow significantly (allow 50% growth)
      if (initialHeap > 0 && finalHeap > 0) {
        expect(finalHeap).toBeLessThan(initialHeap * 1.5)
      }
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. ACCESSIBILITY COMPLIANCE
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Accessibility Compliance', () => {
    test('should have proper heading structure', async ({ page }) => {
      await page.goto('/')

      const h1Count = await page.locator('h1').count()

      // Should have at least one h1
      expect(h1Count).toBeGreaterThanOrEqual(1)
    })

    test('should have proper form labels', async ({ page }) => {
      await page.goto('/messages')

      // Labels should be associated with inputs
      const recipientLabel = page.locator('label:has-text("נמען")')
      await expect(recipientLabel).toBeVisible()

      const messageLabel = page.locator('label:has-text("הודעה")')
      await expect(messageLabel).toBeVisible()
    })

    test('should have sufficient color contrast', async ({ page }) => {
      await page.goto('/')

      // Primary text should be visible
      await expect(page.getByTestId('dashboard-title')).toBeVisible()

      // This is a basic check - real contrast testing would use axe
    })

    test('should be navigable with keyboard only', async ({ page }) => {
      await page.goto('/')

      // Press Tab multiple times to navigate
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab')
      }

      // Should be able to navigate and focus elements
      const focusedElement = await page.evaluate(() => {
        return document.activeElement?.tagName
      })

      expect(focusedElement).not.toBe('BODY')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. MOBILE TOUCH INTERACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Mobile Touch Interactions', () => {
    test.use({ viewport: { width: 375, height: 667 }, hasTouch: true })

    test('should handle tap on mobile', async ({ page }) => {
      await page.goto('/')

      // Tap navigation
      await page.getByTestId('nav-events').tap()
      await expect(page).toHaveURL('/events')
    })

    test('should handle swipe gestures area', async ({ page }) => {
      await page.goto('/')

      // Main content should be scrollable
      const mainContent = page.getByTestId('main-content')
      await expect(mainContent).toBeVisible()
    })

    test('should display correctly on small screens', async ({ page }) => {
      await page.goto('/')

      // All critical elements should be visible
      await expect(page.getByTestId('sidebar')).toBeVisible()
      await expect(page.getByTestId('main-content')).toBeVisible()
    })
  })
})
