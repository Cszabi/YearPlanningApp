import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers';

test.describe('Flow Page', () => {
  test('flow page loads', async ({ page }) => {
    await gotoProtected(page, '/flow');
    await expect(page.locator('main, [role="main"]').first()).toBeVisible();
  });

  test('flow page shows idle state', async ({ page }) => {
    await gotoProtected(page, '/flow');
    // Idle state shows "Flow sessions" heading and start button
    await expect(page.locator('text=/Flow/i').first()).toBeVisible({ timeout: 10_000 });
  });

  test('flow page has start session button', async ({ page }) => {
    await gotoProtected(page, '/flow');
    // Idle state shows "Start a session" button
    await expect(page.locator('button:has-text("Start"), button:has-text("session")').first()).toBeVisible({ timeout: 10_000 });
  });

  test('flow page shows session description', async ({ page }) => {
    await gotoProtected(page, '/flow');
    // Idle state shows description about deep work
    await expect(page.locator('text=/session|deep work|distraction/i').first()).toBeVisible({ timeout: 10_000 });
  });
});
