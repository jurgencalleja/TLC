#!/usr/bin/env node
/**
 * Capture real screenshots using Playwright
 *
 * Usage:
 *   node scripts/capture-screenshots.js          # All screenshots
 *   node scripts/capture-screenshots.js dashboard # Dashboard only
 *   node scripts/capture-screenshots.js terminal  # Terminal mockups only
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const OUTPUT_DIR = path.join(__dirname, '../docs/wiki/images');
const DASHBOARD_URL = process.env.TLC_DASHBOARD_URL || 'http://localhost:3147';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Check if dashboard is running
 */
async function isDashboardRunning() {
  try {
    const response = await fetch(DASHBOARD_URL);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Start dashboard server
 */
async function startDashboard() {
  return new Promise((resolve, reject) => {
    console.log('Starting TLC dashboard...');
    const proc = spawn('node', ['server/index.js'], {
      cwd: path.join(__dirname, '..'),
      detached: true,
      stdio: 'ignore',
    });
    proc.unref();

    // Wait for server to be ready
    let attempts = 0;
    const check = setInterval(async () => {
      attempts++;
      if (await isDashboardRunning()) {
        clearInterval(check);
        resolve(proc);
      } else if (attempts > 30) {
        clearInterval(check);
        reject(new Error('Dashboard failed to start'));
      }
    }, 1000);
  });
}

/**
 * Capture dashboard screenshots
 */
async function captureDashboard(browser) {
  console.log('\nCapturing dashboard screenshots...');

  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  try {
    // Main dashboard
    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'dashboard-overview.png'),
      fullPage: false,
    });
    console.log('  ✓ dashboard-overview.png');

    // Try to navigate to different tabs if they exist
    const tabs = ['tasks', 'logs', 'team', 'settings'];
    for (const tab of tabs) {
      try {
        const tabSelector = `[data-tab="${tab}"], [href="#${tab}"], button:has-text("${tab}")`;
        const tabElement = await page.$(tabSelector);
        if (tabElement) {
          await tabElement.click();
          await page.waitForTimeout(500);
          await page.screenshot({
            path: path.join(OUTPUT_DIR, `dashboard-${tab}.png`),
            fullPage: false,
          });
          console.log(`  ✓ dashboard-${tab}.png`);
        }
      } catch (e) {
        // Tab might not exist, skip
      }
    }
  } catch (error) {
    console.log(`  ⚠ Dashboard capture failed: ${error.message}`);
  } finally {
    await page.close();
  }
}

/**
 * Generate terminal-style screenshots using text-to-image
 */
async function captureTerminal() {
  console.log('\nGenerating terminal screenshots...');

  // Import the generator script
  const generateScript = path.join(__dirname, 'generate-screenshots.js');
  if (fs.existsSync(generateScript)) {
    require(generateScript);
  } else {
    console.log('  ⚠ generate-screenshots.js not found, skipping terminal screenshots');
  }
}

/**
 * Main function
 */
async function main() {
  const mode = process.argv[2] || 'all';
  console.log(`Screenshot capture mode: ${mode}`);

  let browser;
  let dashboardStarted = false;

  try {
    if (mode === 'all' || mode === 'dashboard') {
      // Check if dashboard is running
      const running = await isDashboardRunning();

      if (!running) {
        console.log('Dashboard not running. Starting...');
        try {
          await startDashboard();
          dashboardStarted = true;
        } catch (e) {
          console.log('Could not start dashboard, will use terminal mockups only');
        }
      }

      if (await isDashboardRunning()) {
        browser = await chromium.launch({ headless: true });
        await captureDashboard(browser);
      }
    }

    if (mode === 'all' || mode === 'terminal') {
      await captureTerminal();
    }

    console.log('\n✓ Screenshot capture complete!');
  } catch (error) {
    console.error('Screenshot capture failed:', error.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main();
