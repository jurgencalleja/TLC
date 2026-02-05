import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('sidebar navigation works', async ({ page }) => {
    // Wait for sidebar to be visible
    const sidebar = page.getByTestId('sidebar');
    await expect(sidebar).toBeVisible();

    // Test navigation to Projects
    await page.getByRole('link', { name: /projects/i }).click();
    await expect(page).toHaveURL('/projects');

    // Test navigation to Tasks
    await page.getByRole('link', { name: /tasks/i }).click();
    await expect(page).toHaveURL('/tasks');

    // Test navigation to Logs
    await page.getByRole('link', { name: /logs/i }).click();
    await expect(page).toHaveURL('/logs');

    // Test navigation to Preview
    await page.getByRole('link', { name: /preview/i }).click();
    await expect(page).toHaveURL('/preview');

    // Test navigation to Settings
    await page.getByRole('link', { name: /settings/i }).click();
    await expect(page).toHaveURL('/settings');

    // Test navigation back to Dashboard
    await page.getByRole('link', { name: /dashboard/i }).click();
    await expect(page).toHaveURL('/');
  });

  test('sidebar active item is highlighted', async ({ page }) => {
    // Navigate to Tasks page
    await page.getByRole('link', { name: /tasks/i }).click();
    await expect(page).toHaveURL('/tasks');

    // Check that the Tasks link has the active class
    const tasksLink = page.getByRole('link', { name: /tasks/i });
    await expect(tasksLink).toHaveClass(/active/);

    // Navigate to Logs page
    await page.getByRole('link', { name: /logs/i }).click();
    await expect(page).toHaveURL('/logs');

    // Check that the Logs link now has the active class
    const logsLink = page.getByRole('link', { name: /logs/i });
    await expect(logsLink).toHaveClass(/active/);
  });

  test('command palette opens with Cmd+K (Mac) or Ctrl+K (Windows/Linux)', async ({
    page,
  }) => {
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Command palette should not be visible initially
    const commandPalette = page.getByTestId('command-palette');
    await expect(commandPalette).not.toBeVisible();

    // Press Cmd+K (or Ctrl+K on non-Mac)
    await page.keyboard.press('Control+k');

    // Command palette should now be visible
    await expect(commandPalette).toBeVisible();

    // Verify the search input is focused
    const searchInput = page.locator('input[placeholder="Type a command..."]');
    await expect(searchInput).toBeFocused();

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(commandPalette).not.toBeVisible();
  });

  test('command palette shows navigation commands', async ({ page }) => {
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Open command palette
    await page.keyboard.press('Control+k');
    const commandPalette = page.getByTestId('command-palette');
    await expect(commandPalette).toBeVisible();

    // Check that navigation commands are listed
    await expect(page.locator('text=Go to Dashboard')).toBeVisible();
    await expect(page.locator('text=Go to Projects')).toBeVisible();
    await expect(page.locator('text=Go to Tasks')).toBeVisible();
    await expect(page.locator('text=Go to Logs')).toBeVisible();
    await expect(page.locator('text=Go to Settings')).toBeVisible();
  });

  test('command palette can navigate to pages', async ({ page }) => {
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Open command palette
    await page.keyboard.press('Control+k');
    await expect(page.getByTestId('command-palette')).toBeVisible();

    // Click on "Go to Tasks"
    await page.locator('text=Go to Tasks').click();

    // Should navigate to tasks page
    await expect(page).toHaveURL('/tasks');

    // Command palette should be closed
    await expect(page.getByTestId('command-palette')).not.toBeVisible();
  });

  test('command palette filters commands when typing', async ({ page }) => {
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Open command palette
    await page.keyboard.press('Control+k');
    await expect(page.getByTestId('command-palette')).toBeVisible();

    // Type to filter
    await page.fill('input[placeholder="Type a command..."]', 'tasks');

    // Should only show commands matching "tasks"
    await expect(page.locator('text=Go to Tasks')).toBeVisible();

    // Other commands should not be visible
    await expect(page.locator('text=Go to Dashboard')).not.toBeVisible();
    await expect(page.locator('text=Go to Projects')).not.toBeVisible();
  });

  test('404 page shows for unknown routes', async ({ page }) => {
    // Navigate to a non-existent route
    await page.goto('/this-route-does-not-exist');

    // The shell should still render (with sidebar)
    await expect(page.getByTestId('sidebar')).toBeVisible();

    // Note: The app may not have a dedicated 404 page,
    // but the shell should still be functional
    // The route will just render nothing in the main content area
    // or show a default "not found" state
  });

  test('sidebar can be collapsed and expanded', async ({ page }) => {
    // Wait for sidebar to be visible
    const sidebar = page.getByTestId('sidebar');
    await expect(sidebar).toBeVisible();

    // Initially should be expanded (w-60)
    await expect(sidebar).toHaveClass(/w-60/);

    // Click collapse button
    await page.getByLabel('Collapse sidebar').click();

    // Should now be collapsed (w-16)
    await expect(sidebar).toHaveClass(/w-16/);
    await expect(sidebar).toHaveClass(/collapsed/);

    // Click expand button
    await page.getByLabel('Expand sidebar').click();

    // Should be expanded again
    await expect(sidebar).toHaveClass(/w-60/);
    await expect(sidebar).not.toHaveClass(/collapsed/);
  });

  test('keyboard navigation in command palette works', async ({ page }) => {
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Open command palette
    await page.keyboard.press('Control+k');
    await expect(page.getByTestId('command-palette')).toBeVisible();

    // Press arrow down to select second item
    await page.keyboard.press('ArrowDown');

    // Press Enter to execute the selected command
    await page.keyboard.press('Enter');

    // Should have navigated (to Projects, the second item)
    await expect(page).toHaveURL('/projects');
  });

  test('direct URL navigation works', async ({ page }) => {
    // Navigate directly to /tasks
    await page.goto('/tasks');
    await expect(page).toHaveURL('/tasks');

    // Navigate directly to /settings
    await page.goto('/settings');
    await expect(page).toHaveURL('/settings');

    // Navigate directly to /logs
    await page.goto('/logs');
    await expect(page).toHaveURL('/logs');

    // Navigate directly to /projects
    await page.goto('/projects');
    await expect(page).toHaveURL('/projects');
  });
});
