#!/usr/bin/env node
/**
 * Project Documentation Maintenance
 *
 * Works on any TLC project to:
 * - Generate/update README sections
 * - Create API documentation
 * - Capture app screenshots
 * - Sync to GitHub Wiki
 * - Set up CI/CD for docs
 *
 * Usage:
 *   npx tlc-docs                    # Full docs update
 *   npx tlc-docs setup              # Set up docs automation
 *   npx tlc-docs readme             # Update README
 *   npx tlc-docs screenshots        # Capture screenshots
 *   npx tlc-docs api                # Generate API docs
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const PROJECT_DIR = process.cwd();
const DOCS_DIR = path.join(PROJECT_DIR, 'docs');

/**
 * Get project info from package.json and .tlc.json
 */
function getProjectInfo() {
  const info = {
    name: path.basename(PROJECT_DIR),
    version: '1.0.0',
    description: '',
    hasTypeScript: false,
    hasPlaywright: false,
    hasTLC: false,
  };

  // Read package.json
  const pkgPath = path.join(PROJECT_DIR, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    info.name = pkg.name || info.name;
    info.version = pkg.version || info.version;
    info.description = pkg.description || info.description;
    info.hasTypeScript = !!pkg.devDependencies?.typescript || !!pkg.dependencies?.typescript;
    info.hasPlaywright = !!pkg.devDependencies?.playwright || !!pkg.dependencies?.playwright;
  }

  // Read .tlc.json
  const tlcPath = path.join(PROJECT_DIR, '.tlc.json');
  if (fs.existsSync(tlcPath)) {
    const tlc = JSON.parse(fs.readFileSync(tlcPath, 'utf-8'));
    info.hasTLC = true;
    info.description = info.description || tlc.description;
  }

  // Read PROJECT.md
  const projectMdPath = path.join(PROJECT_DIR, 'PROJECT.md');
  if (fs.existsSync(projectMdPath)) {
    const content = fs.readFileSync(projectMdPath, 'utf-8');
    const descMatch = content.match(/##\s*Description\s*\n+([^\n#]+)/i);
    if (descMatch) {
      info.description = info.description || descMatch[1].trim();
    }
  }

  return info;
}

/**
 * Set up docs automation for project
 */
function setupDocs() {
  console.log('Setting up documentation automation...\n');

  // Create docs directory
  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
    console.log('  ✓ Created docs/ directory');
  }

  // Create images directory
  const imagesDir = path.join(DOCS_DIR, 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
    console.log('  ✓ Created docs/images/ directory');
  }

  // Copy GitHub workflow
  const workflowDir = path.join(PROJECT_DIR, '.github/workflows');
  if (!fs.existsSync(workflowDir)) {
    fs.mkdirSync(workflowDir, { recursive: true });
  }

  const workflowDest = path.join(workflowDir, 'docs-sync.yml');
  if (!fs.existsSync(workflowDest)) {
    // Try to find template in TLC installation
    const templatePaths = [
      path.join(__dirname, '../templates/docs-sync.yml'),
      path.join(__dirname, '../../templates/docs-sync.yml'),
    ];

    let templateContent = null;
    for (const tp of templatePaths) {
      if (fs.existsSync(tp)) {
        templateContent = fs.readFileSync(tp, 'utf-8');
        break;
      }
    }

    if (templateContent) {
      fs.writeFileSync(workflowDest, templateContent);
      console.log('  ✓ Created .github/workflows/docs-sync.yml');
    } else {
      console.log('  ⚠ Could not find docs-sync.yml template');
    }
  } else {
    console.log('  ✓ docs-sync.yml already exists');
  }

  // Add npm scripts if package.json exists
  const pkgPath = path.join(PROJECT_DIR, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    let updated = false;

    if (!pkg.scripts) pkg.scripts = {};

    if (!pkg.scripts['docs']) {
      pkg.scripts['docs'] = 'npx tlc-docs';
      updated = true;
    }
    if (!pkg.scripts['docs:screenshots']) {
      pkg.scripts['docs:screenshots'] = 'npx tlc-docs screenshots';
      updated = true;
    }

    if (updated) {
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
      console.log('  ✓ Added docs scripts to package.json');
    }
  }

  // Create initial docs structure
  const gettingStartedPath = path.join(DOCS_DIR, 'getting-started.md');
  if (!fs.existsSync(gettingStartedPath)) {
    const info = getProjectInfo();
    const content = `# Getting Started with ${info.name}

${info.description || 'Welcome to the project!'}

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`bash
npm start
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`

## Testing

\`\`\`bash
npm test
\`\`\`
`;
    fs.writeFileSync(gettingStartedPath, content);
    console.log('  ✓ Created docs/getting-started.md');
  }

  console.log('\n✓ Documentation setup complete!');
  console.log('\nNext steps:');
  console.log('  1. Push to GitHub to enable wiki sync');
  console.log('  2. Run /tlc:docs to update documentation');
  console.log('  3. Run /tlc:docs screenshots to capture app screenshots');
}

/**
 * Update README with project info
 */
function updateReadme() {
  const info = getProjectInfo();
  const readmePath = path.join(PROJECT_DIR, 'README.md');

  let content = '';
  if (fs.existsSync(readmePath)) {
    content = fs.readFileSync(readmePath, 'utf-8');
  }

  // Update version badge if exists
  const versionBadgePattern = /!\[version\]\([^)]*\)/gi;
  if (versionBadgePattern.test(content)) {
    content = content.replace(
      versionBadgePattern,
      `![version](https://img.shields.io/badge/version-${info.version}-blue)`
    );
    console.log('  ✓ Updated version badge');
  }

  // Update version references
  const oldVersionPattern = /v\d+\.\d+\.\d+/g;
  const updated = content.replace(oldVersionPattern, `v${info.version}`);

  if (updated !== content) {
    fs.writeFileSync(readmePath, updated);
    console.log('  ✓ Updated version references');
  }

  return true;
}

/**
 * Capture screenshots using Playwright
 */
async function captureScreenshots() {
  console.log('Capturing screenshots...\n');

  const info = getProjectInfo();

  if (!info.hasPlaywright) {
    console.log('  Installing Playwright...');
    try {
      execSync('npm install -D playwright', { cwd: PROJECT_DIR, stdio: 'pipe' });
      execSync('npx playwright install chromium', { cwd: PROJECT_DIR, stdio: 'pipe' });
    } catch (e) {
      console.log('  ⚠ Could not install Playwright');
      return;
    }
  }

  // Try to capture screenshots
  const imagesDir = path.join(DOCS_DIR, 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  // Create a simple capture script
  const captureScript = `
const { chromium } = require('playwright');
const path = require('path');

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 720 });

  const urls = [
    { url: 'http://localhost:3000', name: 'homepage' },
    { url: 'http://localhost:3000/dashboard', name: 'dashboard' },
    { url: 'http://localhost:5001', name: 'app' },
    { url: 'http://localhost:3147', name: 'tlc-dashboard' },
  ];

  for (const { url, name } of urls) {
    try {
      await page.goto(url, { timeout: 5000 });
      await page.screenshot({
        path: path.join('${imagesDir.replace(/\\/g, '\\\\')}', name + '.png'),
        fullPage: false,
      });
      console.log('  ✓ ' + name + '.png');
    } catch (e) {
      // URL not accessible, skip
    }
  }

  await browser.close();
}

capture().catch(console.error);
`;

  const tempScript = path.join(PROJECT_DIR, '.tlc-capture-temp.js');
  fs.writeFileSync(tempScript, captureScript);

  try {
    execSync(`node ${tempScript}`, { cwd: PROJECT_DIR, stdio: 'inherit' });
  } catch (e) {
    console.log('  ⚠ Screenshot capture had issues (app may not be running)');
  } finally {
    fs.unlinkSync(tempScript);
  }
}

/**
 * Generate API documentation
 */
function generateApiDocs() {
  console.log('Generating API documentation...\n');

  const info = getProjectInfo();

  if (info.hasTypeScript) {
    console.log('  Detecting TypeScript, using TypeDoc...');
    try {
      execSync('npx typedoc --out docs/api src/', { cwd: PROJECT_DIR, stdio: 'pipe' });
      console.log('  ✓ Generated API docs in docs/api/');
    } catch (e) {
      console.log('  ⚠ TypeDoc generation failed');
    }
  } else {
    console.log('  No TypeScript detected, skipping API docs');
  }
}

/**
 * Full documentation update
 */
async function fullUpdate() {
  console.log('TLC Documentation Update\n');
  console.log('═'.repeat(50));

  const info = getProjectInfo();
  console.log(`\nProject: ${info.name} v${info.version}\n`);

  // Ensure docs directory exists
  if (!fs.existsSync(DOCS_DIR)) {
    console.log('No docs/ directory found. Running setup first...\n');
    setupDocs();
    console.log('');
  }

  // Update README
  console.log('📄 README');
  updateReadme();

  // Generate API docs
  console.log('\n📚 API Documentation');
  generateApiDocs();

  // Capture screenshots if possible
  console.log('\n📸 Screenshots');
  await captureScreenshots();

  console.log('\n' + '═'.repeat(50));
  console.log('\n✓ Documentation updated!');
}

/**
 * Main function
 */
async function main() {
  const command = process.argv[2] || 'update';

  switch (command) {
    case 'setup':
      setupDocs();
      break;
    case 'readme':
      console.log('Updating README...\n');
      updateReadme();
      break;
    case 'screenshots':
      await captureScreenshots();
      break;
    case 'api':
      generateApiDocs();
      break;
    case 'update':
    default:
      await fullUpdate();
      break;
  }
}

main().catch(console.error);
