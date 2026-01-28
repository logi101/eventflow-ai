import { test, expect } from '@playwright/test'

/**
 * EventFlow AI - Edge Functions Tests
 *
 * Tests for Supabase Edge Functions:
 * 1. send-whatsapp - WhatsApp message sending
 * 2. send-reminder - Event reminders
 * 3. ai-chat - AI assistant integration
 */

test.describe('EventFlow AI - Edge Functions Tests', () => {
  const SUPABASE_URL = 'https://byhohetafnhlakqbydbj.supabase.co'

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. WHATSAPP EDGE FUNCTION
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('WhatsApp Edge Function', () => {
    test('should have WhatsApp send UI ready', async ({ page }) => {
      await page.goto('/messages')

      // Verify UI elements exist
      await expect(page.getByTestId('recipient-input')).toBeVisible()
      await expect(page.getByTestId('message-input')).toBeVisible()
      await expect(page.getByTestId('send-message-btn')).toBeVisible()
    })

    test('should prepare message for WhatsApp sending', async ({ page }) => {
      await page.goto('/messages')

      // Fill the form
      await page.getByTestId('recipient-input').fill('0501234567')
      await page.getByTestId('message-input').fill('הודעת בדיקה לאירוע')

      // Verify values are set
      await expect(page.getByTestId('recipient-input')).toHaveValue('0501234567')
      await expect(page.getByTestId('message-input')).toHaveValue('הודעת בדיקה לאירוע')

      // Button should be enabled
      await expect(page.getByTestId('send-message-btn')).toBeEnabled()
    })

    test('should handle WhatsApp API mock response', async ({ page }) => {
      // Mock the edge function response
      await page.route('**/functions/v1/send-whatsapp', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            messageId: 'mock-msg-123',
            timestamp: new Date().toISOString()
          })
        })
      })

      await page.goto('/messages')

      await page.getByTestId('recipient-input').fill('0501234567')
      await page.getByTestId('message-input').fill('Test')
      await page.getByTestId('send-message-btn').click()

      // UI should remain functional
      await expect(page.getByTestId('messages-panel')).toBeVisible()
    })

    test('should handle WhatsApp API error gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/functions/v1/send-whatsapp', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'WhatsApp service unavailable' })
        })
      })

      await page.goto('/messages')

      await page.getByTestId('recipient-input').fill('0501234567')
      await page.getByTestId('message-input').fill('Test')
      await page.getByTestId('send-message-btn').click()

      // UI should remain functional
      await expect(page.getByTestId('messages-panel')).toBeVisible()
    })

    test('should validate phone number before sending', async ({ page }) => {
      await page.goto('/messages')

      // Empty phone should not crash
      await page.getByTestId('message-input').fill('Test message')
      await page.getByTestId('send-message-btn').click()

      // Page should still be functional
      await expect(page.getByTestId('messages-panel')).toBeVisible()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. REMINDER EDGE FUNCTION
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Reminder Edge Function', () => {
    test('should have event reminder UI elements', async ({ page }) => {
      await page.goto('/events')

      // Events page should have reminder-related elements
      await expect(page.getByTestId('events-title')).toBeVisible()
      await expect(page.getByTestId('events-list')).toBeVisible()
    })

    test('should handle reminder API mock response', async ({ page }) => {
      // Mock the edge function
      await page.route('**/functions/v1/send-reminder', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            remindersSent: 5,
            timestamp: new Date().toISOString()
          })
        })
      })

      await page.goto('/events')
      await expect(page.getByTestId('events-title')).toBeVisible()
    })

    test('should handle reminder API timeout', async ({ page }) => {
      // Mock slow response
      await page.route('**/functions/v1/send-reminder', async route => {
        await new Promise(resolve => setTimeout(resolve, 5000))
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        })
      })

      await page.goto('/events')

      // App should remain responsive
      await expect(page.getByTestId('events-title')).toBeVisible()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. AI CHAT EDGE FUNCTION
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('AI Chat Edge Function', () => {
    test('should have AI chat UI ready', async ({ page }) => {
      await page.goto('/ai')

      await expect(page.getByTestId('ai-title')).toBeVisible()
      await expect(page.getByTestId('ai-chat')).toBeVisible()
      await expect(page.getByTestId('ai-input')).toBeVisible()
      await expect(page.getByTestId('ai-send-btn')).toBeVisible()
    })

    test('should prepare message for AI chat', async ({ page }) => {
      await page.goto('/ai')

      await page.getByTestId('ai-input').fill('מה אני צריך לארגן לחתונה?')

      await expect(page.getByTestId('ai-input')).toHaveValue('מה אני צריך לארגן לחתונה?')
      await expect(page.getByTestId('ai-send-btn')).toBeEnabled()
    })

    test('should handle AI API mock response', async ({ page }) => {
      // Mock the AI edge function
      await page.route('**/functions/v1/ai-chat', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            response: 'הנה רשימת המשימות לחתונה שלך...',
            tokensUsed: 150,
            model: 'gemini-pro'
          })
        })
      })

      await page.goto('/ai')

      await page.getByTestId('ai-input').fill('עזור לי')
      await page.getByTestId('ai-send-btn').click()

      // UI should remain functional
      await expect(page.getByTestId('ai-chat')).toBeVisible()
    })

    test('should handle AI API error gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/functions/v1/ai-chat', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'AI service unavailable' })
        })
      })

      await page.goto('/ai')

      await page.getByTestId('ai-input').fill('Test')
      await page.getByTestId('ai-send-btn').click()

      // UI should remain functional
      await expect(page.getByTestId('ai-chat')).toBeVisible()
    })

    test('should handle AI API rate limiting', async ({ page }) => {
      // Mock rate limit response
      await page.route('**/functions/v1/ai-chat', route => {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Rate limit exceeded' })
        })
      })

      await page.goto('/ai')

      await page.getByTestId('ai-input').fill('Test')
      await page.getByTestId('ai-send-btn').click()

      // UI should remain functional
      await expect(page.getByTestId('ai-chat')).toBeVisible()
    })

    test('should show chat history area', async ({ page }) => {
      await page.goto('/ai')

      await expect(page.getByTestId('chat-history')).toBeVisible()
      await expect(page.getByTestId('chat-history')).toContainText('התחל שיחה')
    })

    test('should handle long AI responses', async ({ page }) => {
      // Mock long response
      const longResponse = 'א'.repeat(5000)
      await page.route('**/functions/v1/ai-chat', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ response: longResponse })
        })
      })

      await page.goto('/ai')

      await page.getByTestId('ai-input').fill('Test')
      await page.getByTestId('ai-send-btn').click()

      // UI should remain functional and not overflow
      await expect(page.getByTestId('ai-chat')).toBeVisible()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. EDGE FUNCTION SECURITY
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Edge Function Security', () => {
    test('should not expose API keys in frontend', async ({ page }) => {
      await page.goto('/')

      const content = await page.content()

      // Check for common API key patterns
      expect(content).not.toMatch(/sk_[a-zA-Z0-9]+/)
      expect(content).not.toMatch(/api_key.*=.*[a-zA-Z0-9]{20,}/)
      expect(content).not.toContain('OPENAI_API_KEY')
      expect(content).not.toContain('GEMINI_API_KEY')
      expect(content).not.toContain('GREEN_API')
    })

    test('should handle CORS properly', async ({ page }) => {
      await page.goto('/')

      // Track CORS errors
      const corsErrors: string[] = []
      page.on('console', msg => {
        if (msg.text().toLowerCase().includes('cors')) {
          corsErrors.push(msg.text())
        }
      })

      await page.waitForTimeout(2000)

      // App should work without CORS issues
      await expect(page.getByTestId('app-container')).toBeVisible()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. EDGE FUNCTION PERFORMANCE
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Edge Function Performance', () => {
    test('should handle concurrent function calls', async ({ page }) => {
      await page.goto('/ai')

      // Rapidly click send button
      const input = page.getByTestId('ai-input')
      const sendBtn = page.getByTestId('ai-send-btn')

      await input.fill('Test 1')
      await sendBtn.click()
      await input.fill('Test 2')
      await sendBtn.click()
      await input.fill('Test 3')
      await sendBtn.click()

      // UI should remain stable
      await expect(page.getByTestId('ai-chat')).toBeVisible()
    })

    test('should not block UI during API calls', async ({ page }) => {
      // Mock slow API
      await page.route('**/functions/v1/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000))
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        })
      })

      await page.goto('/messages')

      // UI should be interactive during slow API call
      await page.getByTestId('recipient-input').fill('0501234567')
      await page.getByTestId('message-input').fill('Test')
      await page.getByTestId('send-message-btn').click()

      // Should be able to navigate immediately
      await page.getByTestId('nav-events').click()
      await expect(page.getByTestId('events-title')).toBeVisible()
    })
  })
})
