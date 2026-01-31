#!/usr/bin/env node
/**
 * Documentation maintenance script
 *
 * Automatically:
 * - Updates version references in docs
 * - Checks for missing command documentation
 * - Validates internal links
 * - Regenerates screenshots if needed
 *
 * Usage:
 *   node scripts/docs-update.js           # Full update
 *   node scripts/docs-update.js --check   # Check only, no changes
 *   node scripts/docs-update.js --screenshots # Regenerate screenshots
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'docs/wiki');
const COMMANDS_DIR = path.join(ROOT, '.claude/commands/tlc');
const PACKAGE_JSON = path.join(ROOT, 'package.json');

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const screenshotsOnly = args.includes('--screenshots');

/**
 * Get current version from package.json
 */
function getVersion() {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf-8'));
  return pkg.version;
}

/**
 * Get all command files
 */
function getCommands() {
  if (!fs.existsSync(COMMANDS_DIR)) return [];

  return fs.readdirSync(COMMANDS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const content = fs.readFileSync(path.join(COMMANDS_DIR, f), 'utf-8');
      const name = f.replace('.md', '');
      const titleMatch = content.match(/^#\s+(.+)/m);
      const title = titleMatch ? titleMatch[1] : name;

      return { name, title, file: f };
    });
}

/**
 * Check command-reference.md for missing commands
 */
function checkCommandDocs() {
  const commandRefPath = path.join(DOCS_DIR, 'command-reference.md');
  if (!fs.existsSync(commandRefPath)) {
    console.log('⚠ command-reference.md not found');
    return { missing: [], outdated: [] };
  }

  const content = fs.readFileSync(commandRefPath, 'utf-8');
  const commands = getCommands();

  const missing = commands.filter(cmd => {
    const pattern = new RegExp(`/tlc:${cmd.name}[^a-z]`, 'i');
    return !pattern.test(content) && cmd.name !== 'tlc';
  });

  return { missing, total: commands.length };
}

/**
 * Update version references in docs
 */
function updateVersions() {
  const version = getVersion();
  const versionPattern = /v\d+\.\d+\.\d+/g;

  let updated = 0;

  const files = fs.readdirSync(DOCS_DIR)
    .filter(f => f.endsWith('.md'));

  for (const file of files) {
    const filepath = path.join(DOCS_DIR, file);
    let content = fs.readFileSync(filepath, 'utf-8');

    const matches = content.match(versionPattern);
    if (matches) {
      const oldContent = content;
      content = content.replace(versionPattern, `v${version}`);

      if (content !== oldContent && !checkOnly) {
        fs.writeFileSync(filepath, content);
        updated++;
      }
    }
  }

  return updated;
}

/**
 * Check for broken internal links
 */
function checkLinks() {
  const broken = [];

  const files = fs.readdirSync(DOCS_DIR)
    .filter(f => f.endsWith('.md'));

  const existingPages = files.map(f => f.replace('.md', ''));

  for (const file of files) {
    const filepath = path.join(DOCS_DIR, file);
    const content = fs.readFileSync(filepath, 'utf-8');

    // Find markdown links
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;

    while ((match = linkPattern.exec(content)) !== null) {
      const [, , link] = match;

      // Check internal links (no http/https)
      if (!link.startsWith('http') && !link.startsWith('#')) {
        const targetPage = link.replace(/\.md$/, '').replace(/^\//, '');

        if (!existingPages.includes(targetPage) &&
            !fs.existsSync(path.join(DOCS_DIR, link)) &&
            !link.startsWith('images/')) {
          broken.push({ file, link });
        }
      }
    }
  }

  return broken;
}

/**
 * Check screenshots exist
 */
function checkScreenshots() {
  const imagesDir = path.join(DOCS_DIR, 'images');
  const missing = [];

  if (!fs.existsSync(imagesDir)) {
    return { missing: ['images directory not found'], existing: 0 };
  }

  const files = fs.readdirSync(DOCS_DIR)
    .filter(f => f.endsWith('.md'));

  const existingImages = fs.readdirSync(imagesDir)
    .filter(f => f.endsWith('.png') || f.endsWith('.jpg'));

  for (const file of files) {
    const filepath = path.join(DOCS_DIR, file);
    const content = fs.readFileSync(filepath, 'utf-8');

    // Find image references
    const imagePattern = /!\[([^\]]*)\]\(images\/([^)]+)\)/g;
    let match;

    while ((match = imagePattern.exec(content)) !== null) {
      const [, , imagePath] = match;
      if (!existingImages.includes(imagePath)) {
        missing.push({ file, image: imagePath });
      }
    }
  }

  return { missing, existing: existingImages.length };
}

/**
 * Main function
 */
async function main() {
  console.log('TLC Documentation Maintenance\n');
  console.log('═'.repeat(50));

  const version = getVersion();
  console.log(`\nVersion: ${version}`);

  // Screenshots only mode
  if (screenshotsOnly) {
    console.log('\nRegenerating screenshots...');
    require('./generate-screenshots.js');
    return;
  }

  // Check commands
  console.log('\n📚 Commands');
  const { missing, total } = checkCommandDocs();
  console.log(`  ${total} commands found`);
  if (missing.length > 0) {
    console.log(`  ⚠ ${missing.length} missing from command-reference.md:`);
    missing.forEach(cmd => console.log(`    - /tlc:${cmd.name}`));
  } else {
    console.log('  ✓ All commands documented');
  }

  // Check versions
  console.log('\n🏷️ Versions');
  const updated = updateVersions();
  if (checkOnly) {
    console.log(`  ${updated > 0 ? '⚠' : '✓'} ${updated} files need version update`);
  } else {
    console.log(`  ✓ ${updated} files updated to v${version}`);
  }

  // Check links
  console.log('\n🔗 Links');
  const brokenLinks = checkLinks();
  if (brokenLinks.length > 0) {
    console.log(`  ⚠ ${brokenLinks.length} broken links:`);
    brokenLinks.forEach(({ file, link }) => console.log(`    ${file}: ${link}`));
  } else {
    console.log('  ✓ All internal links valid');
  }

  // Check screenshots
  console.log('\n📸 Screenshots');
  const { missing: missingImages, existing } = checkScreenshots();
  console.log(`  ${existing} screenshots found`);
  if (missingImages.length > 0) {
    console.log(`  ⚠ ${missingImages.length} missing screenshots:`);
    missingImages.forEach(({ file, image }) => console.log(`    ${file}: ${image}`));
  } else {
    console.log('  ✓ All referenced screenshots exist');
  }

  // Summary
  console.log('\n' + '═'.repeat(50));

  const issues = missing.length + brokenLinks.length + missingImages.length;
  if (issues > 0) {
    console.log(`\n⚠ ${issues} issue(s) found`);
    if (!checkOnly) {
      console.log('Run with --check to see issues without making changes');
    }
  } else {
    console.log('\n✓ Documentation is up to date!');
  }
}

main().catch(console.error);
