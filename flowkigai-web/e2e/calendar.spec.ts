import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers';

test.describe('Calendar Page', () => {
  test('calendar page loads', async ({ page }) => {
    await gotoProtected(page, '/calendar');
    await expect(page.locator('main, [role="main"]').first()).toBeVisible();
  });

  test('calendar shows current month', async ({ page }) => {
    await gotoProtected(page, '/calendar');
    // Should show current month name
    const now = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonth = monthNames[now.getMonth()];
    await expect(page.locator(`text=/${currentMonth}/i`).first()).toBeVisible({ timeout: 10_000 });
  });

  test('calendar has navigation arrows', async ({ page }) => {
    await gotoProtected(page, '/calendar');
    // Should have prev/next month navigation
    const navBtn = page.locator('button[aria-label*="previous" i], button[aria-label*="next" i], button:has(svg)');
    await expect(navBtn.first()).toBeVisible({ timeout: 10_000 });
  });

  test('calendar shows day grid', async ({ page }) => {
    await gotoProtected(page, '/calendar');
    // Should show day numbers (at least day 1 and day 15)
    await expect(page.locator('text="1"').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text="15"').first()).toBeVisible();
  });
});
