import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers';

test.describe('Theme Toggle', () => {
  test('theme toggle button exists in sidebar', async ({ page }) => {
    await gotoProtected(page, '/dashboard');
    // Theme toggle should be visible (sun/moon icon button)
    const themeBtn = page.locator('button:has([data-testid="DarkModeIcon"]), button:has([data-testid="LightModeIcon"])');
    await expect(themeBtn.first()).toBeVisible({ timeout: 10_000 });
  });

  test('clicking theme toggle changes theme', async ({ page }) => {
    await gotoProtected(page, '/dashboard');
    const themeBtn = page.locator('button:has([data-testid="DarkModeIcon"]), button:has([data-testid="LightModeIcon"])');
    await expect(themeBtn.first()).toBeVisible({ timeout: 10_000 });

    // Get the initial theme icon
    const hasDarkIcon = await page.locator('[data-testid="DarkModeIcon"]').count();

    await themeBtn.first().click();

    // After click, the icon should change
    if (hasDarkIcon > 0) {
      await expect(page.locator('[data-testid="LightModeIcon"]')).toBeVisible();
    } else {
      await expect(page.locator('[data-testid="DarkModeIcon"]')).toBeVisible();
    }
  });
});
