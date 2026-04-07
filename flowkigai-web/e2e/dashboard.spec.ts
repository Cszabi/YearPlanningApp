import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers';

test.describe('Dashboard', () => {
  test('dashboard page loads', async ({ page }) => {
    await gotoProtected(page, '/dashboard');
    // Dashboard should have some content rendered
    await expect(page.locator('main, [role="main"]').first()).toBeVisible();
  });

  test('dashboard shows north star widget', async ({ page }) => {
    await gotoProtected(page, '/dashboard');
    // North Star or purpose content should be visible
    await expect(page.locator('text=/North Star|Purpose|clarity/i').first()).toBeVisible({ timeout: 10_000 });
  });

  test('dashboard shows goal progress', async ({ page }) => {
    await gotoProtected(page, '/dashboard');
    // Should show goals or progress indicators
    await expect(page.locator('text=/Goals|Progress|Learn TypeScript/i').first()).toBeVisible({ timeout: 10_000 });
  });

  test('dashboard shows flow insights', async ({ page }) => {
    await gotoProtected(page, '/dashboard');
    // Should show flow session stats
    await expect(page.locator('text=/Flow|Sessions|Quality/i').first()).toBeVisible({ timeout: 10_000 });
  });
});
