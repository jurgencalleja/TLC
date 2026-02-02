import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  // Verbose reporter - shows console.log output
  reporter: [
    ['list', { printSteps: true }],
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL: process.env.TLC_BASE_URL || 'http://localhost:3147',
    trace: 'on-first-retry',
    // Capture console logs in test output
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  // Output directory for test artifacts
  outputDir: 'test-results/',
  webServer: {
    command: 'node server/index.js',
    url: 'http://localhost:3147',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
    // Show server output for debugging
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
