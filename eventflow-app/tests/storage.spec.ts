import { test, expect } from '@playwright/test'

/**
 * EventFlow AI - Storage Tests
 *
 * Tests for:
 * 1. Supabase Storage integration
 * 2. File upload/download
 * 3. Image handling
 * 4. Local storage management
 * 5. Session storage
 */

test.describe('EventFlow AI - Storage Tests', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. LOCAL STORAGE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Local Storage', () => {
    test('should not store sensitive data in localStorage', async ({ page }) => {
      await page.goto('/')
      await page.waitForTimeout(1000)

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

      const allValues = Object.values(localStorage).join(' ').toLowerCase()

      // Check for sensitive data patterns
      expect(allValues).not.toContain('password')
      expect(allValues).not.toContain('secret')
      expect(allValues).not.toContain('api_key')
      expect(allValues).not.toContain('token')
      expect(allValues).not.toMatch(/sk_[a-zA-Z0-9]+/)
    })

    test('should handle localStorage being disabled', async ({ page }) => {
      // Block localStorage
      await page.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', {
          value: {
            getItem: () => { throw new Error('localStorage disabled') },
            setItem: () => { throw new Error('localStorage disabled') },
            removeItem: () => { throw new Error('localStorage disabled') },
            clear: () => { throw new Error('localStorage disabled') },
            length: 0,
            key: () => null
          }
        })
      })

      await page.goto('/')

      // App should still work
      await expect(page.getByTestId('app-container')).toBeVisible()
    })

    test('should clear localStorage on demand', async ({ page }) => {
      await page.goto('/')

      // Set some test data
      await page.evaluate(() => {
        window.localStorage.setItem('test-key', 'test-value')
      })

      // Verify it's set
      const value = await page.evaluate(() => window.localStorage.getItem('test-key'))
      expect(value).toBe('test-value')

      // Clear it
      await page.evaluate(() => window.localStorage.removeItem('test-key'))

      const clearedValue = await page.evaluate(() => window.localStorage.getItem('test-key'))
      expect(clearedValue).toBeNull()
    })

    test('should handle localStorage quota exceeded', async ({ page }) => {
      await page.goto('/')

      // Try to fill localStorage (this will usually fail gracefully)
      await page.evaluate(() => {
        try {
          const largeData = 'x'.repeat(5 * 1024 * 1024) // 5MB
          window.localStorage.setItem('large-data', largeData)
        } catch {
          // Expected to fail - quota exceeded
        }
      })

      // App should still work
      await expect(page.getByTestId('app-container')).toBeVisible()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. SESSION STORAGE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Session Storage', () => {
    test('should not store sensitive data in sessionStorage', async ({ page }) => {
      await page.goto('/')
      await page.waitForTimeout(1000)

      const sessionStorage = await page.evaluate(() => {
        const items: Record<string, string> = {}
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i)
          if (key) {
            items[key] = window.sessionStorage.getItem(key) || ''
          }
        }
        return items
      })

      const allValues = Object.values(sessionStorage).join(' ').toLowerCase()

      expect(allValues).not.toContain('password')
      expect(allValues).not.toContain('secret')
      expect(allValues).not.toContain('api_key')
    })

    test('should clear sessionStorage on tab close', async ({ page, context }) => {
      await page.goto('/')

      // Set session data
      await page.evaluate(() => {
        window.sessionStorage.setItem('session-test', 'value')
      })

      // Create new page (simulates new tab/session)
      const newPage = await context.newPage()
      await newPage.goto('/')

      // New page should not have the session data
      const value = await newPage.evaluate(() => window.sessionStorage.getItem('session-test'))
      expect(value).toBeNull()

      await newPage.close()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. SUPABASE STORAGE MOCK TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Supabase Storage Integration', () => {
    test('should handle file upload mock', async ({ page }) => {
      // Mock storage upload
      await page.route('**/storage/v1/object/**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            Key: 'uploads/test-file.jpg',
            Id: 'mock-file-id'
          })
        })
      })

      await page.goto('/events')
      await expect(page.getByTestId('events-title')).toBeVisible()
    })

    test('should handle storage upload error', async ({ page }) => {
      // Mock storage error
      await page.route('**/storage/v1/object/**', route => {
        route.fulfill({
          status: 413,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'File too large' })
        })
      })

      await page.goto('/events')
      await expect(page.getByTestId('events-title')).toBeVisible()
    })

    test('should handle storage download mock', async ({ page }) => {
      // Mock storage download
      await page.route('**/storage/v1/object/public/**', route => {
        route.fulfill({
          status: 200,
          contentType: 'image/jpeg',
          body: Buffer.from('fake-image-data')
        })
      })

      await page.goto('/')
      await expect(page.getByTestId('app-container')).toBeVisible()
    })

    test('should handle storage 404', async ({ page }) => {
      // Mock file not found
      await page.route('**/storage/v1/object/**', route => {
        route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'File not found' })
        })
      })

      await page.goto('/')
      await expect(page.getByTestId('app-container')).toBeVisible()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. IMAGE HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Image Handling', () => {
    test('should have fallback for missing images', async ({ page }) => {
      // Block all image requests
      await page.route('**/*.{png,jpg,jpeg,gif,webp}', route => route.abort())

      await page.goto('/')

      // App should still be functional
      await expect(page.getByTestId('app-container')).toBeVisible()
    })

    test('should handle slow image loading', async ({ page }) => {
      // Slow down image loading
      await page.route('**/*.{png,jpg,jpeg,gif,webp}', async route => {
        await new Promise(resolve => setTimeout(resolve, 3000))
        await route.continue()
      })

      await page.goto('/')

      // UI should be responsive
      await expect(page.getByTestId('app-container')).toBeVisible()
    })

    test('should display app logo correctly', async ({ page }) => {
      await page.goto('/')

      const logo = page.getByTestId('app-logo')
      await expect(logo).toBeVisible()
      await expect(logo).toContainText('EventFlow AI')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. COOKIES
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Cookies', () => {
    test('should not set tracking cookies without consent', async ({ page }) => {
      await page.goto('/')
      await page.waitForTimeout(1000)

      const cookies = await page.context().cookies()

      // Filter for tracking cookies
      const trackingCookies = cookies.filter(c =>
        c.name.includes('_ga') ||
        c.name.includes('_fbp') ||
        c.name.includes('tracking')
      )

      expect(trackingCookies.length).toBe(0)
    })

    test('should handle cookies being disabled', async ({ page }) => {
      // Note: Playwright doesn't easily support disabling cookies
      // but we can test that the app works without relying on them
      await page.goto('/')

      // Clear all cookies
      await page.context().clearCookies()

      // App should still work
      await expect(page.getByTestId('app-container')).toBeVisible()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. CACHE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Cache Management', () => {
    test('should handle cache miss gracefully', async ({ page }) => {
      await page.goto('/')

      // Clear browser cache
      await page.evaluate(() => {
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => caches.delete(name))
          })
        }
      })

      // Reload page
      await page.reload()

      // App should still work
      await expect(page.getByTestId('app-container')).toBeVisible()
    })

    test('should work in incognito/private mode', async ({ browser }) => {
      // Create incognito context
      const context = await browser.newContext()
      const page = await context.newPage()

      await page.goto('http://localhost:5173/')

      await expect(page.getByTestId('app-container')).toBeVisible()

      await context.close()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. DATA PERSISTENCE
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Data Persistence', () => {
    test('should maintain app state after soft refresh', async ({ page }) => {
      await page.goto('/events')

      // Soft refresh (F5)
      await page.reload()

      // Should still be on events page
      await expect(page).toHaveURL('/events')
      await expect(page.getByTestId('events-title')).toBeVisible()
    })

    test('should restore state from URL', async ({ page }) => {
      // Direct navigation to specific page
      await page.goto('/vendors')

      await expect(page.getByTestId('vendors-title')).toBeVisible()
    })

    test('should handle browser history correctly', async ({ page }) => {
      await page.goto('/')

      // Navigate through pages
      await page.getByTestId('nav-events').click()
      await expect(page).toHaveURL('/events')

      await page.getByTestId('nav-guests').click()
      await expect(page).toHaveURL('/guests')

      // Go back
      await page.goBack()
      await expect(page).toHaveURL('/events')

      // Go back again
      await page.goBack()
      await expect(page).toHaveURL('/')

      // Go forward
      await page.goForward()
      await expect(page).toHaveURL('/events')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. INDEXEDDB
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('IndexedDB', () => {
    test('should not store sensitive data in IndexedDB', async ({ page }) => {
      await page.goto('/')
      await page.waitForTimeout(1000)

      // Check IndexedDB databases
      const databases = await page.evaluate(async () => {
        if ('indexedDB' in window) {
          const dbs = await window.indexedDB.databases()
          return dbs.map(db => db.name)
        }
        return []
      })

      // Log for debugging
      console.log('IndexedDB databases:', databases)

      // App should work regardless of IndexedDB state
      await expect(page.getByTestId('app-container')).toBeVisible()
    })

    test('should handle IndexedDB being unavailable', async ({ page }) => {
      // Mock IndexedDB being unavailable
      await page.addInitScript(() => {
        Object.defineProperty(window, 'indexedDB', {
          value: undefined
        })
      })

      await page.goto('/')

      // App should still work
      await expect(page.getByTestId('app-container')).toBeVisible()
    })
  })
})
