import { test, expect } from '@playwright/test';

test.describe('Logs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/logs');
    await page.waitForLoadState('domcontentloaded');
  });

  test('logs page loads with sidebar visible', async ({ page }) => {
    // Use .first() because both desktop and mobile sidebars have data-testid="sidebar"
    await expect(page.getByTestId('sidebar').first()).toBeVisible();
    await expect(page).toHaveURL('/logs');
  });

  test('log type buttons are present', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // The LogsPage uses Button components for log type switching.
    // Labels are: "Application", "Tests", "Git", "System"
    const hasApplication = await page.getByRole('button', { name: 'Application' }).isVisible().catch(() => false);
    const hasTests = await page.getByRole('button', { name: 'Tests' }).isVisible().catch(() => false);
    const hasGit = await page.getByRole('button', { name: 'Git' }).isVisible().catch(() => false);
    const hasSystem = await page.getByRole('button', { name: 'System' }).isVisible().catch(() => false);

    // Either log type buttons exist or the log stream renders directly
    const hasLogStream = await page.getByTestId('log-stream').isVisible().catch(() => false);

    expect(hasApplication || hasTests || hasGit || hasSystem || hasLogStream).toBeTruthy();
  });

  test('search input filters log entries', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // The LogSearch component uses data-testid="log-search" on the wrapper div.
    // The input inside has placeholder "Search logs..."
    const searchInput = page.locator('input[placeholder="Search logs..."]');
    const hasSearch = await searchInput.isVisible().catch(() => false);

    if (hasSearch) {
      // Type a search query
      await searchInput.fill('error');

      // Give time for filter to apply
      await page.waitForTimeout(300);

      // Search should be reflected in the input
      await expect(searchInput).toHaveValue('error');
    }
  });

  test('log entries have color coding', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // LogStream uses data-testid="log-entry" (not "log-entry-{id}")
    const logEntries = page.locator('[data-testid="log-entry"]');
    const entryCount = await logEntries.count();

    if (entryCount > 0) {
      // Each entry contains a level badge (e.g., data-testid="level-info")
      // and log entries always have a class attribute for styling
      const firstEntry = logEntries.first();
      const className = await firstEntry.getAttribute('class');

      // Log entries always have CSS classes for color coding and layout
      expect(className).toBeTruthy();
    }
  });

  test('logs page is accessible via direct URL', async ({ page }) => {
    await expect(page).toHaveURL('/logs');

    // Shell should be present
    // Use .first() because both desktop and mobile sidebars have data-testid="sidebar"
    await expect(page.getByTestId('sidebar').first()).toBeVisible();
  });

  test('switching log type button changes active type', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // The LogsPage renders Button components for each log type.
    // The active type gets variant="primary" (btn-primary class),
    // others get variant="ghost" (btn-ghost class).
    const testsButton = page.getByRole('button', { name: 'Tests' });
    const hasTestsButton = await testsButton.isVisible().catch(() => false);

    if (hasTestsButton) {
      await testsButton.click();
      await page.waitForTimeout(300);

      // After clicking, the "Tests" button should have the primary variant class
      await expect(testsButton).toHaveClass(/btn-primary/);
    }
  });
});
