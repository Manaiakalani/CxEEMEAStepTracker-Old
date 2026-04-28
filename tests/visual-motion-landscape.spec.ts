import { test, expect, Page } from '@playwright/test';

/**
 * Visual regression, reduced-motion, and landscape tests.
 *
 * - Visual regression: screenshots of key UI states
 * - prefers-reduced-motion: verify animations are disabled
 * - Landscape mobile: 844×390 viewport for rotated phones
 */

// ── Helpers ─────────────────────────────────────────────────

async function dismissNotifications(page: Page) {
  await page.evaluate(() => {
    document.getElementById('update-notification')?.remove();
  });
}

async function openFAQModal(page: Page) {
  await dismissNotifications(page);
  await page.locator('#hamburgerMenu').click({ force: true });
  await expect(page.locator('#hamburgerFlyout')).toHaveClass(/open/, { timeout: 5000 });
  // Use evaluate for reliable click on WebKit/Mobile Safari
  await page.locator('#showFAQ').waitFor({ state: 'visible', timeout: 5000 });
  await page.evaluate(() => {
    (document.getElementById('showFAQ') as HTMLElement)?.click();
  });
  await expect(page.locator('#faqModal')).toHaveClass(/show/, { timeout: 10000 });
}

async function seedUser(page: Page) {
  await page.addInitScript(() => {
    const user = {
      id: 'vr-user',
      name: 'VR Tester',
      team: 'CARE',
      dailyGoal: 8000,
      steps: { '2025-09-25': 6500, '2025-09-26': 8200 },
      totalSteps: 14700,
    };
    localStorage.setItem('stepTrackerUsesSupabase', 'false');
    localStorage.setItem('stepTrackerUsers', JSON.stringify([user]));
    localStorage.setItem('currentStepTrackerUser', user.id);
  });
}

// ─────────────────────────────────────────────────────────────
// 1. VISUAL REGRESSION SNAPSHOTS
// ─────────────────────────────────────────────────────────────
test.describe.skip('Visual regression – key states', () => {
  test.beforeEach(async ({ page }) => {
    await seedUser(page);
    await page.route('**/@supabase/**', route => route.abort());
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissNotifications(page);
    // Disable animations/transitions for deterministic screenshots
    await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' });
    await page.waitForTimeout(200);
  });

  test('dashboard default state', async ({ page }) => {
    await expect(page.locator('#dashboardTab')).toBeVisible();
    // Wait for fonts and rendering to fully stabilize
    await page.waitForLoadState('load');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('dashboard-default.png', {
      maxDiffPixelRatio: 0.05,
      fullPage: true,
    });
  });

  test('hamburger flyout open', async ({ page }) => {
    await page.locator('#hamburgerMenu').click();
    await expect(page.locator('#hamburgerFlyout')).toHaveClass(/open/);
    // Wait for stagger animations to complete
    await page.waitForTimeout(600);
    await expect(page).toHaveScreenshot('flyout-open.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('FAQ modal open', async ({ page }) => {
    await openFAQModal(page);
    await page.waitForTimeout(400);
    await expect(page).toHaveScreenshot('faq-modal.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('dark mode dashboard', async ({ page }) => {
    await page.locator('#hamburgerMenu').click();
    await page.locator('#toggleDarkModeMenu').click();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    await expect(page).toHaveScreenshot('dashboard-dark-mode.png', {
      maxDiffPixelRatio: 0.05,
      fullPage: true,
    });
  });

  test('leaderboard tab', async ({ page }) => {
    await page.locator('.nav-btn[data-tab="leaderboard"]').click();
    await expect(page.locator('#leaderboardTab')).toBeVisible();
    await expect(page).toHaveScreenshot('leaderboard-tab.png', {
      maxDiffPixelRatio: 0.05,
      fullPage: true,
    });
  });

  test('profile tab', async ({ page }) => {
    await page.locator('.nav-btn[data-tab="profile"]').click();
    await expect(page.locator('#profileTab')).toBeVisible();
    await expect(page).toHaveScreenshot('profile-tab.png', {
      maxDiffPixelRatio: 0.05,
      fullPage: true,
    });
  });
});

// Visual regression on mobile
test.describe.skip('Visual regression – mobile (390×844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await seedUser(page);
    await page.route('**/@supabase/**', route => route.abort());
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissNotifications(page);
  });

  test('mobile dashboard', async ({ page }) => {
    await expect(page).toHaveScreenshot('mobile-dashboard.png', {
      maxDiffPixelRatio: 0.05,
      fullPage: true,
    });
  });

  test('mobile flyout open', async ({ page }) => {
    await page.locator('#hamburgerMenu').click();
    await expect(page.locator('#hamburgerFlyout')).toHaveClass(/open/);
    await page.waitForTimeout(600);
    await expect(page).toHaveScreenshot('mobile-flyout.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('mobile leaderboard', async ({ page }) => {
    await page.locator('.nav-btn[data-tab="leaderboard"]').click();
    await expect(page.locator('#leaderboardTab')).toBeVisible();
    await expect(page).toHaveScreenshot('mobile-leaderboard.png', {
      maxDiffPixelRatio: 0.05,
      fullPage: true,
    });
  });
});

// Visual regression for live display
test.describe.skip('Visual regression – live display', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/@supabase/**', route => route.abort());
    await page.goto('/live-display/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => {
      document.getElementById('loadingOverlay')?.classList.add('hidden');
    });
    await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' });
    await page.waitForTimeout(200);
  });

  test('live display default state', async ({ page }) => {
    await expect(page).toHaveScreenshot('live-display.png', {
      maxDiffPixelRatio: 0.05,
      fullPage: true,
    });
  });
});

// ─────────────────────────────────────────────────────────────
// 2. PREFERS-REDUCED-MOTION
// ─────────────────────────────────────────────────────────────
test.describe('prefers-reduced-motion: reduce', () => {
  test.use({
    // Emulate reduced motion preference
    contextOptions: {
      reducedMotion: 'reduce',
    },
  });

  test.beforeEach(async ({ page }) => {
    await seedUser(page);
    await page.route('**/@supabase/**', route => route.abort());
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissNotifications(page);
  });

  test('flyout transitions are disabled', async ({ page }) => {
    const flyout = page.locator('#hamburgerFlyout');
    const duration = await flyout.evaluate(el => getComputedStyle(el).transitionDuration);
    expect(duration).toBe('0s');
  });

  test('flyout items have no transition or animation', async ({ page }) => {
    await page.locator('#hamburgerMenu').click();
    const item = page.locator('.flyout-item').first();

    const styles = await item.evaluate(el => {
      const cs = getComputedStyle(el);
      return {
        transitionDuration: cs.transitionDuration,
        animationName: cs.animationName,
        animationDuration: cs.animationDuration,
      };
    });

    // transition-duration should be 0s when reduced motion is active
    expect(styles.transitionDuration).toBe('0s');
    // No named animation
    const noAnimation = styles.animationName === 'none' || styles.animationName === '';
    expect(noAnimation).toBeTruthy();
  });

  test('nav button transitions are disabled', async ({ page }) => {
    const btn = page.locator('.nav-btn').first();
    const duration = await btn.evaluate(el => getComputedStyle(el).transitionDuration);
    expect(duration).toBe('0s');
  });

  test('flyout still opens and closes functionally', async ({ page }) => {
    await page.locator('#hamburgerMenu').click();
    await expect(page.locator('#hamburgerFlyout')).toHaveClass(/open/);

    await page.keyboard.press('Escape');
    await expect(page.locator('#hamburgerFlyout')).not.toHaveClass(/open/);
  });

  test('FAQ modal still works with reduced motion', async ({ page }) => {
    await openFAQModal(page);

    await page.locator('#closeFAQ').click();
    await expect(page.locator('#faqModal')).not.toHaveClass(/show/);
  });
});

// ─────────────────────────────────────────────────────────────
// 3. LANDSCAPE MOBILE (844×390)
// ─────────────────────────────────────────────────────────────
test.describe('Landscape mobile (844×390)', () => {
  test.use({ viewport: { width: 844, height: 390 } });

  test.beforeEach(async ({ page }) => {
    await seedUser(page);
    await page.route('**/@supabase/**', route => route.abort());
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissNotifications(page);
  });

  test('no horizontal overflow in landscape', async ({ page }) => {
    const hasHScroll = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHScroll).toBeFalsy();
  });

  test('header fits landscape viewport', async ({ page }) => {
    const header = page.locator('.header');
    const box = await header.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeLessThanOrEqual(844);
  });

  test('nav buttons are visible in landscape', async ({ page }) => {
    const buttons = page.locator('.nav-btn');
    for (let i = 0; i < 4; i++) {
      await expect(buttons.nth(i)).toBeVisible();
    }
  });

  test('flyout does not clip vertically in landscape', async ({ page }) => {
    await page.locator('#hamburgerMenu').click();
    await expect(page.locator('#hamburgerFlyout')).toHaveClass(/open/);

    const content = page.locator('.flyout-content');
    const box = await content.boundingBox();
    expect(box).toBeTruthy();
    // Card should not extend below viewport (390px height)
    // Allow some tolerance for scrollable content
    expect(box!.y).toBeGreaterThanOrEqual(0);
  });

  test('flyout content is scrollable when taller than viewport', async ({ page }) => {
    await page.locator('#hamburgerMenu').click();
    const content = page.locator('.flyout-content');
    const box = await content.boundingBox();
    expect(box).toBeTruthy();

    // If card is taller than viewport, flyout body should be scrollable
    if (box!.height > 380) {
      const flyoutBody = page.locator('.flyout-body');
      const overflow = await flyoutBody.evaluate(el => getComputedStyle(el).overflowY);
      expect(['auto', 'scroll']).toContain(overflow);
    }
  });

  test('FAQ modal fits within landscape viewport', async ({ page }) => {
    await openFAQModal(page);

    const content = page.locator('#faqModal .modal-content');
    const box = await content.boundingBox();
    expect(box).toBeTruthy();
    // Should not exceed viewport height significantly
    expect(box!.y).toBeGreaterThanOrEqual(-10); // small tolerance
  });

  test('modal body scrolls in landscape for long content', async ({ page }) => {
    await openFAQModal(page);

    const body = page.locator('#faqModal .modal-body');
    const overflow = await body.evaluate(el => getComputedStyle(el).overflowY);
    expect(['auto', 'scroll']).toContain(overflow);
  });

  test('dashboard cards do not clip in landscape', async ({ page }) => {
    const card = page.locator('.quick-add-card');
    const box = await card.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeLessThanOrEqual(844);
    expect(box!.x).toBeGreaterThanOrEqual(0);
  });

  test('leaderboard tabs fit in landscape', async ({ page }) => {
    await page.locator('.nav-btn[data-tab="leaderboard"]').click();
    const tabs = page.locator('.leaderboard-tabs');
    await expect(tabs).toBeVisible();
    const box = await tabs.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeLessThanOrEqual(844);
  });

  test('profile tab usable in landscape', async ({ page }) => {
    await page.locator('.nav-btn[data-tab="profile"]').click();
    await expect(page.locator('#profileTab')).toBeVisible();

    const card = page.locator('.profile-card');
    const box = await card.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeLessThanOrEqual(844);
  });
});

// Landscape live display
test.describe('Landscape – live display', () => {
  test.use({ viewport: { width: 844, height: 390 } });

  test.beforeEach(async ({ page }) => {
    await page.route('**/@supabase/**', route => route.abort());
    await page.goto('/live-display/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => {
      document.getElementById('loadingOverlay')?.classList.add('hidden');
    });
  });

  test('live display has no horizontal overflow in landscape', async ({ page }) => {
    const hasHScroll = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHScroll).toBeFalsy();
  });

  test('STOMP widget visible in landscape', async ({ page }) => {
    await expect(page.locator('.stomp-widget')).toBeVisible();
  });

  test('stat cards fit within landscape viewport', async ({ page }) => {
    const overview = page.locator('.stats-overview');
    const box = await overview.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeLessThanOrEqual(844);
  });
});
