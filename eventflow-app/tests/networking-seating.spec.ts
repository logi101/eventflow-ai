import { test, expect } from '@playwright/test'

test.describe('Networking & Seating Flow', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Login
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@eventflow.ai')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/event/dashboard')
  })

  test('should allow manager to assign tracks and generate seating', async ({ page }) => {
    // 2. Go to Guests page
    await page.click('text=אורחים')
    await expect(page).toHaveURL('/event/guests')

    // 3. Select a participant and assign track (Bulk)
    const firstGuestCheckbox = page.locator('input[type="checkbox"]').first()
    await firstGuestCheckbox.check()
    
    // Find track button in bulk bar
    await page.click('text=הקצה למסלול')
    await page.click('button:has-text("טכנולוגיה")') // Assuming this track exists in seed
    
    // 4. Go to Networking page
    await page.goto('/event/networking')
    await expect(page.locator('h1')).toContainText('נטוורקינג והושבה חכמה')

    // 5. Generate AI Seating
    const generateBtn = page.getByRole('button', { name: /יצירת שיבוץ חכם/ })
    await expect(generateBtn).toBeVisible()
    await generateBtn.click()

    // 6. Verify tables appear
    await expect(page.locator('text=שולחן 1')).toBeVisible()
    
    // 7. Test Drag and Drop (Visual check)
    const draggable = page.locator('[class*="cursor-grab"]').first()
    const targetTable = page.locator('text=שולחן 2')
    
    // Simple drag and drop simulation
    await draggable.hover()
    await page.mouse.down()
    await targetTable.hover()
    await page.mouse.up()

    // 8. Verify save toast or persistent state (optional check)
    // await expect(page.locator('text=שיבוץ נשמר')).toBeVisible()
  })

  test('should display room grid correctly', async ({ page }) => {
    // 9. Navigate to Event Detail -> Rooms Tab
    // Using direct URL for speed
    const eventId = await page.evaluate(() => localStorage.getItem('selectedEventId'))
    if (eventId) {
      await page.goto(`/events/${eventId}`)
      await page.click('text=חדרים ולינה')
      
      // 10. Verify Grid exists
      await expect(page.locator('.react-grid-layout')).toBeVisible()
      await expect(page.locator('text=מפת חדרים ולינה')).toBeVisible()
    }
  })
})
