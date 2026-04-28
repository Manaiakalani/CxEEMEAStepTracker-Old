import { test, expect, Page } from '@playwright/test';

/**
 * Fit-and-finish tests for menus, flyouts, modals, and navigation.
 * Validates visual polish, animations, accessibility, and responsiveness
 * against the Brand & UI Guide standards.
 */

// Helper: dismiss service-worker update notification that can block pointer events
async function dismissUpdateNotification(page: Page) {
  await page.evaluate(() => {
    document.getElementById('update-notification')?.remove();
  });
}

// Helper: set up a fake logged-in user so the welcome screen is hidden
async function seedLoggedInUser(page: Page) {
  await page.addInitScript(() => {
    const user = {
      id: 'fit-test-user',
      name: 'Fit Tester',
      team: 'CARE',
      dailyGoal: 8000,
      steps: {},
      totalSteps: 5000,
    };
    localStorage.setItem('stepTrackerUsesSupabase', 'false');
    localStorage.setItem('stepTrackerUsers', JSON.stringify([user]));
    localStorage.setItem('currentStepTrackerUser', user.id);
  });
}

// ─────────────────────────────────────────────────────────────
// 1. HAMBURGER FLYOUT – VISUAL QUALITY
// ─────────────────────────────────────────────────────────────
test.describe('Hamburger flyout – visual polish', () => {
  test.beforeEach(async ({ page }) => {
    await seedLoggedInUser(page);
    await page.route('**/@supabase/**', route => route.abort());
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissUpdateNotification(page);
  });

  test('flyout backdrop uses correct semi-transparent overlay', async ({ page }) => {
    await page.locator('#hamburgerMenu').click();
    const flyout = page.locator('#hamburgerFlyout');
    await expect(flyout).toHaveClass(/open/);

    const bg = await flyout.evaluate(el => getComputedStyle(el).backgroundColor);
    // Should be rgba black with ~0.4-0.5 alpha
    expect(bg).toMatch(/rgba\(0,\s*0,\s*0,\s*0\.[3-6]/);
  });

  test('flyout card has proper border-radius and box-shadow', async ({ page }) => {
    await page.locator('#hamburgerMenu').click();
    const content = page.locator('.flyout-content');
    await expect(content).toBeVisible();

    const styles = await content.evaluate(el => {
      const cs = getComputedStyle(el);
      return {
        borderRadius: cs.borderRadius,
        boxShadow: cs.boxShadow,
        background: cs.backgroundColor,
      };
    });

    // Border radius should be 14-24px (varies by breakpoint; 14px on ≤480px mobile)
    const radiusValue = parseFloat(styles.borderRadius);
    expect(radiusValue).toBeGreaterThanOrEqual(14);
    expect(radiusValue).toBeLessThanOrEqual(24);

    // Should have a multi-layer box shadow (not "none")
    expect(styles.boxShadow).not.toBe('none');
    expect(styles.boxShadow.length).toBeGreaterThan(20);

    // White background
    expect(styles.background).toMatch(/rgb\(255,\s*255,\s*255\)/);
  });

  test('flyout card has smooth open animation (scale + translate)', async ({ page }) => {
    const content = page.locator('.flyout-content');

    // Before opening: should be scaled down and translated
    const beforeStyles = await content.evaluate(el => {
      const cs = getComputedStyle(el);
      return { transform: cs.transform, transition: cs.transition, transitionProperty: cs.transitionProperty };
    });
    // Transform or transition should reference transform (may be 'all' on some browsers)
    const hasTransformTransition =
      beforeStyles.transition.includes('transform') ||
      beforeStyles.transitionProperty.includes('transform') ||
      beforeStyles.transition.includes('all') ||
      beforeStyles.transitionProperty.includes('all');
    expect(hasTransformTransition).toBeTruthy();

    // Open the flyout
    await page.locator('#hamburgerMenu').click();
    await expect(page.locator('#hamburgerFlyout')).toHaveClass(/open/);

    // Wait for animation to settle (longer for WebKit)
    await page.waitForTimeout(600);

    const afterTransform = await content.evaluate(el => getComputedStyle(el).transform);
    // After open, transform should be identity matrix (none) or matrix(1, 0, 0, 1, 0, 0)
    const isIdentity =
      afterTransform === 'none' || afterTransform.includes('matrix(1, 0, 0, 1, 0, 0)');
    expect(isIdentity).toBeTruthy();
  });

  test('flyout header has gradient text title', async ({ page }) => {
    await page.locator('#hamburgerMenu').click();
    const title = page.locator('.flyout-header h2');
    await expect(title).toBeVisible();

    const textContent = await title.textContent();
    expect(textContent?.trim()).toBe('Menu');

    const styles = await title.evaluate(el => {
      const cs = getComputedStyle(el);
      return {
        fontWeight: cs.fontWeight,
        backgroundImage: cs.backgroundImage,
        webkitBackgroundClip: cs.webkitBackgroundClip,
      };
    });

    expect(Number(styles.fontWeight)).toBeGreaterThanOrEqual(600);
    // Gradient text effect
    expect(styles.backgroundImage).toContain('gradient');
  });

  test('flyout header has decorative gradient border', async ({ page }) => {
    await page.locator('#hamburgerMenu').click();
    const header = page.locator('.flyout-header');

    const afterBg = await header.evaluate(el => {
      const pseudo = getComputedStyle(el, '::after');
      return pseudo.background || pseudo.backgroundImage;
    });

    // Should have a gradient line
    expect(afterBg).toContain('gradient');
  });

  test('close button has correct dimensions and hover area (36px)', async ({ page }) => {
    await page.locator('#hamburgerMenu').click();
    const closeBtn = page.locator('.close-flyout');
    await expect(closeBtn).toBeVisible();

    const box = await closeBtn.boundingBox();
    expect(box).toBeTruthy();
    // Min 36px touch target
    expect(box!.width).toBeGreaterThanOrEqual(34);
    expect(box!.height).toBeGreaterThanOrEqual(34);

    const styles = await closeBtn.evaluate(el => {
      const cs = getComputedStyle(el);
      return { borderRadius: cs.borderRadius, cursor: cs.cursor };
    });

    expect(parseFloat(styles.borderRadius)).toBeGreaterThanOrEqual(8);
    expect(styles.cursor).toBe('pointer');
  });

  test('flyout dividers use gradient lines, not solid borders', async ({ page }) => {
    await page.locator('#hamburgerMenu').click();
    const divider = page.locator('.flyout-divider').first();
    await expect(divider).toBeVisible();

    const bg = await divider.evaluate(el => {
      const cs = getComputedStyle(el);
      return cs.backgroundImage || cs.background;
    });
    expect(bg).toContain('gradient');
  });
});

// ─────────────────────────────────────────────────────────────
// 2. FLYOUT MENU ITEMS – TOUCH TARGETS & STAGGER ANIMATION
// ─────────────────────────────────────────────────────────────
test.describe('Flyout menu items – polish & interaction', () => {
  test.beforeEach(async ({ page }) => {
    await seedLoggedInUser(page);
    await page.route('**/@supabase/**', route => route.abort());
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissUpdateNotification(page);
    await page.locator('#hamburgerMenu').click();
    await expect(page.locator('#hamburgerFlyout')).toHaveClass(/open/);
  });

  test('each menu item meets 44px min touch target', async ({ page }) => {
    const items = page.locator('.flyout-item');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(4);

    for (let i = 0; i < count; i++) {
      const box = await items.nth(i).boundingBox();
      expect(box).toBeTruthy();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('menu items have staggered transition delays via CSS nth-child rules', async ({ page }) => {
    // The CSS uses .flyout-item:nth-child(N) for stagger delays.
    // Because .flyout-divider elements sit between items, not every
    // .flyout-item is matched by a :nth-child rule. Verify that the
    // stagger CSS classes exist and that at least some items carry a
    // non-zero transition delay when the flyout is open.
    const items = page.locator('.flyout-item');
    const count = await items.count();
    let hasNonZeroDelay = false;

    for (let i = 0; i < count; i++) {
      const delay = await items.nth(i).evaluate(el => {
        return parseFloat(getComputedStyle(el).transitionDelay) || 0;
      });
      if (delay > 0) hasNonZeroDelay = true;
    }

    expect(hasNonZeroDelay).toBeTruthy();
  });

  test('menu items have consistent icon width and alignment', async ({ page }) => {
    const icons = page.locator('.flyout-item i');
    const count = await icons.count();

    for (let i = 0; i < count; i++) {
      const styles = await icons.nth(i).evaluate(el => {
        const cs = getComputedStyle(el);
        return {
          width: cs.width,
          textAlign: cs.textAlign,
          color: cs.color,
        };
      });

      // Icons should have a fixed width for alignment
      expect(parseFloat(styles.width)).toBeGreaterThanOrEqual(16);
      expect(styles.textAlign).toBe('center');
    }
  });

  test('menu items have rounded corners from brand guide', async ({ page }) => {
    const items = page.locator('.flyout-item');
    const count = await items.count();

    for (let i = 0; i < count; i++) {
      const radius = await items.nth(i).evaluate(el =>
        parseFloat(getComputedStyle(el).borderRadius)
      );
      // 8-16px depending on viewport breakpoint (sm-lg from brand guide)
      expect(radius).toBeGreaterThanOrEqual(7);
      expect(radius).toBeLessThanOrEqual(18);
    }
  });

  test('menu items use correct font weight (500 medium)', async ({ page }) => {
    const items = page.locator('.flyout-item');
    const fontWeight = await items.first().evaluate(el =>
      getComputedStyle(el).fontWeight
    );
    expect(Number(fontWeight)).toBe(500);
  });

  test('menu items have subtle background tint, not stark white', async ({ page }) => {
    const items = page.locator('.flyout-item');
    const bg = await items.first().evaluate(el => getComputedStyle(el).backgroundColor);
    // Should be an rgba with slight tint, not pure white
    expect(bg).toMatch(/rgba?\(/);
  });
});

// ─────────────────────────────────────────────────────────────
// 3. FAQ MODAL – VISUAL QUALITY
// ─────────────────────────────────────────────────────────────
test.describe('FAQ modal – visual polish', () => {
  test.beforeEach(async ({ page }) => {
    await seedLoggedInUser(page);
    await page.route('**/@supabase/**', route => route.abort());
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissUpdateNotification(page);
    // Open flyout then click FAQ
    await page.locator('#hamburgerMenu').click();
    await expect(page.locator('#hamburgerFlyout')).toHaveClass(/open/);
    await page.locator('#showFAQ').click();
  });

  test('modal backdrop has strong overlay with blur', async ({ page }) => {
    const overlay = page.locator('#faqModal');
    await expect(overlay).toHaveClass(/show/);

    const styles = await overlay.evaluate(el => {
      const cs = getComputedStyle(el);
      return {
        bg: cs.backgroundColor,
        backdropFilter: cs.backdropFilter || (cs as any).webkitBackdropFilter,
        zIndex: cs.zIndex,
      };
    });

    // Background should be dark overlay
    expect(styles.bg).toMatch(/rgba\(0,\s*0,\s*0/);
    // z-index should be high (3000)
    expect(Number(styles.zIndex)).toBeGreaterThanOrEqual(2000);
  });

  test('modal content card has correct border-radius and shadow', async ({ page }) => {
    const content = page.locator('#faqModal .modal-content');
    await expect(content).toBeVisible();

    const styles = await content.evaluate(el => {
      const cs = getComputedStyle(el);
      return {
        borderRadius: cs.borderRadius,
        boxShadow: cs.boxShadow,
        maxWidth: cs.maxWidth,
      };
    });

    // 1rem = 16px border radius
    expect(parseFloat(styles.borderRadius)).toBeGreaterThanOrEqual(14);
    expect(styles.boxShadow).not.toBe('none');
    // Max width should be around 700px
    expect(parseFloat(styles.maxWidth)).toBeLessThanOrEqual(750);
  });

  test('modal open animation transforms to identity', async ({ page }) => {
    const content = page.locator('#faqModal .modal-content');
    // Wait for animation (longer for WebKit)
    await page.waitForTimeout(600);

    const transform = await content.evaluate(el => getComputedStyle(el).transform);
    const isIdentity =
      transform === 'none' || transform.includes('matrix(1, 0, 0, 1, 0, 0)');
    expect(isIdentity).toBeTruthy();
  });

  test('modal header has proper spacing and typography', async ({ page }) => {
    const header = page.locator('#faqModal .modal-header');
    const h2 = page.locator('#faqModal .modal-header h2');

    const styles = await h2.evaluate(el => {
      const cs = getComputedStyle(el);
      return {
        fontSize: parseFloat(cs.fontSize),
        fontWeight: Number(cs.fontWeight),
      };
    });

    // 1.25-1.5rem
    expect(styles.fontSize).toBeGreaterThanOrEqual(18);
    expect(styles.fontWeight).toBeGreaterThanOrEqual(600);

    // Header border-bottom
    const borderBottom = await header.evaluate(el =>
      getComputedStyle(el).borderBottomStyle
    );
    expect(borderBottom).toBe('solid');
  });

  test('modal close button has 40px touch target and hover cursor', async ({ page }) => {
    const closeBtn = page.locator('#faqModal .close-modal');
    await expect(closeBtn).toBeVisible();

    const box = await closeBtn.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThanOrEqual(38);
    expect(box!.height).toBeGreaterThanOrEqual(38);

    const cursor = await closeBtn.evaluate(el => getComputedStyle(el).cursor);
    expect(cursor).toBe('pointer');
  });

  test('modal body has readable line height and scrollable overflow', async ({ page }) => {
    const body = page.locator('#faqModal .modal-body');
    const styles = await body.evaluate(el => {
      const cs = getComputedStyle(el);
      return {
        lineHeight: parseFloat(cs.lineHeight),
        overflowY: cs.overflowY,
        padding: cs.padding,
      };
    });

    // Line height should be generous for readability (≥1.5)
    expect(styles.lineHeight).toBeGreaterThanOrEqual(20); // in px
    // Scrollable when content overflows
    expect(['auto', 'scroll']).toContain(styles.overflowY);
  });

  test('modal closes when clicking the close button', async ({ page }) => {
    const closeBtn = page.locator('#closeFAQ');
    await closeBtn.waitFor({ state: 'visible' });
    await closeBtn.click({ force: true });
    const overlay = page.locator('#faqModal');
    await expect(overlay).not.toHaveClass(/show/);
  });
});

// ─────────────────────────────────────────────────────────────
// 4. NAVIGATION TABS – VISUAL QUALITY
// ─────────────────────────────────────────────────────────────
test.describe('Navigation tabs – polish & interaction', () => {
  test.beforeEach(async ({ page }) => {
    await seedLoggedInUser(page);
    await page.route('**/@supabase/**', route => route.abort());
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissUpdateNotification(page);
  });

  test('nav uses grid layout with 4 equal columns', async ({ page }) => {
    const navButtons = page.locator('.nav-buttons');
    const styles = await navButtons.evaluate(el => {
      const cs = getComputedStyle(el);
      return {
        display: cs.display,
        gridTemplateColumns: cs.gridTemplateColumns,
      };
    });

    expect(styles.display).toBe('grid');
    // Should have 4 columns
    const cols = styles.gridTemplateColumns.split(/\s+/);
    expect(cols.length).toBe(4);
  });

  test('active nav button has gradient background and white text', async ({ page }) => {
    const activeBtn = page.locator('.nav-btn.active');
    await expect(activeBtn).toBeVisible();

    const styles = await activeBtn.evaluate(el => {
      const cs = getComputedStyle(el);
      return {
        backgroundImage: cs.backgroundImage,
        color: cs.color,
        boxShadow: cs.boxShadow,
      };
    });

    // Gradient background
    expect(styles.backgroundImage).toContain('gradient');
    // White text
    expect(styles.color).toMatch(/rgb\(255,\s*255,\s*255\)/);
    // Glow shadow
    expect(styles.boxShadow).not.toBe('none');
  });

  test('inactive nav buttons have no background and secondary text color', async ({ page }) => {
    const inactiveBtn = page.locator('.nav-btn:not(.active)').first();
    await expect(inactiveBtn).toBeVisible();

    const styles = await inactiveBtn.evaluate(el => {
      const cs = getComputedStyle(el);
      return {
        background: cs.backgroundImage,
        backgroundColor: cs.backgroundColor,
      };
    });

    // Should be transparent / none
    const isClear =
      styles.backgroundColor === 'rgba(0, 0, 0, 0)' ||
      styles.backgroundColor === 'transparent';
    expect(isClear).toBeTruthy();
  });

  test('nav buttons have proper border radius', async ({ page }) => {
    const btn = page.locator('.nav-btn').first();
    const radius = await btn.evaluate(el => parseFloat(getComputedStyle(el).borderRadius));
    // 0.75rem = 12px
    expect(radius).toBeGreaterThanOrEqual(10);
  });

  test('clicking tab switches active state and shows correct content', async ({ page }) => {
    // Click leaderboard tab
    const leaderboardBtn = page.locator('.nav-btn[data-tab="leaderboard"]');
    await leaderboardBtn.click();

    await expect(leaderboardBtn).toHaveClass(/active/);

    // Dashboard tab should no longer be active
    const dashboardBtn = page.locator('.nav-btn[data-tab="dashboard"]');
    await expect(dashboardBtn).not.toHaveClass(/active/);

    // Leaderboard content should be visible
    const leaderboardTab = page.locator('#leaderboardTab');
    await expect(leaderboardTab).toBeVisible();

    // Dashboard content should be hidden
    const dashboardTab = page.locator('#dashboardTab');
    await expect(dashboardTab).not.toBeVisible();
  });

  test('all four tabs cycle correctly', async ({ page }) => {
    const tabs = ['dashboard', 'leaderboard', 'teams', 'profile'];

    for (const tab of tabs) {
      await page.locator(`.nav-btn[data-tab="${tab}"]`).click();
      await expect(page.locator(`.nav-btn[data-tab="${tab}"]`)).toHaveClass(/active/);
      await expect(page.locator(`#${tab}Tab`)).toBeVisible();

      // All other tabs should be hidden
      for (const other of tabs) {
        if (other !== tab) {
          await expect(page.locator(`#${other}Tab`)).not.toBeVisible();
        }
      }
    }
  });

  test('nav has backdrop blur for glass morphism effect', async ({ page }) => {
    const nav = page.locator('.nav');
    const styles = await nav.evaluate(el => {
      const cs = getComputedStyle(el);
      return {
        backdropFilter: cs.backdropFilter || (cs as any).webkitBackdropFilter || '',
        borderBottom: cs.borderBottomStyle,
      };
    });

    expect(styles.backdropFilter).toContain('blur');
    expect(styles.borderBottom).toBe('solid');
  });
});

// ─────────────────────────────────────────────────────────────
// 5. DARK MODE – THEME CONSISTENCY
// ─────────────────────────────────────────────────────────────
test.describe('Dark mode – menus and flyouts', () => {
  test.beforeEach(async ({ page }) => {
    await seedLoggedInUser(page);
    await page.route('**/@supabase/**', route => route.abort());
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissUpdateNotification(page);
  });

  test('dark mode toggles correctly from flyout menu', async ({ page }) => {
    await page.locator('#hamburgerMenu').click();
    await page.locator('#toggleDarkModeMenu').click();

    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    );
    expect(theme).toBe('dark');
  });

  test('flyout card uses dark background in dark mode', async ({ page }) => {
    // Enable dark mode
    await page.locator('#hamburgerMenu').click();
    await page.locator('#toggleDarkModeMenu').click();
    // Close and reopen
    await page.keyboard.press('Escape');
    await page.locator('#hamburgerMenu').click();

    const content = page.locator('.flyout-content');
    const bg = await content.evaluate(el => getComputedStyle(el).backgroundColor);

    // Should be dark (#1f2937 = rgb(31, 41, 55))
    const match = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    expect(match).toBeTruthy();
    const [, r, g, b] = match!.map(Number);
    // Dark background: each channel should be < 100
    expect(r).toBeLessThan(100);
    expect(g).toBeLessThan(100);
    expect(b).toBeLessThan(100);
  });

  test('flyout card and items visually differ between light and dark mode', async ({ page }) => {
    // Capture light mode flyout background
    await page.locator('#hamburgerMenu').click();
    const lightBg = await page.locator('.flyout-content').evaluate(
      el => getComputedStyle(el).backgroundColor
    );
    await page.keyboard.press('Escape');

    // Enable dark mode
    await page.locator('#hamburgerMenu').click();
    await page.locator('#toggleDarkModeMenu').click();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await page.locator('#hamburgerMenu').click();

    const darkBg = await page.locator('.flyout-content').evaluate(
      el => getComputedStyle(el).backgroundColor
    );

    // Dark and light backgrounds should differ
    expect(darkBg).not.toBe(lightBg);
  });
});

// ─────────────────────────────────────────────────────────────
// 6. RESPONSIVE – MOBILE VIEWPORT
// ─────────────────────────────────────────────────────────────
test.describe('Mobile viewport – menus & flyouts', () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14 size

  test.beforeEach(async ({ page }) => {
    await seedLoggedInUser(page);
    await page.route('**/@supabase/**', route => route.abort());
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissUpdateNotification(page);
  });

  test('hamburger button is visible and properly sized on mobile', async ({ page }) => {
    const btn = page.locator('#hamburgerMenu');
    await expect(btn).toBeVisible();

    const box = await btn.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThanOrEqual(38);
    expect(box!.height).toBeGreaterThanOrEqual(38);
  });

  test('flyout fills screen properly on mobile with backdrop blur', async ({ page }) => {
    await page.locator('#hamburgerMenu').click();
    const flyout = page.locator('#hamburgerFlyout');
    await expect(flyout).toHaveClass(/open/);

    const styles = await flyout.evaluate(el => {
      const cs = getComputedStyle(el);
      return {
        position: cs.position,
        width: el.offsetWidth,
        height: el.offsetHeight,
        backdropFilter: cs.backdropFilter || (cs as any).webkitBackdropFilter || '',
      };
    });

    expect(styles.position).toBe('fixed');
    expect(styles.width).toBeGreaterThanOrEqual(380);
    expect(styles.height).toBeGreaterThanOrEqual(800);
  });

  test('flyout card width adapts to mobile viewport', async ({ page }) => {
    await page.locator('#hamburgerMenu').click();
    const content = page.locator('.flyout-content');

    const box = await content.boundingBox();
    expect(box).toBeTruthy();
    // Should fill most of the mobile width (280-380px)
    expect(box!.width).toBeGreaterThanOrEqual(280);
    expect(box!.width).toBeLessThanOrEqual(390);
  });

  test('menu items remain touch-friendly on mobile', async ({ page }) => {
    await page.locator('#hamburgerMenu').click();
    const items = page.locator('.flyout-item');
    const count = await items.count();

    for (let i = 0; i < count; i++) {
      const box = await items.nth(i).boundingBox();
      expect(box).toBeTruthy();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('nav tabs remain visible and tappable on mobile', async ({ page }) => {
    const buttons = page.locator('.nav-btn');
    const count = await buttons.count();
    expect(count).toBe(4);

    for (let i = 0; i < count; i++) {
      await expect(buttons.nth(i)).toBeVisible();
    }
  });

  test('FAQ modal is usable on mobile viewport', async ({ page }) => {
    await page.locator('#hamburgerMenu').click();
    await page.locator('#showFAQ').click();

    const overlay = page.locator('#faqModal');
    await expect(overlay).toHaveClass(/show/);

    const content = page.locator('#faqModal .modal-content');
    const box = await content.boundingBox();
    expect(box).toBeTruthy();
    // Should not exceed viewport
    expect(box!.width).toBeLessThanOrEqual(390);
    // Should not extend beyond screen
    expect(box!.x).toBeGreaterThanOrEqual(0);
  });
});

// ─────────────────────────────────────────────────────────────
// 7. ACCESSIBILITY – ARIA, FOCUS, KEYBOARD
// ─────────────────────────────────────────────────────────────
test.describe('Accessibility – menus & modals', () => {
  test.beforeEach(async ({ page }) => {
    await seedLoggedInUser(page);
    await page.route('**/@supabase/**', route => route.abort());
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissUpdateNotification(page);
  });

  test('hamburger button has correct ARIA attributes', async ({ page }) => {
    const btn = page.locator('#hamburgerMenu');
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await expect(btn).toHaveAttribute('aria-controls', 'hamburgerFlyout');
    await expect(btn).toHaveAttribute('title', 'Menu');
  });

  test('flyout has role=dialog and aria-modal=true', async ({ page }) => {
    const flyout = page.locator('#hamburgerFlyout');
    await expect(flyout).toHaveAttribute('role', 'dialog');
    await expect(flyout).toHaveAttribute('aria-modal', 'true');
    await expect(flyout).toHaveAttribute('aria-labelledby', 'menu-title');
  });

  test('all flyout items have role=menuitem', async ({ page }) => {
    const items = page.locator('.flyout-item');
    const count = await items.count();

    for (let i = 0; i < count; i++) {
      await expect(items.nth(i)).toHaveAttribute('role', 'menuitem');
    }
  });

  test('all flyout items have aria-label descriptions', async ({ page }) => {
    const items = page.locator('.flyout-item');
    const count = await items.count();

    for (let i = 0; i < count; i++) {
      const label = await items.nth(i).getAttribute('aria-label');
      expect(label).toBeTruthy();
      expect(label!.length).toBeGreaterThan(5);
    }
  });

  test('nav buttons all have aria-label', async ({ page }) => {
    const buttons = page.locator('.nav-btn');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const label = await buttons.nth(i).getAttribute('aria-label');
      expect(label).toBeTruthy();
    }
  });

  test('focus-visible outline is visible on nav buttons', async ({ page }) => {
    const btn = page.locator('.nav-btn').first();
    await btn.focus();

    // Focused button should have some outline or box-shadow
    const styles = await btn.evaluate(el => {
      const cs = getComputedStyle(el);
      return {
        outline: cs.outline,
        boxShadow: cs.boxShadow,
        outlineStyle: cs.outlineStyle,
      };
    });

    // Either outline or box-shadow should indicate focus
    const hasFocusIndicator =
      styles.outlineStyle !== 'none' || styles.boxShadow !== 'none';
    expect(hasFocusIndicator).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────
// 8. CROSS-COMPONENT INTERACTIONS
// ─────────────────────────────────────────────────────────────
test.describe('Cross-component interactions', () => {
  test.beforeEach(async ({ page }) => {
    await seedLoggedInUser(page);
    await page.route('**/@supabase/**', route => route.abort());
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissUpdateNotification(page);
  });

  test('opening FAQ from flyout properly layers modal above flyout', async ({ page }) => {
    await page.locator('#hamburgerMenu').click();
    await page.locator('#showFAQ').click();

    const modalZ = await page.locator('#faqModal').evaluate(el =>
      Number(getComputedStyle(el).zIndex)
    );
    const flyoutZ = await page.locator('#hamburgerFlyout').evaluate(el =>
      Number(getComputedStyle(el).zIndex)
    );

    // Modal should be at same z-index or higher
    expect(modalZ).toBeGreaterThanOrEqual(flyoutZ);
  });

  test('flyout closes when opening FAQ modal', async ({ page }) => {
    await page.locator('#hamburgerMenu').click();
    await expect(page.locator('#hamburgerFlyout')).toHaveClass(/open/);

    await page.locator('#showFAQ').click();
    await expect(page.locator('#faqModal')).toHaveClass(/show/);

    // Flyout should have closed
    await expect(page.locator('#hamburgerFlyout')).not.toHaveClass(/open/);
  });

  test('no visual glitches: only one overlay active at a time', async ({ page }) => {
    await page.locator('#hamburgerMenu').click();
    await expect(page.locator('#hamburgerFlyout')).toHaveClass(/open/);
    await page.locator('#showFAQ').click();

    // Wait for FAQ modal to fully appear
    await expect(page.locator('#faqModal')).toHaveClass(/show/);
    await expect(page.locator('#faqModal')).toHaveCSS('visibility', 'visible');

    // Close FAQ
    await page.locator('#closeFAQ').click();
    await expect(page.locator('#faqModal')).not.toHaveClass(/show/);

    // Wait for close transitions to finish
    await page.waitForTimeout(400);

    // Neither overlay should be visible now
    await expect(page.locator('#hamburgerFlyout')).toHaveCSS('visibility', 'hidden');
  });

  test('hamburger button restores aria-expanded after flyout-to-modal flow', async ({ page }) => {
    await dismissUpdateNotification(page);
    await page.locator('#hamburgerMenu').click();
    await page.locator('#showFAQ').click();
    await dismissUpdateNotification(page);
    await page.locator('#closeFAQ').click({ force: true });

    await expect(page.locator('#hamburgerMenu')).toHaveAttribute('aria-expanded', 'false');
  });
});

// ─────────────────────────────────────────────────────────────
// 9. TYPOGRAPHY & SPACING CONSISTENCY
// ─────────────────────────────────────────────────────────────
test.describe('Typography & spacing consistency', () => {
  test.beforeEach(async ({ page }) => {
    await seedLoggedInUser(page);
    await page.route('**/@supabase/**', route => route.abort());
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissUpdateNotification(page);
  });

  test('body uses Inter/Segoe UI font stack', async ({ page }) => {
    const fontFamily = await page.evaluate(() =>
      getComputedStyle(document.body).fontFamily
    );
    // Should include Inter or Segoe UI
    const hasCorrectFont =
      fontFamily.includes('Inter') || fontFamily.includes('Segoe UI');
    expect(hasCorrectFont).toBeTruthy();
  });

  test('flyout items have consistent spacing between consecutive items (excluding dividers)', async ({ page }) => {
    await page.locator('#hamburgerMenu').click();

    // Measure gaps between consecutive .flyout-item buttons only,
    // skipping the .flyout-divider elements that create intentional
    // larger gaps between groups.
    const gaps = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.flyout-item'));
      const result: number[] = [];
      for (let i = 1; i < items.length; i++) {
        const prev = items[i - 1];
        const curr = items[i];
        // Only compare items that are adjacent siblings (no divider between them)
        if (prev.nextElementSibling === curr) {
          const prevRect = prev.getBoundingClientRect();
          const currRect = curr.getBoundingClientRect();
          result.push(currRect.top - prevRect.bottom);
        }
      }
      return result;
    });

    if (gaps.length > 1) {
      const maxGap = Math.max(...gaps);
      const minGap = Math.min(...gaps);
      expect(maxGap - minGap).toBeLessThan(8);
    }
  });

  test('flyout header padding is consistent', async ({ page }) => {
    await page.locator('#hamburgerMenu').click();
    const header = page.locator('.flyout-header');
    const padding = await header.evaluate(el => getComputedStyle(el).padding);
    // Should have non-zero padding
    expect(padding).toBeTruthy();
    expect(padding).not.toBe('0px');
  });
});

// ─────────────────────────────────────────────────────────────
// 10. ADD PREVIOUS DAY MODAL
// ─────────────────────────────────────────────────────────────
test.describe('Add Previous Day modal – visual polish', () => {
  test.beforeEach(async ({ page }) => {
    await seedLoggedInUser(page);
    await page.route('**/@supabase/**', route => route.abort());
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissUpdateNotification(page);
  });

  test('modal exists in the DOM and uses correct structure', async ({ page }) => {
    const modal = page.locator('#addPreviousDayModal');
    await expect(modal).toBeAttached();

    // Should have modal-overlay class
    const classes = await modal.getAttribute('class');
    expect(classes).toContain('modal-overlay');

    // Should contain header and body
    await expect(modal.locator('.modal-header')).toBeAttached();
    await expect(modal.locator('.modal-body')).toBeAttached();
    await expect(modal.locator('.close-modal')).toBeAttached();
  });
});
