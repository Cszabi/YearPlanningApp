import { test, expect } from '@playwright/test';
import { gotoProtected, MOCK_USER } from './helpers';

test.describe('Navigation', () => {
  test('sidebar shows all navigation tabs', async ({ page }) => {
    await gotoProtected(page, '/dashboard');

    // Use a:has-text to scope to sidebar links only (avoids matching page headings)
    await expect(page.locator('a:has-text("Dashboard")').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('a:has-text("Ikigai")')).toBeVisible();
    await expect(page.locator('a:has-text("Map")')).toBeVisible();
    await expect(page.locator('a:has-text("Goals")')).toBeVisible();
    await expect(page.locator('a:has-text("Calendar")')).toBeVisible();
    await expect(page.locator('a:has-text("Flow")')).toBeVisible();
    await expect(page.locator('a:has-text("Tasks")')).toBeVisible();
    await expect(page.locator('a:has-text("Reviews")')).toBeVisible();
  });

  test('sidebar shows user display name', async ({ page }) => {
    await gotoProtected(page, '/dashboard');
    await expect(page.locator(`text=${MOCK_USER.displayName}`)).toBeVisible({ timeout: 10_000 });
  });

  test('clicking Ikigai navigates to ikigai page', async ({ page }) => {
    await gotoProtected(page, '/dashboard');
    await expect(page.locator('a:has-text("Ikigai")')).toBeVisible({ timeout: 10_000 });
    await page.locator('a:has-text("Ikigai")').click();
    await page.waitForURL('**/ikigai');
  });

  test('clicking Goals navigates to goals page', async ({ page }) => {
    await gotoProtected(page, '/dashboard');
    await expect(page.locator('a:has-text("Goals")')).toBeVisible({ timeout: 10_000 });
    await page.locator('a:has-text("Goals")').click();
    await page.waitForURL('**/goals');
  });

  test('clicking Flow navigates to flow page', async ({ page }) => {
    await gotoProtected(page, '/dashboard');
    await expect(page.locator('a:has-text("Flow")')).toBeVisible({ timeout: 10_000 });
    await page.locator('a:has-text("Flow")').click();
    await page.waitForURL('**/flow');
  });

  test('clicking Tasks navigates to tasks page', async ({ page }) => {
    await gotoProtected(page, '/dashboard');
    await expect(page.locator('a:has-text("Tasks")')).toBeVisible({ timeout: 10_000 });
    await page.locator('a:has-text("Tasks")').click();
    await page.waitForURL('**/tasks');
  });

  test('clicking Calendar navigates to calendar page', async ({ page }) => {
    await gotoProtected(page, '/dashboard');
    await expect(page.locator('a:has-text("Calendar")')).toBeVisible({ timeout: 10_000 });
    await page.locator('a:has-text("Calendar")').click();
    await page.waitForURL('**/calendar');
  });

  test('clicking Reviews navigates to reviews page', async ({ page }) => {
    await gotoProtected(page, '/dashboard');
    await expect(page.locator('a:has-text("Reviews")')).toBeVisible({ timeout: 10_000 });
    await page.locator('a:has-text("Reviews")').click();
    await page.waitForURL('**/reviews');
  });

  test('clicking Map navigates to mind map page', async ({ page }) => {
    await gotoProtected(page, '/dashboard');
    await expect(page.locator('a:has-text("Map")')).toBeVisible({ timeout: 10_000 });
    await page.locator('a:has-text("Map")').click();
    await page.waitForURL('**/map');
  });

  test('logout clears auth and redirects', async ({ page }) => {
    await gotoProtected(page, '/dashboard');

    // Wait for sidebar to fully load
    await expect(page.locator('a:has-text("Dashboard")').first()).toBeVisible({ timeout: 10_000 });

    // Click logout button (sign out icon)
    await page.locator('[aria-label="Sign out"], button:has(> [data-testid="LogoutIcon"])').click();

    // Should redirect to landing page
    await page.waitForURL('/');
  });

  test('unauthenticated user is redirected from protected routes', async ({ page }) => {
    // Don't inject auth — go directly to a protected route
    await page.goto('/dashboard');

    // Should redirect to home/landing
    await page.waitForURL('/');
  });
});
