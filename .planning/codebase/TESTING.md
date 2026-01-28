# Testing Patterns

**Analysis Date:** 2026-01-28

## Test Framework

**Runner:**
- Playwright v1.57.0
- Config: `playwright.config.ts`

**Run Commands:**
```bash
npm run test                # Run all Playwright tests
npm run test:ui            # Run tests with UI mode
npm run test:report        # Show HTML test report
```

**Configuration (playwright.config.ts):**
- Test directory: `./tests`
- Fully parallel execution enabled
- Retries: 0 in dev, 2 in CI
- Workers: Unlimited in dev, 1 in CI
- Reporter: HTML
- Browser: Chromium only
- Base URL: `http://localhost:5173`
- Web server: `npm run dev` (auto-started)
- Screenshots: Only on failure
- Traces: On first retry

## Test File Organization

**Location:**
- Co-located in `/tests` directory (separate from source)
- Not co-located with components

**Naming:**
- Pattern: `[feature-name].spec.ts`
- Examples: `full-app.spec.ts`, `integration.spec.ts`, `floating-chat.spec.ts`, `program-builder.spec.ts`

**Structure:**
```
tests/
├── full-app.spec.ts                    # Comprehensive QA tests
├── integration.spec.ts                 # Integration tests
├── advanced-qa.spec.ts                 # Advanced QA tests
├── edge-functions.spec.ts              # Backend edge function tests
├── program-builder.spec.ts             # Program builder specific tests
├── floating-chat.spec.ts               # Floating chat component tests
├── e2e-user-flows.spec.ts              # End-to-end user workflows
├── backend-database.spec.ts            # Database tests
├── storage.spec.ts                     # Storage tests
└── [feature].spec.ts-snapshots/        # Visual snapshots
    ├── dashboard-chromium-darwin.png
    └── ...
```

## Test Structure

**Suite Organization:**

```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  // Setup hooks
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test.describe('Sub-Feature', () => {
    test('should do something specific', async ({ page }) => {
      // Arrange
      // Act
      // Assert
    })

    test('should handle edge case', async ({ page }) => {
      // Test code
    })
  })
})
```

**Patterns:**

From `full-app.spec.ts`:

1. **Navigation Tests:**
```typescript
test('should navigate to Events page', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('nav-events').click()
  await expect(page).toHaveURL('/events')
  await expect(page.getByTestId('events-title')).toBeVisible()
})
```

2. **Content Verification:**
```typescript
test('should display dashboard title in Hebrew', async ({ page }) => {
  await expect(page.getByTestId('dashboard-title')).toContainText('לוח בקרה')
})
```

3. **State Tests:**
```typescript
test('should show zero counts initially', async ({ page }) => {
  await expect(page.getByTestId('events-card')).toContainText('0')
  await expect(page.getByTestId('guests-card')).toContainText('0')
  await expect(page.getByTestId('tasks-card')).toContainText('0')
})
```

4. **Accessibility Tests:**
```typescript
test('all buttons should be keyboard accessible', async ({ page }) => {
  const btn = page.getByTestId('create-event-btn')
  await btn.focus()
  await expect(btn).toBeFocused()
})
```

5. **Performance Tests:**
```typescript
test('page should load within 3 seconds', async ({ page }) => {
  const startTime = Date.now()
  await page.goto('/')
  await expect(page.getByTestId('dashboard-title')).toBeVisible()
  const loadTime = Date.now() - startTime
  expect(loadTime).toBeLessThan(3000)
})
```

## Mocking

**Framework:** Playwright's built-in route mocking via `page.route()`

**Patterns:**

From `integration.spec.ts`:

1. **Network Error Simulation:**
```typescript
test('should handle network errors gracefully', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('app-container')).toBeVisible()

  // Simulate network failure
  await page.route('**/*supabase*', (route) => {
    route.abort('failed')
  })

  // App should still render
  await page.click('[data-testid="nav-events"]')
  await expect(page.getByTestId('app-container')).toBeVisible()
})
```

2. **Slow Connection Simulation:**
```typescript
test('should display app even with slow connection', async ({ page }) => {
  await page.route('**/*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 100))
    await route.continue()
  })

  await page.goto('/')
  await expect(page.getByTestId('app-container')).toBeVisible()
})
```

3. **Console Message Monitoring:**
```typescript
test('should have Supabase URL configured', async ({ page }) => {
  const consoleMessages: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleMessages.push(msg.text())
    }
  })

  await page.goto('/')
  await page.waitForTimeout(1000)

  const supabaseErrors = consoleMessages.filter(
    (msg) => msg.includes('supabase') || msg.includes('VITE_SUPABASE')
  )
  expect(supabaseErrors.length).toBe(0)
})
```

**What to Mock:**
- Network failures (route.abort())
- Slow connections (route delays)
- Specific API endpoints (route.continue() with modifications)
- External service responses

**What NOT to Mock:**
- Actual component rendering (test real behavior)
- App container and navigation (test real routing)
- Playwright's automatic page reload handling

## Test Data

**Fixtures:**
- Not using explicit fixtures (test.beforeEach used instead)
- Setup in `test.beforeEach()` hooks

**Pattern:**
```typescript
test.describe('Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/')
    // Additional setup if needed
  })

  test('specific test', async ({ page }) => {
    // Test code using setup
  })
})
```

**Test Data Location:**
- No separate fixture files found
- Data setup happens inline in tests
- Use realistic data from application

## Coverage

**Requirements:** Not enforced (no coverage config found)

**View Coverage:**
- No built-in coverage command
- HTML report available via `npm run test:report`

## Test Types

**E2E Tests (Primary):**
- Full application testing via Playwright
- Tests real browser interaction
- Tests real navigation, DOM queries, form fills
- Scope: Complete user workflows
- Example: `full-app.spec.ts` - Tests navigation, pages, RTL, responsive design, accessibility, performance

**Integration Tests:**
- Focus on system interactions (e.g., Supabase connection)
- Test error handling across components
- Test state persistence
- Location: `integration.spec.ts`
- Examples:
  - Supabase connection validation
  - Error handling with network failures
  - Local storage persistence
  - State management across page loads

**Advanced QA Tests:**
- Tests specific features in detail
- Visual regression via snapshots
- Complex user interactions
- Location: `advanced-qa.spec.ts`
- Takes snapshots of: Dashboard, Events page, Messages, AI Assistant

**Unit Tests:**
- Not used in this codebase
- No Jest/Vitest configuration
- All testing done at E2E level

## Common Patterns

**Testing Navigation:**
```typescript
test('should navigate to Events page', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('nav-events').click()
  await expect(page).toHaveURL('/events')
  await expect(page.getByTestId('events-title')).toBeVisible()
})
```

**Testing Content (RTL):**
```typescript
test('should have RTL direction', async ({ page }) => {
  await page.goto('/')
  const container = page.getByTestId('app-container')
  await expect(container).toHaveAttribute('dir', 'rtl')
})

test('should display in Hebrew', async ({ page }) => {
  await expect(page.getByTestId('title')).toContainText('עוזר AI')
})
```

**Testing Form Input:**
```typescript
test('recipient input should accept text', async ({ page }) => {
  const input = page.getByTestId('recipient-input')
  await input.fill('0501234567')
  await expect(input).toHaveValue('0501234567')
})
```

**Testing Buttons:**
```typescript
test('send button should be clickable', async ({ page }) => {
  const btn = page.getByTestId('send-message-btn')
  await expect(btn).toBeEnabled()
})
```

**Testing Responsive Design:**
```typescript
test('should display correctly on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/')
  await expect(page.getByTestId('app-container')).toBeVisible()
})
```

**Testing Error States:**
```typescript
test('should show empty state message', async ({ page }) => {
  await page.goto('/events')
  await expect(page.getByTestId('events-list')).toContainText('אין אירועים עדיין')
})
```

## Data Attributes for Testing

**Convention:**
- Components use `data-testid` attributes for selectors
- Pattern: kebab-case IDs
- Examples: `app-container`, `sidebar`, `nav-events`, `events-title`, `create-event-btn`

**Usage in Tests:**
```typescript
await page.getByTestId('nav-events').click()          // Click
await expect(page.getByTestId('events-title')).toBeVisible()  // Visibility
await page.getByTestId('input').fill('text')          // Fill input
await expect(page.getByTestId('btn')).toBeEnabled()   // Button state
```

## CI/CD Configuration

**CI Setup (playwright.config.ts):**
```typescript
forbidOnly: !!process.env.CI           // Fail if test.only() left in code
retries: process.env.CI ? 2 : 0        // Retry failed tests 2x in CI
workers: process.env.CI ? 1 : undefined // Serial execution in CI
```

**Environment Detection:**
- Detects `process.env.CI` to adjust behavior
- Useful for GitHub Actions or other CI systems

## Test Coverage Areas

**Coverage in full-app.spec.ts:**
1. App Structure (container, sidebar, logo, content area, RTL)
2. Navigation (all nav links, page transitions)
3. Dashboard (title, cards, counters)
4. Events Page (title, create button, list, empty state)
5. Guests Page (title, add button, list, empty state)
6. Vendors Page (title, add button, list, empty state)
7. Checklist Page (title, add button, list, empty state)
8. Messages Page (title, panel, inputs, send button, text input)
9. AI Assistant (title, chat container, history, input, send button)
10. Responsive Design (desktop, tablet, mobile viewports)
11. Accessibility (keyboard navigation, focus)
12. Performance (load time < 3s, nav < 500ms)

**Coverage Gaps:**
- No tests for form submissions with actual data
- No tests for data mutations (create, update, delete)
- No tests for authentication flows (login, signup)
- No tests for real Supabase interactions
- No unit tests for utilities or helpers
- No tests for error message handling

## Running Tests

**Development:**
```bash
npm run test              # Run once
npm run test:ui          # Interactive UI mode
npm run test:report      # View previous results
```

**Watch Mode:**
- Not configured (would require Playwright CLI with `--watch`)

**Parallel Execution:**
- Enabled by default (`fullyParallel: true`)
- Sharded in CI (would require additional config)

---

*Testing analysis: 2026-01-28*
