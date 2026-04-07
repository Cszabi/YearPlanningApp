import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('landing page renders', async ({ page }) => {
    await page.goto('/');
    // Should have some content visible
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('landing page has sign in link', async ({ page }) => {
    await page.goto('/');
    const loginLink = page.locator('a[href="/login"], a:has-text("Sign in"), a:has-text("Log in"), a:has-text("Get Started")');
    await expect(loginLink.first()).toBeVisible();
  });

  test('landing page has Flowkigai branding', async ({ page }) => {
    await page.goto('/');
    // Check for Flowkigai text or logo
    await expect(page.locator('text=Flowkigai').first()).toBeVisible();
  });
});
