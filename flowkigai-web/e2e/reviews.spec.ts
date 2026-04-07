import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers';

test.describe('Reviews Page', () => {
  test('reviews page loads', async ({ page }) => {
    await gotoProtected(page, '/reviews');
    await expect(page.locator('main, [role="main"]').first()).toBeVisible();
  });

  test('reviews page shows review-related content', async ({ page }) => {
    await gotoProtected(page, '/reviews');
    // Should show weekly review or related UI
    await expect(page.locator('text=/Review|Weekly|Reflect/i').first()).toBeVisible({ timeout: 10_000 });
  });
});
