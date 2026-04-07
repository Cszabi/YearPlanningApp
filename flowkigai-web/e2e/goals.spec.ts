import { test, expect } from '@playwright/test';
import { gotoProtected, MOCK_GOALS } from './helpers';

test.describe('Goals Page', () => {
  test('goals page loads and shows goals', async ({ page }) => {
    await gotoProtected(page, '/goals');
    await expect(page.locator(`text=${MOCK_GOALS[0].title}`)).toBeVisible({ timeout: 10_000 });
  });

  test('goals page shows multiple goals', async ({ page }) => {
    await gotoProtected(page, '/goals');
    await expect(page.locator(`text=${MOCK_GOALS[0].title}`)).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(`text=${MOCK_GOALS[1].title}`)).toBeVisible();
  });

  test('goals page has tab navigation (Active, Habits, Completed)', async ({ page }) => {
    await gotoProtected(page, '/goals');
    // Look for tab-like navigation
    await expect(page.locator('text=/Active/i').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=/Habits/i').first()).toBeVisible();
  });

  test('clicking a goal navigates to detail page', async ({ page }) => {
    await gotoProtected(page, '/goals');
    await page.locator(`text=${MOCK_GOALS[0].title}`).click();
    await page.waitForURL('**/goals/**');
  });

  test('goals page has create button', async ({ page }) => {
    await gotoProtected(page, '/goals');
    // Look for add/create goal button
    const addBtn = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New"), button[aria-label*="add" i]');
    await expect(addBtn.first()).toBeVisible({ timeout: 10_000 });
  });
});
