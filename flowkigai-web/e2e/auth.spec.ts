import { test, expect } from '@playwright/test';
import { MOCK_USER, MOCK_TOKENS } from './helpers';

/**
 * Set up login API mock that accepts valid credentials.
 * IMPORTANT: Playwright evaluates routes in LIFO order (last registered first).
 * So we register the catch-all FIRST, then the specific login route SECOND.
 */
async function mockLoginApi(page: import('@playwright/test').Page) {
  // Catch-all registered FIRST → lower priority (checked last)
  await page.route('**/api/v1/**', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) });
  });

  // Specific login route registered SECOND → higher priority (checked first)
  await page.route('**/api/v1/auth/login', (route) => {
    const body = JSON.parse(route.request().postData() ?? '{}');
    if (body.email === 'test@flowkigai.com' && body.password === 'password123') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            userId: MOCK_USER.id,
            email: MOCK_USER.email,
            displayName: MOCK_USER.displayName,
            role: MOCK_USER.role,
            plan: MOCK_USER.plan,
            isEmailVerified: MOCK_USER.isEmailVerified,
            accessToken: MOCK_TOKENS.accessToken,
            refreshToken: MOCK_TOKENS.refreshToken,
          },
        }),
      });
    } else {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'Invalid email or password.' } }),
      });
    }
  });
}

test.describe('Authentication', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Sign in to your account')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Sign in');
  });

  test('successful login redirects to ikigai', async ({ page }) => {
    await mockLoginApi(page);
    await page.goto('/login');

    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });
    await page.locator('input[type="email"]').fill('test@flowkigai.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();

    await page.waitForURL('**/ikigai', { timeout: 10_000 });
    expect(page.url()).toContain('/ikigai');
  });

  test('failed login shows error message', async ({ page }) => {
    await mockLoginApi(page);
    await page.goto('/login');

    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });
    await page.locator('input[type="email"]').fill('wrong@example.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('text=Invalid email or password')).toBeVisible({ timeout: 10_000 });
  });

  test('login button shows loading state', async ({ page }) => {
    // Catch-all FIRST (lower priority)
    await page.route('**/api/v1/**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) });
    });

    // Delayed login route SECOND (higher priority)
    await page.route('**/api/v1/auth/login', async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            userId: MOCK_USER.id,
            email: MOCK_USER.email,
            displayName: MOCK_USER.displayName,
            role: MOCK_USER.role,
            plan: MOCK_USER.plan,
            isEmailVerified: MOCK_USER.isEmailVerified,
            accessToken: MOCK_TOKENS.accessToken,
            refreshToken: MOCK_TOKENS.refreshToken,
          },
        }),
      });
    });

    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });
    await page.locator('input[type="email"]').fill('test@flowkigai.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('button[type="submit"]')).toContainText('Signing in');
  });

  test('forgot password link navigates correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Forgot password?')).toBeVisible({ timeout: 10_000 });
    await page.locator('text=Forgot password?').click();
    await page.waitForURL('**/forgot-password');
    expect(page.url()).toContain('/forgot-password');
  });

  test('register link navigates correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Register')).toBeVisible({ timeout: 10_000 });
    await page.locator('text=Register').click();
    await page.waitForURL('**/register');
    expect(page.url()).toContain('/register');
  });

  test('back to home link works on login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Back to home')).toBeVisible({ timeout: 10_000 });
    await page.locator('text=Back to home').click();
    await page.waitForURL('/');
  });

  test('password visibility toggle works', async ({ page }) => {
    await page.goto('/login');
    const passwordInput = page.locator('input[placeholder="••••••••"]');
    await expect(passwordInput).toBeVisible({ timeout: 10_000 });
    await passwordInput.fill('mypassword');

    // Password should be hidden by default
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Hold the eye button to show password
    const eyeBtn = page.locator('button[tabindex="-1"]');
    await eyeBtn.dispatchEvent('mousedown');

    // Password field should now be type text
    await expect(page.locator('input[placeholder="••••••••"]')).toHaveAttribute('type', 'text');
  });
});
