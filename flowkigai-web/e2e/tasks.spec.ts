import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers';

test.describe('Tasks Page', () => {
  test('tasks page loads', async ({ page }) => {
    await gotoProtected(page, '/tasks');
    await expect(page.locator('main, [role="main"]').first()).toBeVisible();
  });

  test('tasks page shows task titles from goals', async ({ page }) => {
    await gotoProtected(page, '/tasks');
    // Tasks are extracted from goal.milestones[].tasks[]
    await expect(page.locator('text=Read TypeScript handbook')).toBeVisible({ timeout: 10_000 });
  });

  test('tasks page shows multiple tasks', async ({ page }) => {
    await gotoProtected(page, '/tasks');
    await expect(page.locator('text=Read TypeScript handbook')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=Run 5k practice')).toBeVisible();
  });

  test('tasks page has energy filter', async ({ page }) => {
    await gotoProtected(page, '/tasks');
    // Energy filter chips: All | Deep | Medium | Shallow
    await expect(page.locator('text=/All|Deep|Medium|Shallow/i').first()).toBeVisible({ timeout: 10_000 });
  });
});
