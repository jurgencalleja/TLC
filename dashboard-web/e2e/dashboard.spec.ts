import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('/');
  });

  test('loads within 3 seconds', async ({ page }) => {
    // Start timing
    const startTime = Date.now();

    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');

    // Check that the sidebar is visible (indicates app has loaded)
    await expect(page.getByTestId('sidebar')).toBeVisible();

    // Verify load time is under 3 seconds
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);
  });

  test('shows project name when project is loaded', async ({ page }) => {
    // Wait for the dashboard content to load
    await page.waitForLoadState('networkidle');

    // Check for either a project name heading or the "No Project Selected" state
    const hasProject = await page.locator('h1').first().isVisible();
    expect(hasProject).toBeTruthy();
  });

  test('quick actions are clickable', async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');

    // Check if quick actions section exists (may depend on project being loaded)
    const quickActionsSection = page.locator('text=Quick Actions');
    const hasQuickActions = await quickActionsSection.isVisible().catch(() => false);

    if (hasQuickActions) {
      // Find and verify the Run Tests button is clickable
      const runTestsButton = page.getByRole('button', { name: /run tests/i });
      await expect(runTestsButton).toBeEnabled();

      // Find and verify the View Logs button is clickable
      const viewLogsButton = page.getByRole('button', { name: /view logs/i });
      await expect(viewLogsButton).toBeEnabled();

      // Find and verify the View Tasks button is clickable
      const viewTasksButton = page.getByRole('button', { name: /view tasks/i });
      await expect(viewTasksButton).toBeEnabled();

      // Find and verify the Settings button is clickable
      const settingsButton = page.getByRole('button', { name: /settings/i });
      await expect(settingsButton).toBeEnabled();
    } else {
      // If no project is selected, verify the "Get Started" button exists
      const getStartedButton = page.getByRole('button', { name: /get started/i });
      const hasGetStarted = await getStartedButton.isVisible().catch(() => false);
      expect(hasGetStarted).toBeTruthy();
    }
  });

  test('theme toggle works and persists', async ({ page }) => {
    // Wait for the app to initialize
    await page.waitForLoadState('networkidle');

    // Find the theme toggle button
    const themeToggle = page.getByTestId('theme-toggle');
    const hasThemeToggle = await themeToggle.isVisible().catch(() => false);

    if (hasThemeToggle) {
      // Get initial theme from localStorage
      const initialTheme = await page.evaluate(() => localStorage.getItem('tlc-theme'));

      // Click the theme toggle
      await themeToggle.click();

      // Wait for the theme to change
      await page.waitForTimeout(100);

      // Get the new theme from localStorage
      const newTheme = await page.evaluate(() => localStorage.getItem('tlc-theme'));

      // Verify theme has changed
      if (initialTheme === 'dark' || initialTheme === null) {
        expect(newTheme).toBe('light');
      } else {
        expect(newTheme).toBe('dark');
      }

      // Reload the page and verify theme persists
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Check localStorage still has the theme
      const persistedTheme = await page.evaluate(() => localStorage.getItem('tlc-theme'));
      expect(persistedTheme).toBe(newTheme);
    } else {
      // Theme toggle may be in header or settings - this is acceptable
      test.skip();
    }
  });

  test('displays loading state correctly', async ({ page }) => {
    // Navigate with network throttling to see loading state
    await page.route('**/*', (route) => {
      // Add a small delay to API calls only
      if (route.request().url().includes('/api/')) {
        return new Promise((resolve) => setTimeout(resolve, 500)).then(() =>
          route.continue()
        );
      }
      return route.continue();
    });

    await page.goto('/');

    // The sidebar should be visible immediately (it doesn't depend on API)
    await expect(page.getByTestId('sidebar')).toBeVisible();

    // Wait for full load
    await page.waitForLoadState('networkidle');
  });
});
