import { test, expect } from '@playwright/test';

test.describe('Session persistence', () => {
  test('persists current user across reload using localStorage (offline mode)', async ({ page }) => {
    // Block Supabase CDN so the app stays in localStorage-only mode
    await page.route('**/@supabase/**', route => route.abort());

    await page.addInitScript(() => {
      const user = { id: 'user-1', name: 'Playwright Tester', team: 'CARE', dailyGoal: 8000, steps: {}, totalSteps: 0 };
      localStorage.setItem('stepTrackerUsesSupabase', 'false');
      localStorage.setItem('stepTrackerUsers', JSON.stringify([user]));
      localStorage.setItem('currentStepTrackerUser', user.id);
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('#welcomeScreen')).toHaveCSS('display', 'none');

    const currentUserName = await page.evaluate(() => window.stepTracker?.currentUser?.name);
    expect(currentUserName).toBe('Playwright Tester');
  });
});
