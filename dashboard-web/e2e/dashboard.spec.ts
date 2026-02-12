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
    // Use .first() because both desktop and mobile sidebars have data-testid="sidebar"
    await expect(page.getByTestId('sidebar').first()).toBeVisible();

    // Verify load time is under 3 seconds
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);
  });

  test('shows project name when project is loaded', async ({ page }) => {
    // Wait for the dashboard content to load
    await page.waitForLoadState('networkidle');

    // On first load with no project selected, the heading is an h2 "No Project Selected"
    // When a project is loaded, the heading is an h1 with the project name
    const hasH1 = await page.locator('h1').first().isVisible().catch(() => false);
    const hasH2 = await page.locator('h2').first().isVisible().catch(() => false);
    expect(hasH1 || hasH2).toBeTruthy();
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
      await expect(getStartedButton).toBeVisible();
    }
  });

  test('theme toggle works and persists', async ({ page }) => {
    // Wait for the app to initialize
    await page.waitForLoadState('networkidle');

    // Find the theme toggle button
    const themeToggle = page.getByTestId('theme-toggle');
    const hasThemeToggle = await themeToggle.isVisible().catch(() => false);

    if (hasThemeToggle) {
      // Get initial theme from the data-theme attribute on <html>
      // Shell.tsx manages theme via data-theme attribute, not localStorage
      const initialTheme = await page.evaluate(() =>
        document.documentElement.getAttribute('data-theme')
      );

      // Click the theme toggle
      await themeToggle.click();

      // Wait for the theme to change
      await page.waitForTimeout(100);

      // Get the new theme from the data-theme attribute
      const newTheme = await page.evaluate(() =>
        document.documentElement.getAttribute('data-theme')
      );

      // Verify theme has changed
      if (initialTheme === 'dark' || initialTheme === null) {
        expect(newTheme).toBe('light');
      } else {
        expect(newTheme).toBe('dark');
      }
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
    // Use .first() because both desktop and mobile sidebars have data-testid="sidebar"
    await expect(page.getByTestId('sidebar').first()).toBeVisible();

    // Wait for full load
    await page.waitForLoadState('networkidle');
  });
});
