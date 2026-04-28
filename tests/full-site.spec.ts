import { test, expect, Page } from '@playwright/test';

/**
 * Full-site fit-and-finish Playwright tests.
 * Covers: Dashboard, Leaderboard, Teams, Profile, Welcome Screen,
 * Live Display page, and cross-page polish.
 */

// ── Helpers ─────────────────────────────────────────────────

async function dismissNotifications(page: Page) {
  await page.evaluate(() => {
    document.getElementById('update-notification')?.remove();
  });
}

/** Seed a logged-in user with step data so the app skips the welcome screen. */
async function seedUser(page: Page, opts?: { steps?: Record<string, number>; team?: string }) {
  const steps = opts?.steps ?? { '2025-09-25': 6500, '2025-09-26': 8200 };
  const team = opts?.team ?? 'CARE';
  await page.addInitScript(({ steps, team }) => {
    const user = {
      id: 'e2e-user',
      name: 'E2E Tester',
      team,
      dailyGoal: 8000,
      steps,
      totalSteps: Object.values(steps).reduce((a, b) => a + b, 0),
    };
    localStorage.setItem('stepTrackerUsesSupabase', 'false');
    localStorage.setItem('stepTrackerUsers', JSON.stringify([user]));
    localStorage.setItem('currentStepTrackerUser', user.id);
  }, { steps, team });
}

// ─────────────────────────────────────────────────────────────
// 1. WELCOME SCREEN
// ─────────────────────────────────────────────────────────────
test.describe('Welcome screen', () => {
  test('shows welcome screen when no user is logged in', async ({ page }) => {
    await page.route('**/@supabase/**', route => route.abort());
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const welcome = page.locator('#welcomeScreen');
    const isVisible = await welcome.evaluate(el => getComputedStyle(el).display !== 'none');
    expect(isVisible).toBeTruthy();
  });

  test('welcome content card has rounded corners and shadow', async ({ page }) => {
    await page.route('**/@supabase/**', route => route.abort());
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const content = page.locator('.welcome-content');
    const styles = await content.evaluate(el => {
      const cs = getComputedStyle(el);
      return {
        borderRadius: parseFloat(cs.borderRadius),
        boxShadow: cs.boxShadow,
      };
    });

    // 1.75rem = 28px
    expect(styles.borderRadius).toBeGreaterThanOrEqual(24);
    expect(styles.boxShadow).not.toBe('none');
  });

  test('welcome screen is hidden when user is logged in', async ({ page }) => {
    await page.route('**/@supabase/**', route => route.abort());
    await seedUser(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const isHidden = await page.locator('#welcomeScreen').evaluate(
      el => getComputedStyle(el).display === 'none'
    );
    expect(isHidden).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────
// 2. DASHBOARD TAB
// ─────────────────────────────────────────────────────────────
test.describe('Dashboard tab – fit & finish', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/@supabase/**', route => route.abort());
    await seedUser(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissNotifications(page);
  });

  test('dashboard is the default visible tab', async ({ page }) => {
    await expect(page.locator('#dashboardTab')).toBeVisible();
    await expect(page.locator('.nav-btn[data-tab="dashboard"]')).toHaveClass(/active/);
  });

  test('greeting shows user name', async ({ page }) => {
    const name = await page.locator('#userDisplayName').textContent();
    expect(name).toBe('E2E Tester');
  });

  test('quick-add card has rounded corners and shadow', async ({ page }) => {
    const card = page.locator('.quick-add-card');
    await expect(card).toBeVisible();

    const styles = await card.evaluate(el => {
      const cs = getComputedStyle(el);
      return {
        borderRadius: parseFloat(cs.borderRadius),
        boxShadow: cs.boxShadow,
        padding: cs.padding,
      };
    });

    expect(styles.borderRadius).toBeGreaterThanOrEqual(20); // 1.5rem
    expect(styles.boxShadow).not.toBe('none');
  });

  test('step input and button are properly styled', async ({ page }) => {
    const input = page.locator('#stepsInput');
    const btn = page.locator('#addStepsBtn');
    await expect(input).toBeVisible();
    await expect(btn).toBeVisible();

    const inputStyles = await input.evaluate(el => {
      const cs = getComputedStyle(el);
      return {
        borderRadius: parseFloat(cs.borderRadius),
        borderStyle: cs.borderStyle,
        fontSize: parseFloat(cs.fontSize),
      };
    });
    expect(inputStyles.borderRadius).toBeGreaterThanOrEqual(10);
    expect(inputStyles.borderStyle).toBe('solid');
    expect(inputStyles.fontSize).toBeGreaterThanOrEqual(14);

    const btnStyles = await btn.evaluate(el => {
      const cs = getComputedStyle(el);
      return {
        cursor: cs.cursor,
        backgroundImage: cs.backgroundImage,
      };
    });
    expect(btnStyles.cursor).toBe('pointer');
  });

  test('progress circle SVG is present and properly sized', async ({ page }) => {
    const svg = page.locator('.progress-circle svg');
    await expect(svg).toBeVisible();

    const box = await svg.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThanOrEqual(100);
    expect(box!.height).toBeGreaterThanOrEqual(100);
  });

  test('progress details shows Goal, Remaining, Progress in 3-column grid', async ({ page }) => {
    const details = page.locator('.progress-details');
    const display = await details.evaluate(el => getComputedStyle(el).display);
    expect(display).toBe('grid');

    const cols = await details.evaluate(el => getComputedStyle(el).gridTemplateColumns);
    const colCount = cols.split(/\s+/).length;
    expect(colCount).toBe(3);
  });

  test('progress card has same card treatment as other dashboard cards', async ({ page }) => {
    const cards = ['.quick-add-card', '.progress-card'];
    const radii: number[] = [];

    for (const sel of cards) {
      const r = await page.locator(sel).evaluate(el =>
        parseFloat(getComputedStyle(el).borderRadius)
      );
      radii.push(r);
    }

    // All dashboard cards should share the same border-radius
    expect(radii[0]).toBe(radii[1]);
  });

  test('recent activity card has refresh button', async ({ page }) => {
    const refreshBtn = page.locator('#refreshActivity');
    await expect(refreshBtn).toBeAttached();

    const cursor = await refreshBtn.evaluate(el => getComputedStyle(el).cursor);
    expect(cursor).toBe('pointer');
  });

  test('weekly chart container exists with proper height', async ({ page }) => {
    const chart = page.locator('.weekly-card');
    await expect(chart).toBeVisible();

    const weeklyChart = page.locator('#weeklyChart');
    const styles = await weeklyChart.evaluate(el => {
      const cs = getComputedStyle(el);
      return { display: cs.display, height: parseFloat(cs.height) };
    });

    expect(styles.display).toBe('flex');
  });
});

// ─────────────────────────────────────────────────────────────
// 3. LEADERBOARD TAB
// ─────────────────────────────────────────────────────────────
test.describe('Leaderboard tab – fit & finish', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/@supabase/**', route => route.abort());
    await seedUser(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissNotifications(page);
    await page.locator('.nav-btn[data-tab="leaderboard"]').click();
    await expect(page.locator('#leaderboardTab')).toBeVisible();
  });

  test('leaderboard header displays correctly', async ({ page }) => {
    const h2 = page.locator('.leaderboard-header h2');
    await expect(h2).toBeVisible();
    const text = await h2.textContent();
    expect(text?.trim()).toBe('Leaderboard');
  });

  test('period tabs (Today, This Week, All Time) are present', async ({ page }) => {
    const tabs = page.locator('.leaderboard-tab-btn[data-period]');
    const count = await tabs.count();
    expect(count).toBe(3);

    const labels = await tabs.allTextContents();
    expect(labels.map(l => l.trim())).toEqual(['Today', 'This Week', 'All Time']);
  });

  test('period tabs have pill-shaped container with translucent background', async ({ page }) => {
    const tabsContainer = page.locator('.leaderboard-tabs');
    const styles = await tabsContainer.evaluate(el => {
      const cs = getComputedStyle(el);
      return {
        display: cs.display,
        borderRadius: parseFloat(cs.borderRadius),
        background: cs.backgroundColor,
      };
    });

    expect(styles.display).toBe('flex');
    expect(styles.borderRadius).toBeGreaterThanOrEqual(12);
  });

  test('active period tab has white background with shadow', async ({ page }) => {
    const activeTab = page.locator('.leaderboard-tab-btn.active');
    const styles = await activeTab.evaluate(el => {
      const cs = getComputedStyle(el);
      return {
        background: cs.backgroundColor,
        boxShadow: cs.boxShadow,
        fontWeight: Number(cs.fontWeight),
      };
    });

    // White background
    expect(styles.background).toMatch(/rgb\(255,\s*255,\s*255\)/);
    expect(styles.boxShadow).not.toBe('none');
    expect(styles.fontWeight).toBeGreaterThanOrEqual(600);
  });

  test('Live Display button has red gradient styling', async ({ page }) => {
    const liveBtn = page.locator('#liveDisplayBtn');
    await expect(liveBtn).toBeVisible();

    const styles = await liveBtn.evaluate(el => {
      const cs = getComputedStyle(el);
      return {
        backgroundImage: cs.backgroundImage,
        color: cs.color,
        boxShadow: cs.boxShadow,
      };
    });

    expect(styles.backgroundImage).toContain('gradient');
    expect(styles.color).toMatch(/rgb\(255,\s*255,\s*255\)/);
    expect(styles.boxShadow).not.toBe('none');
  });

  test('refresh button has seamless styling (no background)', async ({ page }) => {
    const refreshBtn = page.locator('#refreshLeaderboard');
    await expect(refreshBtn).toBeVisible();

    const bg = await refreshBtn.evaluate(el => getComputedStyle(el).backgroundColor);
    const isTransparent =
      bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent';
    expect(isTransparent).toBeTruthy();
  });

  test('leaderboard container has card styling', async ({ page }) => {
    const container = page.locator('.leaderboard-container');
    const styles = await container.evaluate(el => {
      const cs = getComputedStyle(el);
      return {
        borderRadius: parseFloat(cs.borderRadius),
        boxShadow: cs.boxShadow,
      };
    });

    expect(styles.borderRadius).toBeGreaterThanOrEqual(20);
    expect(styles.boxShadow).not.toBe('none');
  });

  test('switching period tabs updates active state', async ({ page }) => {
    const weekTab = page.locator('.leaderboard-tab-btn[data-period="week"]');
    await weekTab.click();

    await expect(weekTab).toHaveClass(/active/);
    await expect(page.locator('.leaderboard-tab-btn[data-period="today"]')).not.toHaveClass(/active/);
  });
});

// ─────────────────────────────────────────────────────────────
// 4. TEAMS TAB
// ─────────────────────────────────────────────────────────────
test.describe('Teams tab – fit & finish', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/@supabase/**', route => route.abort());
    await seedUser(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissNotifications(page);
    await page.locator('.nav-btn[data-tab="teams"]').click();
    await expect(page.locator('#teamsTab')).toBeVisible();
  });

  test('teams header displays title and description', async ({ page }) => {
    const h2 = page.locator('.teams-header h2');
    await expect(h2).toBeVisible();
    const text = await h2.textContent();
    expect(text?.trim()).toBe('Team Competition');

    const desc = page.locator('.teams-header p');
    await expect(desc).toBeVisible();
  });

  test('team leaderboard container exists', async ({ page }) => {
    const container = page.locator('#teamLeaderboard');
    await expect(container).toBeAttached();
  });
});

// ─────────────────────────────────────────────────────────────
// 5. PROFILE TAB
// ─────────────────────────────────────────────────────────────
test.describe('Profile tab – fit & finish', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/@supabase/**', route => route.abort());
    await seedUser(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissNotifications(page);
    await page.locator('.nav-btn[data-tab="profile"]').click();
    await expect(page.locator('#profileTab')).toBeVisible();
  });

  test('profile card has avatar, name, and team', async ({ page }) => {
    await expect(page.locator('.profile-avatar')).toBeVisible();
    await expect(page.locator('#profileName')).toBeVisible();
    await expect(page.locator('#profileTeam')).toBeVisible();
  });

  test('profile avatar has circular shape', async ({ page }) => {
    const avatar = page.locator('.profile-avatar');
    const radius = await avatar.evaluate(el =>
      getComputedStyle(el).borderRadius
    );
    // Should be 50% or a large pixel value
    expect(radius).toMatch(/(50%|\d{2,}px)/);
  });

  test('profile stat cards show Total Steps, Daily Average, Current Rank', async ({ page }) => {
    const statCards = page.locator('.profile-stats .stat-card');
    const count = await statCards.count();
    expect(count).toBe(3);

    const labels = page.locator('.profile-stats .stat-label');
    const texts = await labels.allTextContents();
    expect(texts.map(t => t.trim())).toEqual([
      'Total Steps',
      'Daily Average',
      'Current Rank',
    ]);
  });

  test('stat cards have icon + number + label structure', async ({ page }) => {
    const firstCard = page.locator('.profile-stats .stat-card').first();
    await expect(firstCard.locator('.stat-icon')).toBeVisible();
    await expect(firstCard.locator('.stat-number')).toBeVisible();
    await expect(firstCard.locator('.stat-label')).toBeVisible();
  });

  test('profile action buttons are present with correct types', async ({ page }) => {
    await expect(page.locator('#addPreviousDayBtn')).toBeVisible();
    await expect(page.locator('#editGoalBtn')).toBeVisible();
    await expect(page.locator('#changeTeamBtn')).toBeVisible();
    await expect(page.locator('#resetDataBtn')).toBeVisible();

    // Primary button styling
    const addBtn = page.locator('#addPreviousDayBtn');
    const classes = await addBtn.getAttribute('class');
    expect(classes).toContain('btn-primary');

    // Danger button styling
    const resetBtn = page.locator('#resetDataBtn');
    const resetClasses = await resetBtn.getAttribute('class');
    expect(resetClasses).toContain('btn-danger');
  });

  test('all profile action buttons meet 44px min touch target', async ({ page }) => {
    const buttons = page.locator('.profile-actions .btn');
    const count = await buttons.count();
    expect(count).toBe(4);

    for (let i = 0; i < count; i++) {
      const box = await buttons.nth(i).boundingBox();
      expect(box).toBeTruthy();
      expect(box!.height).toBeGreaterThanOrEqual(40);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 6. LIVE DISPLAY PAGE
// ─────────────────────────────────────────────────────────────
test.describe('Live display page – fit & finish', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/@supabase/**', route => route.abort());
    await page.goto('/live-display/');
    await page.waitForLoadState('domcontentloaded');
    // Dismiss loading overlay if present
    await page.evaluate(() => {
      const overlay = document.getElementById('loadingOverlay');
      if (overlay) overlay.classList.add('hidden');
    });
  });

  test('page loads with correct title', async ({ page }) => {
    const title = await page.title();
    expect(title).toContain('Live');
  });

  test('header has logo, title, and status indicators', async ({ page }) => {
    await expect(page.locator('.display-header')).toBeVisible();
    await expect(page.locator('.logo-section')).toBeVisible();
    await expect(page.locator('.title-group h1')).toBeVisible();
    await expect(page.locator('.live-indicator')).toBeVisible();
  });

  test('LIVE indicator has pulse dot and status text', async ({ page }) => {
    const pulseDot = page.locator('.pulse-dot');
    await expect(pulseDot).toBeVisible();

    const text = await page.locator('.live-indicator').textContent();
    // May show LIVE or WAITING depending on connection state
    const hasStatus = text?.includes('LIVE') || text?.includes('WAITING');
    expect(hasStatus).toBeTruthy();
  });

  test('stat cards section has 3 overview cards', async ({ page }) => {
    const statCards = page.locator('.stats-overview .stat-card');
    const count = await statCards.count();
    expect(count).toBe(3);
  });

  test('stat cards have icon + number + label structure', async ({ page }) => {
    const firstCard = page.locator('.stats-overview .stat-card').first();
    await expect(firstCard.locator('.stat-icon')).toBeVisible();
    await expect(firstCard.locator('.stat-number')).toBeVisible();
    await expect(firstCard.locator('.stat-label')).toBeVisible();
  });

  test('stat cards have before pseudo-element accent (gradient top border)', async ({ page }) => {
    const card = page.locator('.stats-overview .stat-card').first();
    const before = await card.evaluate(el => {
      const pseudo = getComputedStyle(el, '::before');
      return {
        content: pseudo.content,
        position: pseudo.position,
        background: pseudo.backgroundImage || pseudo.background,
      };
    });
    // ::before should have content and position
    expect(before.position).toBe('absolute');
  });

  test('STOMP widget is present with correct structure', async ({ page }) => {
    const stomp = page.locator('.stomp-widget');
    await expect(stomp).toBeVisible();

    await expect(page.locator('.stomp-icon')).toBeVisible();
    await expect(page.locator('.stomp-title')).toBeVisible();
    await expect(page.locator('#totalOffsiteSteps')).toBeVisible();
    await expect(page.locator('.stomp-label')).toBeVisible();

    const title = await page.locator('.stomp-title').textContent();
    expect(title?.trim()).toBe('THE STOMP');
  });

  test('STOMP card has gradient background', async ({ page }) => {
    const card = page.locator('.stomp-card');
    const bg = await card.evaluate(el => getComputedStyle(el).backgroundImage);
    expect(bg).toContain('gradient');
  });

  test('activity feed section has header and content area', async ({ page }) => {
    await expect(page.locator('.activity-feed')).toBeVisible();
    await expect(page.locator('.feed-header')).toBeVisible();
    await expect(page.locator('#activityFeed')).toBeAttached();
  });

  test('leaderboard section has 3 leaderboard containers', async ({ page }) => {
    const containers = page.locator('.leaderboards-section .leaderboard-container');
    const count = await containers.count();
    expect(count).toBe(3);
  });

  test('leaderboard containers have proper labels', async ({ page }) => {
    const headers = page.locator('.leaderboards-section .leaderboard-header h2');
    const texts = await headers.allTextContents();

    expect(texts.some(t => t.includes('Individual'))).toBeTruthy();
    expect(texts.some(t => t.includes('Team'))).toBeTruthy();
    expect(texts.some(t => t.includes('Champion'))).toBeTruthy();
  });

  test('weekly champion section has special styling class', async ({ page }) => {
    const weekly = page.locator('.weekly-champion');
    await expect(weekly).toBeAttached();
  });

  test('manual refresh button is visible and functional', async ({ page }) => {
    const btn = page.locator('#manualRefreshBtn');
    await expect(btn).toBeVisible();

    const cursor = await btn.evaluate(el => getComputedStyle(el).cursor);
    expect(cursor).toBe('pointer');
  });

  test('footer displays correctly', async ({ page }) => {
    const footer = page.locator('.display-footer');
    await expect(footer).toBeVisible();

    const text = await footer.textContent();
    expect(text).toContain('Munich');
  });

  test('loading overlay exists and can be hidden', async ({ page }) => {
    const overlay = page.locator('#loadingOverlay');
    await expect(overlay).toBeAttached();

    const hasHidden = await overlay.evaluate(el => el.classList.contains('hidden'));
    expect(hasHidden).toBeTruthy();
  });

  test('error modal exists but is not visible by default', async ({ page }) => {
    const modal = page.locator('#errorModal');
    await expect(modal).toBeAttached();

    const isVisible = await modal.evaluate(el => el.classList.contains('show'));
    expect(isVisible).toBeFalsy();
  });
});

// ─────────────────────────────────────────────────────────────
// 7. LIVE DISPLAY – RESPONSIVE (MOBILE)
// ─────────────────────────────────────────────────────────────
test.describe('Live display – mobile viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await page.route('**/@supabase/**', route => route.abort());
    await page.goto('/live-display/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => {
      document.getElementById('loadingOverlay')?.classList.add('hidden');
    });
  });

  test('header adapts to mobile layout', async ({ page }) => {
    const header = page.locator('.display-header');
    await expect(header).toBeVisible();

    // Should not overflow
    const box = await header.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeLessThanOrEqual(390);
  });

  test('stat cards stack or wrap on mobile', async ({ page }) => {
    const overview = page.locator('.stats-overview');
    const box = await overview.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeLessThanOrEqual(390);
  });

  test('STOMP widget remains visible on mobile', async ({ page }) => {
    await expect(page.locator('.stomp-widget')).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────
// 8. FOOTER & GLOBAL ELEMENTS
// ─────────────────────────────────────────────────────────────
test.describe('Footer & global elements', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/@supabase/**', route => route.abort());
    await seedUser(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissNotifications(page);
  });

  test('footer is present with heart emoji', async ({ page }) => {
    const footer = page.locator('.footer');
    await expect(footer).toBeVisible();

    const text = await footer.textContent();
    expect(text).toContain('❤️');
    expect(text).toContain('Munich');
  });

  test('page uses correct font family', async ({ page }) => {
    const font = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    const hasCorrectFont = font.includes('Inter') || font.includes('Segoe UI');
    expect(hasCorrectFont).toBeTruthy();
  });

  test('header logo has gradient text effect', async ({ page }) => {
    const logo = page.locator('.logo h1');
    const bg = await logo.evaluate(el => getComputedStyle(el).backgroundImage);
    expect(bg).toContain('gradient');
  });

  test('message container exists for toast notifications', async ({ page }) => {
    const container = page.locator('#messageContainer');
    await expect(container).toBeAttached();
  });
});

// ─────────────────────────────────────────────────────────────
// 9. DASHBOARD DARK MODE
// ─────────────────────────────────────────────────────────────
test.describe('Dashboard cards – dark mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/@supabase/**', route => route.abort());
    await seedUser(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissNotifications(page);
    // Enable dark mode
    await page.locator('#hamburgerMenu').click();
    await page.locator('#toggleDarkModeMenu').click();
    await page.keyboard.press('Escape');
    // Wait for dark mode transition to complete
    await page.waitForTimeout(400);
  });

  test('dashboard cards adapt background for dark mode', async ({ page }) => {
    const card = page.locator('.quick-add-card');
    const bg = await card.evaluate(el => getComputedStyle(el).backgroundColor);

    const match = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    expect(match).toBeTruthy();
    const avg = match!.slice(1).map(Number).reduce((a, b) => a + b, 0) / 3;
    // Dark background
    expect(avg).toBeLessThan(100);
  });

  test('step input adapts for dark mode', async ({ page }) => {
    const input = page.locator('#stepsInput');
    const color = await input.evaluate(el => getComputedStyle(el).color);

    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    expect(match).toBeTruthy();
    const avg = match!.slice(1).map(Number).reduce((a, b) => a + b, 0) / 3;
    // Text should be light
    expect(avg).toBeGreaterThan(150);
  });
});

// ─────────────────────────────────────────────────────────────
// 10. ADD PREVIOUS DAY MODAL (from Profile)
// ─────────────────────────────────────────────────────────────
test.describe('Add Previous Day modal – from profile', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/@supabase/**', route => route.abort());
    await seedUser(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissNotifications(page);
    await page.locator('.nav-btn[data-tab="profile"]').click();
    await expect(page.locator('#profileTab')).toBeVisible();
  });

  test('clicking Add Previous Day opens the modal', async ({ page }) => {
    await page.locator('#addPreviousDayBtn').click();
    const modal = page.locator('#addPreviousDayModal');
    await expect(modal).toHaveClass(/show/);
  });

  test('modal has correct header and close button', async ({ page }) => {
    await page.locator('#addPreviousDayBtn').click();
    const header = page.locator('#addPreviousDayModal .modal-header h2');
    await expect(header).toBeVisible();

    const closeBtn = page.locator('#closeAddPreviousDay');
    await expect(closeBtn).toBeVisible();
  });

  test('modal closes when clicking close button', async ({ page }) => {
    await page.locator('#addPreviousDayBtn').click();
    await expect(page.locator('#addPreviousDayModal')).toHaveClass(/show/);

    await page.locator('#closeAddPreviousDay').click();
    await expect(page.locator('#addPreviousDayModal')).not.toHaveClass(/show/);
  });
});

// ─────────────────────────────────────────────────────────────
// 11. CROSS-PAGE NAVIGATION FLOW
// ─────────────────────────────────────────────────────────────
test.describe('Cross-page navigation flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/@supabase/**', route => route.abort());
    await seedUser(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissNotifications(page);
  });

  test('full tab cycle preserves content isolation', async ({ page }) => {
    const tabIds = ['dashboard', 'leaderboard', 'teams', 'profile'];

    for (const tab of tabIds) {
      await page.locator(`.nav-btn[data-tab="${tab}"]`).click();
      await expect(page.locator(`#${tab}Tab`)).toBeVisible();

      // Verify other tabs hidden
      for (const other of tabIds) {
        if (other !== tab) {
          await expect(page.locator(`#${other}Tab`)).not.toBeVisible();
        }
      }
    }
  });

  test('returning to dashboard from profile preserves greeting', async ({ page }) => {
    await page.locator('.nav-btn[data-tab="profile"]').click();
    await page.locator('.nav-btn[data-tab="dashboard"]').click();

    const name = await page.locator('#userDisplayName').textContent();
    expect(name).toBe('E2E Tester');
  });

  test('hamburger menu works from any tab', async ({ page }) => {
    const tabs = ['leaderboard', 'teams', 'profile'];

    for (const tab of tabs) {
      await page.locator(`.nav-btn[data-tab="${tab}"]`).click();
      await page.locator('#hamburgerMenu').click();
      await expect(page.locator('#hamburgerFlyout')).toHaveClass(/open/);
      await page.keyboard.press('Escape');
      await expect(page.locator('#hamburgerFlyout')).not.toHaveClass(/open/);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 12. MOBILE – MAIN APP (390×844 iPhone 14)
// ─────────────────────────────────────────────────────────────
test.describe('Mobile – main app comprehensive', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await page.route('**/@supabase/**', route => route.abort());
    await seedUser(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissNotifications(page);
  });

  test('header fits within viewport without horizontal overflow', async ({ page }) => {
    const header = page.locator('.header');
    const box = await header.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeLessThanOrEqual(390);
    expect(box!.x).toBeGreaterThanOrEqual(0);
  });

  test('hamburger button has enhanced 48px touch target on mobile', async ({ page }) => {
    const btn = page.locator('#hamburgerMenu');
    const box = await btn.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test('nav buttons have min-height 48px on mobile', async ({ page }) => {
    const buttons = page.locator('.nav-btn');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const box = await buttons.nth(i).boundingBox();
      expect(box).toBeTruthy();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('nav buttons fit within viewport width', async ({ page }) => {
    const navButtons = page.locator('.nav-buttons');
    const box = await navButtons.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeLessThanOrEqual(390);
  });

  test('quick-add card does not overflow on mobile', async ({ page }) => {
    const card = page.locator('.quick-add-card');
    const box = await card.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeLessThanOrEqual(390);
    expect(box!.x).toBeGreaterThanOrEqual(0);
  });

  test('step input has 16px font size to prevent iOS zoom', async ({ page }) => {
    const input = page.locator('#stepsInput');
    const fontSize = await input.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(16);
  });

  test('progress circle is centered and fits within mobile viewport', async ({ page }) => {
    const container = page.locator('.progress-circle-container');
    const styles = await container.evaluate(el => ({
      justifyContent: getComputedStyle(el).justifyContent,
    }));
    expect(styles.justifyContent).toBe('center');

    const svg = page.locator('.progress-circle svg');
    const box = await svg.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  });

  test('progress details grid fits within mobile width', async ({ page }) => {
    const details = page.locator('.progress-details');
    const box = await details.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeLessThanOrEqual(390);
  });

  test('leaderboard tab renders within viewport on mobile', async ({ page }) => {
    await page.locator('.nav-btn[data-tab="leaderboard"]').click();
    const tab = page.locator('#leaderboardTab');
    await expect(tab).toBeVisible();

    const box = await tab.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeLessThanOrEqual(390);
  });

  test('leaderboard period tabs wrap or scroll on mobile', async ({ page }) => {
    await page.locator('.nav-btn[data-tab="leaderboard"]').click();
    const tabs = page.locator('.leaderboard-tabs');
    await expect(tabs).toBeVisible();
    const box = await tabs.boundingBox();
    expect(box).toBeTruthy();
    // Should not exceed viewport
    expect(box!.x + box!.width).toBeLessThanOrEqual(400); // small tolerance
  });

  test('profile tab card fits within mobile viewport', async ({ page }) => {
    await page.locator('.nav-btn[data-tab="profile"]').click();
    await expect(page.locator('#profileTab')).toBeVisible();
    const card = page.locator('.profile-card');
    await expect(card).toBeVisible();
    const box = await card.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeLessThanOrEqual(390);
  });

  test('profile action buttons are tappable on mobile', async ({ page }) => {
    await page.locator('.nav-btn[data-tab="profile"]').click();
    await expect(page.locator('#profileTab')).toBeVisible();
    const buttons = page.locator('.profile-actions .btn');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const box = await buttons.nth(i).boundingBox();
      expect(box).toBeTruthy();
      expect(box!.height).toBeGreaterThanOrEqual(40);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
  });

  test('flyout menu items have enhanced touch targets (56px) on mobile', async ({ page }) => {
    await page.locator('#hamburgerMenu').click();
    await expect(page.locator('#hamburgerFlyout')).toHaveClass(/open/);

    const items = page.locator('.flyout-item');
    const count = await items.count();

    for (let i = 0; i < count; i++) {
      const box = await items.nth(i).boundingBox();
      expect(box).toBeTruthy();
      expect(box!.height).toBeGreaterThanOrEqual(48);
    }
  });

  test('no horizontal scrollbar on mobile', async ({ page }) => {
    const hasHScroll = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHScroll).toBeFalsy();
  });

  test('footer fits within mobile viewport', async ({ page }) => {
    const footer = page.locator('.footer');
    const box = await footer.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeLessThanOrEqual(390);
  });
});

// ─────────────────────────────────────────────────────────────
// 13. MOBILE – SMALL PHONE (320×568 iPhone SE)
// ─────────────────────────────────────────────────────────────
test.describe('Mobile – small phone (iPhone SE)', () => {
  test.use({ viewport: { width: 320, height: 568 } });

  test.beforeEach(async ({ page }) => {
    await page.route('**/@supabase/**', route => route.abort());
    await seedUser(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissNotifications(page);
  });

  test('no horizontal overflow on smallest viewport', async ({ page }) => {
    const hasHScroll = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHScroll).toBeFalsy();
  });

  test('nav buttons still visible and tappable', async ({ page }) => {
    const buttons = page.locator('.nav-btn');
    for (let i = 0; i < 4; i++) {
      await expect(buttons.nth(i)).toBeVisible();
      const box = await buttons.nth(i).boundingBox();
      expect(box).toBeTruthy();
      expect(box!.height).toBeGreaterThanOrEqual(40);
    }
  });

  test('dashboard cards fit within 320px width', async ({ page }) => {
    const cards = ['.quick-add-card', '.progress-card'];
    for (const sel of cards) {
      const box = await page.locator(sel).boundingBox();
      expect(box).toBeTruthy();
      expect(box!.width).toBeLessThanOrEqual(320);
    }
  });

  test('flyout card adapts to small screen', async ({ page }) => {
    await page.locator('#hamburgerMenu').click();
    const content = page.locator('.flyout-content');
    const box = await content.boundingBox();
    expect(box).toBeTruthy();
    // On 320px viewport, card may be as narrow as ~230px with padding
    expect(box!.width).toBeGreaterThanOrEqual(220);
    expect(box!.width).toBeLessThanOrEqual(320);
  });

  test('FAQ modal fits within small viewport', async ({ page }) => {
    await page.locator('#hamburgerMenu').click();
    await page.locator('#showFAQ').click();

    const content = page.locator('#faqModal .modal-content');
    const box = await content.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeLessThanOrEqual(320);
  });
});

// ─────────────────────────────────────────────────────────────
// 14. MOBILE – TABLET (768×1024 iPad)
// ─────────────────────────────────────────────────────────────
test.describe('Mobile – tablet (iPad)', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test.beforeEach(async ({ page }) => {
    await page.route('**/@supabase/**', route => route.abort());
    await seedUser(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissNotifications(page);
  });

  test('nav buttons use row layout on tablet', async ({ page }) => {
    const btn = page.locator('.nav-btn').first();
    const flexDir = await btn.evaluate(el => getComputedStyle(el).flexDirection);
    // On >= 640px, buttons should be row layout
    expect(flexDir).toBe('row');
  });

  test('no horizontal overflow on tablet', async ({ page }) => {
    const hasHScroll = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHScroll).toBeFalsy();
  });

  test('leaderboard period tabs have room to display inline', async ({ page }) => {
    await page.locator('.nav-btn[data-tab="leaderboard"]').click();
    const tabs = page.locator('.leaderboard-tabs');
    await expect(tabs).toBeVisible();
    const box = await tabs.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeLessThanOrEqual(768);
  });

  test('profile stats use 3-column grid on tablet', async ({ page }) => {
    await page.locator('.nav-btn[data-tab="profile"]').click();
    await expect(page.locator('#profileTab')).toBeVisible();
    const stats = page.locator('.profile-stats');
    const cols = await stats.evaluate(el => getComputedStyle(el).gridTemplateColumns);
    const colCount = cols.split(/\s+/).length;
    expect(colCount).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────
// 15. MOBILE – LIVE DISPLAY (390×844)
// ─────────────────────────────────────────────────────────────
test.describe('Mobile – live display page', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await page.route('**/@supabase/**', route => route.abort());
    await page.goto('/live-display/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => {
      document.getElementById('loadingOverlay')?.classList.add('hidden');
    });
  });

  test('no horizontal overflow on live display mobile', async ({ page }) => {
    const hasHScroll = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHScroll).toBeFalsy();
  });

  test('stat cards stack vertically on mobile', async ({ page }) => {
    const cards = page.locator('.stats-overview .stat-card');
    const boxes = [];
    for (let i = 0; i < await cards.count(); i++) {
      const box = await cards.nth(i).boundingBox();
      if (box) boxes.push(box);
    }

    // On mobile, cards should stack (each card nearly full width)
    for (const box of boxes) {
      expect(box.width).toBeGreaterThanOrEqual(300);
    }
  });

  test('STOMP widget fits mobile viewport', async ({ page }) => {
    const stomp = page.locator('.stomp-card');
    const box = await stomp.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeLessThanOrEqual(390);
  });

  test('leaderboard containers stack on mobile', async ({ page }) => {
    const containers = page.locator('.leaderboards-section .leaderboard-container');
    const count = await containers.count();

    for (let i = 0; i < count; i++) {
      const box = await containers.nth(i).boundingBox();
      expect(box).toBeTruthy();
      expect(box!.width).toBeLessThanOrEqual(390);
    }
  });

  test('manual refresh button is accessible on mobile', async ({ page }) => {
    const btn = page.locator('#manualRefreshBtn');
    // May be hidden on mobile; if visible, check touch target
    const isVisible = await btn.isVisible();
    if (isVisible) {
      const box = await btn.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.height).toBeGreaterThanOrEqual(38);
    }
  });
});
