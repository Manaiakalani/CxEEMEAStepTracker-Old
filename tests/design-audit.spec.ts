import { test, Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Design audit — captures screenshots of all 4 surfaces in
 *   desktop (1440x900) light + dark
 *   mobile  (390x844)  light + dark
 * and scrolls the admin dashboard to anchor captures for each section
 * (Overview, User Management, Rankings, Developer Tools, Full-Page).
 *
 * No assertions — pure screenshot capture for visual review.
 */

const OUT = path.join(__dirname, '..', 'design-review-screenshots');
fs.mkdirSync(OUT, { recursive: true });

type Viewport = { w: number; h: number; tag: 'desktop' | 'mobile' };
const VIEWPORTS: Viewport[] = [
  { w: 1440, h: 900, tag: 'desktop' },
  { w: 390, h: 844, tag: 'mobile' },
];
const THEMES = ['light', 'dark'] as const;

async function seedUser(page: Page) {
  await page.addInitScript(() => {
    const user = {
      id: 'audit-user',
      name: 'Audit Tester',
      team: 'CARE',
      dailyGoal: 8000,
      steps: { [new Date().toISOString().slice(0, 10)]: 6543 },
      totalSteps: 42321,
    };
    localStorage.setItem('stepTrackerUsesSupabase', 'false');
    localStorage.setItem('stepTrackerUsers', JSON.stringify([user]));
    localStorage.setItem('currentStepTrackerUser', user.id);
  });
}

async function seedAdmin(page: Page) {
  await page.addInitScript(() => {
    const oneHour = 60 * 60 * 1000;
    localStorage.setItem(
      'adminSession',
      JSON.stringify({ username: 'admin', loginTime: Date.now(), sessionExpiry: Date.now() + oneHour }),
    );
    localStorage.setItem('adminSessionExpiry', String(Date.now() + oneHour));
    localStorage.setItem('adminUser', JSON.stringify({ username: 'admin', role: 'admin' }));
  });
}

async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript((t) => {
    try {
      localStorage.setItem('darkMode', t === 'dark' ? 'true' : 'false');
      localStorage.setItem('theme', t);
    } catch {}
  }, theme);
}

async function applyThemeAttr(page: Page, theme: 'light' | 'dark') {
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t);
    document.body.setAttribute('data-theme', t);
    if (t === 'dark') document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
  }, theme);
}

async function killOverlays(page: Page) {
  await page.evaluate(() => {
    document.getElementById('update-notification')?.remove();
    document.querySelectorAll('.toast,.toast-container,[id*="notification"]').forEach((n) => {
      const el = n as HTMLElement;
      if (el.id !== 'mergeUsersForm') el.style.display = 'none';
    });
  });
}

async function blockNetwork(page: Page) {
  // Abort supabase + external font/CDN to keep layouts deterministic
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (/supabase|fonts\.googleapis|fonts\.gstatic|cdnjs\.cloudflare/.test(url)) {
      return route.continue(); // allow fonts/CDN so visuals match prod
    }
    return route.continue();
  });
  await page.route(/supabase\.co/, (r) => r.abort());
}

test.describe.configure({ mode: 'serial' });

for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    test(`index.html ${vp.tag} ${theme}`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 2 });
      const page = await ctx.newPage();
      await seedUser(page);
      await setTheme(page, theme);
      await blockNetwork(page);
      await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
      await applyThemeAttr(page, theme);
      await page.waitForTimeout(1500);
      await killOverlays(page);
      await page.screenshot({ path: path.join(OUT, `index_${vp.tag}_${theme}_above-fold.png`) });
      await page.screenshot({ path: path.join(OUT, `index_${vp.tag}_${theme}_full.png`), fullPage: true });

      // Open hamburger flyout capture
      try {
        await page.locator('#hamburgerMenu').click({ timeout: 2000 });
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(OUT, `index_${vp.tag}_${theme}_hamburger.png`) });
        await page.keyboard.press('Escape');
      } catch {}

      // Leaderboard tab
      try {
        await page.locator('.nav-btn[data-tab="leaderboard"]').click({ timeout: 2000 });
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(OUT, `index_${vp.tag}_${theme}_leaderboard.png`), fullPage: true });
      } catch {}

      // Profile tab
      try {
        await page.locator('.nav-btn[data-tab="profile"]').click({ timeout: 2000 });
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(OUT, `index_${vp.tag}_${theme}_profile.png`), fullPage: true });
      } catch {}

      await ctx.close();
    });

    test(`admin-login.html ${vp.tag} ${theme}`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 2 });
      const page = await ctx.newPage();
      await setTheme(page, theme);
      await blockNetwork(page);
      // admin-login.html now redirects to /admin/dist/#/login (shadcn SPA);
      // capture the new surface instead of the legacy form.
      await page.goto('/admin/dist/#/login', { waitUntil: 'domcontentloaded' });
      await applyThemeAttr(page, theme);
      await page.waitForTimeout(1000);
      await killOverlays(page);
      await page.screenshot({ path: path.join(OUT, `admin-login_${vp.tag}_${theme}.png`) });
      // Focus first password input for focus-state screenshot
      await page.locator('input[type="password"]').first().focus().catch(() => {});
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(OUT, `admin-login_${vp.tag}_${theme}_focus.png`) });
      await ctx.close();
    });

    test(`admin-dashboard.html ${vp.tag} ${theme}`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 2 });
      const page = await ctx.newPage();
      await seedAdmin(page);
      await setTheme(page, theme);
      await blockNetwork(page);
      await page.goto('/admin-dashboard.html', { waitUntil: 'domcontentloaded' });
      await applyThemeAttr(page, theme);
      await page.waitForTimeout(1500);
      await killOverlays(page);
      await page.screenshot({ path: path.join(OUT, `admin_${vp.tag}_${theme}_above-fold.png`) });
      await page.screenshot({ path: path.join(OUT, `admin_${vp.tag}_${theme}_full.png`), fullPage: true });

      // Scroll-anchor captures using the four section-header nodes
      const count = await page.locator('.section-header').count();
      const names = ['overview', 'management', 'rankings', 'devtools'];
      for (let i = 0; i < Math.min(count, names.length); i++) {
        try {
          await page.locator('.section-header').nth(i).scrollIntoViewIfNeeded();
          await page.waitForTimeout(300);
          await page.screenshot({ path: path.join(OUT, `admin_${vp.tag}_${theme}_${names[i]}.png`) });
        } catch {}
      }
      await ctx.close();
    });

    test(`live-display ${vp.tag} ${theme}`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 2 });
      const page = await ctx.newPage();
      await setTheme(page, theme);
      await blockNetwork(page);
      await page.goto('/live-display/index.html', { waitUntil: 'domcontentloaded' });
      await applyThemeAttr(page, theme);
      await page.waitForTimeout(2000);
      await killOverlays(page);
      await page.screenshot({ path: path.join(OUT, `live_${vp.tag}_${theme}.png`) });
      await page.screenshot({ path: path.join(OUT, `live_${vp.tag}_${theme}_full.png`), fullPage: true });
      await ctx.close();
    });
  }
}
