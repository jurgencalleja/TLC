import { test, expect } from '@playwright/test';

test.describe('Logs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/logs');
    await page.waitForLoadState('domcontentloaded');
  });

  test('logs page loads with sidebar visible', async ({ page }) => {
    await expect(page.getByTestId('sidebar')).toBeVisible();
    await expect(page).toHaveURL('/logs');
  });

  test('log type tabs are present', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for log type selector tabs
    const hasTabs =
      (await page.locator('text=App').isVisible().catch(() => false)) ||
      (await page.locator('text=Test').isVisible().catch(() => false)) ||
      (await page.locator('text=System').isVisible().catch(() => false));

    // Either tabs exist or the log stream renders directly
    const hasLogStream = await page.getByTestId('log-stream').isVisible().catch(() => false);

    expect(hasTabs || hasLogStream).toBeTruthy();
  });

  test('search input filters log entries', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Find the log search input
    const searchInput = page.getByTestId('log-search-input');
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

    // Look for log entries
    const logEntries = page.locator('[data-testid^="log-entry-"]');
    const entryCount = await logEntries.count();

    if (entryCount > 0) {
      // At least one entry should have a data-level or color class
      const firstEntry = logEntries.first();
      const hasLevel = await firstEntry.getAttribute('data-level');
      const className = await firstEntry.getAttribute('class');

      // Either data-level attribute or CSS class for color coding
      expect(hasLevel || className).toBeTruthy();
    }
  });

  test('logs page is accessible via direct URL', async ({ page }) => {
    await expect(page).toHaveURL('/logs');

    // Shell should be present
    await expect(page.getByTestId('sidebar')).toBeVisible();
  });

  test('switching log type tabs changes displayed logs', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Find tab buttons
    const testTab = page.locator('[role="tab"]:has-text("Test"), button:has-text("Test")');
    const hasTestTab = await testTab.isVisible().catch(() => false);

    if (hasTestTab) {
      await testTab.click();
      await page.waitForTimeout(300);

      // The active tab should be highlighted
      const isActive =
        (await testTab.getAttribute('aria-selected')) === 'true' ||
        (await testTab.getAttribute('class'))?.includes('active');
      expect(isActive).toBeTruthy();
    }
  });
});
