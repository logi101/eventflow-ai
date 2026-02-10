import { test, expect } from '@playwright/test';

test.describe('Networking Page Console Check', () => {

  test('inject fake supabase session and navigate to networking page', async ({ page }) => {
    const allConsoleMessages: { phase: string; type: string; text: string }[] = [];
    const allNetworkErrors: { phase: string; url: string; status: number; method: string; body?: string }[] = [];
    let currentPhase = 'init';

    // Collect console messages
    page.on('console', (msg) => {
      allConsoleMessages.push({
        phase: currentPhase,
        type: msg.type(),
        text: msg.text(),
      });
    });

    // Collect page errors
    page.on('pageerror', (error) => {
      allConsoleMessages.push({
        phase: currentPhase,
        type: 'pageerror',
        text: error.message + (error.stack ? '\n' + error.stack.substring(0, 500) : ''),
      });
    });

    // Collect network errors with response body for 400s
    page.on('response', async (response) => {
      if (response.status() >= 400) {
        let body = '';
        try {
          body = await response.text();
        } catch {
          body = '(could not read body)';
        }
        allNetworkErrors.push({
          phase: currentPhase,
          url: response.url(),
          status: response.status(),
          method: response.request().method(),
          body: body.substring(0, 500),
        });
      }
    });

    // ═══ PHASE 1: Inject fake Supabase auth session ═══
    currentPhase = 'session-inject';
    console.log('=== PHASE 1: Inject fake Supabase session into localStorage ===');

    // The Supabase JS client stores session in localStorage with key:
    // sb-<project-ref>-auth-token
    const projectRef = 'byhohetafnhlakqbydbj';
    const storageKey = 'sb-' + projectRef + '-auth-token';

    // Create a minimal fake session
    const fakeSession = {
      access_token: 'fake-access-token-for-testing',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: 'fake-refresh-token',
      user: {
        id: '00000000-0000-0000-0000-000000000001',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'ew5933070@gmail.com',
        email_confirmed_at: '2026-01-01T00:00:00Z',
        phone: '',
        confirmation_sent_at: null,
        confirmed_at: '2026-01-01T00:00:00Z',
        last_sign_in_at: new Date().toISOString(),
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: {},
        identities: [],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: new Date().toISOString(),
      },
    };

    // Inject via addInitScript so it's set before React hydrates
    await page.addInitScript((args: { key: string; session: any }) => {
      localStorage.setItem(args.key, JSON.stringify(args.session));
      // Also set isMasterAdmin bypass
      (window as any).isMasterAdmin = () => true;
    }, { key: storageKey, session: fakeSession });

    // ═══ PHASE 2: Navigate to homepage ═══
    currentPhase = 'homepage';
    console.log('\n=== PHASE 2: Navigate to homepage ===');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);

    const homepageUrl = page.url();
    console.log('Homepage URL: ' + homepageUrl);
    await page.screenshot({ path: 'tests/screenshots/01-homepage.png', fullPage: true });

    const loggedIn = !homepageUrl.includes('/login');
    console.log('Bypassed login: ' + loggedIn);

    // ═══ PHASE 3: Navigate to networking page ═══
    currentPhase = 'networking';
    console.log('\n=== PHASE 3: Navigate to /event/networking ===');
    await page.goto('http://localhost:5173/event/networking', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(5000);

    const networkingUrl = page.url();
    console.log('Networking page URL: ' + networkingUrl);
    await page.screenshot({ path: 'tests/screenshots/02-networking-page.png', fullPage: true });

    // Get page content
    const bodyText = await page.locator('body').innerText().catch(() => 'Could not get body text');
    console.log('Page text (first 800 chars):\n' + bodyText.substring(0, 800));

    // Wait for delayed requests
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'tests/screenshots/03-networking-settled.png', fullPage: true });

    // ═══ FULL REPORT ═══
    console.log('\n\n' + '='.repeat(60));
    console.log('FULL CONSOLE & NETWORK REPORT');
    console.log('='.repeat(60));

    for (const phase of ['session-inject', 'homepage', 'networking']) {
      const phaseMessages = allConsoleMessages.filter(m => m.phase === phase);
      const phaseErrors = allNetworkErrors.filter(e => e.phase === phase);

      console.log('\n--- Phase: ' + phase.toUpperCase() + ' ---');

      const errors = phaseMessages.filter(m => m.type === 'error' || m.type === 'pageerror');
      if (errors.length > 0) {
        console.log('  CONSOLE ERRORS (' + errors.length + '):');
        errors.forEach(e => console.log('    [' + e.type.toUpperCase() + '] ' + e.text.substring(0, 400)));
      }

      const warnings = phaseMessages.filter(m => m.type === 'warning');
      if (warnings.length > 0) {
        console.log('  WARNINGS (' + warnings.length + '):');
        warnings.forEach(w => console.log('    [WARNING] ' + w.text.substring(0, 400)));
      }

      if (phaseErrors.length > 0) {
        console.log('  NETWORK ERRORS (' + phaseErrors.length + '):');
        phaseErrors.forEach(e => {
          console.log('    [' + e.status + ' ' + e.method + '] ' + e.url);
          if (e.body) console.log('      Response: ' + e.body.substring(0, 300));
        });
      }

      if (errors.length === 0 && warnings.length === 0 && phaseErrors.length === 0) {
        console.log('  (no errors or warnings)');
      }
    }

    // Summary
    const totalErrors = allConsoleMessages.filter(m => m.type === 'error' || m.type === 'pageerror');
    const totalWarnings = allConsoleMessages.filter(m => m.type === 'warning');
    const total400 = allNetworkErrors.filter(e => e.status === 400);

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log('Final URL: ' + page.url());
    console.log('Auth bypass successful: ' + loggedIn);
    console.log('Reached networking page: ' + networkingUrl.includes('/networking'));
    console.log('Total console errors: ' + totalErrors.length);
    console.log('Total console warnings: ' + totalWarnings.length);
    console.log('Total network errors (4xx/5xx): ' + allNetworkErrors.length);
    console.log('Total 400 Bad Request: ' + total400.length);

    // List ALL messages
    console.log('\n--- ALL CONSOLE MESSAGES (' + allConsoleMessages.length + ') ---');
    allConsoleMessages.forEach(m => {
      console.log('[' + m.phase + '] [' + m.type.toUpperCase() + '] ' + m.text.substring(0, 300));
    });

    console.log('\n--- ALL NETWORK ERRORS (' + allNetworkErrors.length + ') ---');
    allNetworkErrors.forEach(e => {
      console.log('[' + e.phase + '] [' + e.status + ' ' + e.method + '] ' + e.url);
      if (e.body) console.log('  Body: ' + e.body.substring(0, 300));
    });

    console.log('\n' + '='.repeat(60));
  });
});
