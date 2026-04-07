import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers';

test.describe('Ikigai Page', () => {
  test('ikigai page loads', async ({ page }) => {
    await gotoProtected(page, '/ikigai');
    await expect(page.locator('main, [role="main"]').first()).toBeVisible();
  });

  test('ikigai page shows journey content', async ({ page }) => {
    await gotoProtected(page, '/ikigai');
    // Should show ikigai-related content (values selection, rooms, journey phases)
    await expect(page.locator('text=/ikigai|journey|values|resonate|love|north star/i').first()).toBeVisible({ timeout: 10_000 });
  });

  test('ikigai page has interactive elements', async ({ page }) => {
    await gotoProtected(page, '/ikigai');
    // Journey phases have various CTA buttons depending on phase
    const cta = page.locator('button:has-text("Begin"), button:has-text("Continue"), button:has-text("Start"), button:has-text("feel right"), button:has-text("journey"), [role="tablist"]');
    await expect(cta.first()).toBeVisible({ timeout: 10_000 });
  });
});
