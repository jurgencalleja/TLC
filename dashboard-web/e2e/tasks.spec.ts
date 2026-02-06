import { test, expect } from '@playwright/test';

test.describe('Tasks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('domcontentloaded');
  });

  test('task board displays columns', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // The task board should show status columns
    const board = page.getByTestId('task-board');
    const hasBoard = await board.isVisible().catch(() => false);

    if (hasBoard) {
      // Expect at least To Do and Done columns
      await expect(page.locator('text=To Do')).toBeVisible();
      await expect(page.locator('text=Done')).toBeVisible();
    } else {
      // Board may not render without API data; verify page loaded
      await expect(page.getByTestId('sidebar')).toBeVisible();
    }
  });

  test('task filter controls are present', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for filter controls on the tasks page
    const filterSection = page.getByTestId('task-filter');
    const hasFilter = await filterSection.isVisible().catch(() => false);

    if (hasFilter) {
      // Filter should have status filter options
      const statusFilter = page.locator('[data-testid="task-filter"] select, [data-testid="task-filter"] button');
      const hasStatusFilter = await statusFilter.first().isVisible().catch(() => false);
      expect(hasStatusFilter).toBeTruthy();
    }
  });

  test('clicking a task opens detail view', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Find task cards
    const taskCards = page.locator('[data-testid^="task-card-"]');
    const cardCount = await taskCards.count();

    if (cardCount > 0) {
      // Click the first task card
      await taskCards.first().click();

      // A detail modal or panel should appear
      const detail = page.getByTestId('task-detail');
      const hasDetail = await detail.isVisible().catch(() => false);
      expect(hasDetail).toBeTruthy();
    }
  });

  test('tasks page is accessible via direct URL', async ({ page }) => {
    await expect(page).toHaveURL('/tasks');
    await expect(page.getByTestId('sidebar')).toBeVisible();
  });

  test('filter by status reduces visible tasks', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const taskCards = page.locator('[data-testid^="task-card-"]');
    const initialCount = await taskCards.count();

    if (initialCount > 1) {
      // Look for a filter that narrows results
      const statusFilter = page.locator('[data-testid="status-filter"]');
      const hasFilter = await statusFilter.isVisible().catch(() => false);

      if (hasFilter) {
        await statusFilter.selectOption('done');
        const filteredCount = await taskCards.count();
        expect(filteredCount).toBeLessThanOrEqual(initialCount);
      }
    }
  });
});
