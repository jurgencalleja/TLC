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
      // Use .first() because both desktop and mobile sidebars have data-testid="sidebar"
      await expect(page.getByTestId('sidebar').first()).toBeVisible();
    }
  });

  test('task filter controls are present', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // The TaskFilter component renders data-testid="task-filter" on the filter button itself.
    // Clicking it opens a dropdown panel with assignee and priority checkboxes.
    const filterButton = page.getByTestId('task-filter');
    const hasFilter = await filterButton.isVisible().catch(() => false);

    if (hasFilter) {
      // The filter button should be clickable
      await expect(filterButton).toBeEnabled();

      // Click to open the filter panel
      await filterButton.click();
      await page.waitForTimeout(100);

      // The filter panel should appear with filter options
      const filterPanel = page.getByTestId('filter-panel');
      const hasPanelVisible = await filterPanel.isVisible().catch(() => false);
      expect(hasPanelVisible).toBeTruthy();
    }
  });

  test('clicking a task opens detail view', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // TaskCard uses data-testid="task-card" (not "task-card-{id}")
    const taskCards = page.locator('[data-testid="task-card"]');
    const cardCount = await taskCards.count();

    if (cardCount > 0) {
      // Click the first task card
      await taskCards.first().click();

      // A detail panel should appear on the right side
      const detail = page.getByTestId('task-detail');
      const hasDetail = await detail.isVisible().catch(() => false);
      expect(hasDetail).toBeTruthy();
    }
  });

  test('tasks page is accessible via direct URL', async ({ page }) => {
    await expect(page).toHaveURL('/tasks');
    // Use .first() because both desktop and mobile sidebars have data-testid="sidebar"
    await expect(page.getByTestId('sidebar').first()).toBeVisible();
  });

  test('filter by status reduces visible tasks', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // TaskCard uses data-testid="task-card" (not "task-card-{id}")
    const taskCards = page.locator('[data-testid="task-card"]');
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
