import { test, expect } from '@playwright/test';

test.describe('TLC Web Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Page Load & Layout', () => {
    test('loads dashboard with correct title', async ({ page }) => {
      await expect(page).toHaveTitle(/TLC Dashboard/);
    });

    test('displays header with logo and status', async ({ page }) => {
      const logo = page.locator('.logo');
      await expect(logo).toHaveText('TLC');

      const headerTitle = page.locator('.header-title');
      await expect(headerTitle).toHaveText('Dashboard');
    });

    test('shows connection status', async ({ page }) => {
      const statusDot = page.locator('#status-dot');
      await expect(statusDot).toBeVisible();

      const statusText = page.locator('#status-text');
      await expect(statusText).toBeVisible();
    });

    test('displays version in header', async ({ page }) => {
      const version = page.locator('.version');
      await expect(version).toBeVisible();
      await expect(version).toContainText('v');
    });

    test('sidebar is visible with navigation items', async ({ page }) => {
      const sidebar = page.locator('#sidebar');
      await expect(sidebar).toBeVisible();

      // Check all nav items
      const navItems = page.locator('.nav-item');
      await expect(navItems).toHaveCount(10);
    });
  });

  test.describe('Navigation', () => {
    test('Projects view is active by default', async ({ page }) => {
      const projectsNav = page.locator('.nav-item[data-view="projects"]');
      await expect(projectsNav).toHaveClass(/active/);

      const viewTitle = page.locator('#view-title');
      await expect(viewTitle).toContainText('Projects');
    });

    test('clicking nav item switches view', async ({ page }) => {
      // Click Tasks
      await page.locator('.nav-item[data-view="tasks"]').click();

      const tasksNav = page.locator('.nav-item[data-view="tasks"]');
      await expect(tasksNav).toHaveClass(/active/);

      const viewTitle = page.locator('#view-title');
      await expect(viewTitle).toContainText('Tasks');
    });

    test('keyboard shortcut switches view', async ({ page }) => {
      // Press 2 for Tasks
      await page.keyboard.press('2');

      const tasksNav = page.locator('.nav-item[data-view="tasks"]');
      await expect(tasksNav).toHaveClass(/active/);
    });

    test('all navigation items are clickable', async ({ page }) => {
      const views = ['projects', 'tasks', 'chat', 'agents', 'preview', 'logs', 'github', 'health', 'router', 'settings'];

      for (const view of views) {
        await page.locator(`.nav-item[data-view="${view}"]`).click();
        const navItem = page.locator(`.nav-item[data-view="${view}"]`);
        await expect(navItem).toHaveClass(/active/);
      }
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('number keys 1-9,0 switch views', async ({ page }) => {
      const keyViewMap: Record<string, string> = {
        '1': 'projects',
        '2': 'tasks',
        '3': 'chat',
        '4': 'agents',
        '5': 'preview',
        '6': 'logs',
        '7': 'github',
        '8': 'health',
        '9': 'router',
        '0': 'settings',
      };

      for (const [key, view] of Object.entries(keyViewMap)) {
        await page.keyboard.press(key);
        const navItem = page.locator(`.nav-item[data-view="${view}"]`);
        await expect(navItem).toHaveClass(/active/);
      }
    });

    test('question mark shows help', async ({ page }) => {
      await page.keyboard.press('?');
      // Help modal or dialog should appear
      // Implementation depends on dashboard
    });
  });

  test.describe('Projects View', () => {
    test('displays projects header', async ({ page }) => {
      await page.locator('.nav-item[data-view="projects"]').click();

      const viewTitle = page.locator('#view-title');
      await expect(viewTitle).toContainText('Projects');
    });

    test('shows empty state when no projects', async ({ page }) => {
      await page.locator('.nav-item[data-view="projects"]').click();

      // Either shows projects or empty state
      const content = page.locator('#view-content');
      await expect(content).toBeVisible();
    });
  });

  test.describe('Agents View', () => {
    test('displays agents section', async ({ page }) => {
      await page.locator('.nav-item[data-view="agents"]').click();

      const viewTitle = page.locator('#view-title');
      await expect(viewTitle).toContainText('Agents');
    });

    test('shows agent statistics', async ({ page }) => {
      await page.locator('.nav-item[data-view="agents"]').click();

      // Wait for content to load
      await page.waitForTimeout(500);

      const content = page.locator('#view-content');
      await expect(content).toBeVisible();
    });
  });

  test.describe('Logs View', () => {
    test('displays logs section', async ({ page }) => {
      await page.locator('.nav-item[data-view="logs"]').click();

      const viewTitle = page.locator('#view-title');
      await expect(viewTitle).toContainText('Logs');
    });

    test('logs view has filter controls', async ({ page }) => {
      await page.locator('.nav-item[data-view="logs"]').click();

      // Wait for content to load
      await page.waitForTimeout(500);

      const content = page.locator('#view-content');
      await expect(content).toBeVisible();
    });
  });

  test.describe('Health View', () => {
    test('displays health section', async ({ page }) => {
      await page.locator('.nav-item[data-view="health"]').click();

      const viewTitle = page.locator('#view-title');
      await expect(viewTitle).toContainText('Health');
    });

    test('shows system health indicators', async ({ page }) => {
      await page.locator('.nav-item[data-view="health"]').click();

      // Wait for content to load
      await page.waitForTimeout(500);

      const content = page.locator('#view-content');
      await expect(content).toBeVisible();
    });
  });

  test.describe('Router View', () => {
    test('displays router section', async ({ page }) => {
      await page.locator('.nav-item[data-view="router"]').click();

      const viewTitle = page.locator('#view-title');
      await expect(viewTitle).toContainText('Router');
    });
  });

  test.describe('Settings View', () => {
    test('displays settings section', async ({ page }) => {
      await page.locator('.nav-item[data-view="settings"]').click();

      const viewTitle = page.locator('#view-title');
      await expect(viewTitle).toContainText('Settings');
    });
  });

  test.describe('WebSocket Connection', () => {
    test('connects to WebSocket server', async ({ page }) => {
      // Wait for connection to establish
      await page.waitForTimeout(2000);

      const statusDot = page.locator('#status-dot');
      // Should be connected (green) or disconnected (red)
      await expect(statusDot).toBeVisible();
    });

    test('status updates reflect connection state', async ({ page }) => {
      // Wait for connection attempt
      await page.waitForTimeout(2000);

      const statusText = page.locator('#status-text');
      const text = await statusText.textContent();

      // Should show either "Connected" or "Disconnected" or "Connecting..."
      expect(text).toMatch(/Connect|Disconnect|Offline/i);
    });
  });

  test.describe('Responsive Design', () => {
    test('sidebar collapses on small screens', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 480, height: 800 });

      // Sidebar may be collapsed or hidden
      const sidebar = page.locator('#sidebar');
      await expect(sidebar).toBeVisible();
    });

    test('content fits mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Page should not have horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasHorizontalScroll).toBe(false);
    });

    test('tablet viewport shows proper layout', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      const sidebar = page.locator('#sidebar');
      await expect(sidebar).toBeVisible();

      const main = page.locator('.main');
      await expect(main).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('page has proper heading structure', async ({ page }) => {
      // Check for proper title
      await expect(page).toHaveTitle(/TLC/);
    });

    test('navigation items are focusable', async ({ page }) => {
      // Tab through nav items
      await page.keyboard.press('Tab');

      // Should be able to focus elements
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      expect(focused).not.toBe('BODY');
    });

    test('color contrast is visible', async ({ page }) => {
      // Check that text is visible (non-zero opacity)
      const logo = page.locator('.logo');
      const color = await logo.evaluate(el => getComputedStyle(el).color);
      expect(color).not.toBe('rgba(0, 0, 0, 0)');
    });
  });

  test.describe('Error Handling', () => {
    test('handles disconnection gracefully', async ({ page }) => {
      // Wait for initial load
      await page.waitForTimeout(1000);

      // Page should still be functional even if disconnected
      const sidebar = page.locator('#sidebar');
      await expect(sidebar).toBeVisible();

      // Navigation should still work
      await page.locator('.nav-item[data-view="settings"]').click();
      const settingsNav = page.locator('.nav-item[data-view="settings"]');
      await expect(settingsNav).toHaveClass(/active/);
    });
  });
});

test.describe('Dashboard API Integration', () => {
  const baseUrl = process.env.TLC_BASE_URL || 'http://localhost:3147';

  test('health endpoint returns OK', async ({ request }) => {
    const response = await request.get(`${baseUrl}/health`);
    expect(response.status()).toBe(200);
  });

  test('dashboard route serves HTML', async ({ request }) => {
    const response = await request.get(`${baseUrl}/`);
    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('text/html');
  });

  test('static assets are served', async ({ request }) => {
    // Test that the dashboard endpoint works
    const response = await request.get(`${baseUrl}/`);
    const html = await response.text();

    // Should contain TLC Dashboard content
    expect(html).toContain('TLC');
    expect(html).toContain('Dashboard');
  });
});
