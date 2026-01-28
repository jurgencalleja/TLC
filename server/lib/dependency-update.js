/**
 * Dependency Update Module
 * Parses outdated package info and generates update plans
 */

/**
 * Parse semver version into components
 * @param {string} version - Semver version string
 * @returns {Object} Parsed version {major, minor, patch}
 */
function parseVersion(version) {
  if (!version) return { major: 0, minor: 0, patch: 0 };

  // Remove pre-release suffix for comparison
  const clean = version.replace(/-.*$/, '');
  const parts = clean.split('.').map(p => parseInt(p, 10) || 0);

  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
  };
}

/**
 * Determine update type (major, minor, patch)
 * @param {string} current - Current version
 * @param {string} latest - Latest version
 * @returns {string} Update type
 */
function getUpdateType(current, latest) {
  const curr = parseVersion(current);
  const lat = parseVersion(latest);

  if (lat.major > curr.major) return 'major';
  if (lat.minor > curr.minor) return 'minor';
  return 'patch';
}

/**
 * Parse npm outdated JSON output
 * @param {string} output - JSON string from `npm outdated --json`
 * @returns {Object|null} Parsed outdated result
 */
function parseNpmOutdatedOutput(output) {
  try {
    const data = JSON.parse(output);
    const packages = [];

    for (const [name, info] of Object.entries(data)) {
      packages.push({
        name,
        current: info.current,
        wanted: info.wanted,
        latest: info.latest,
        updateType: getUpdateType(info.current, info.latest),
      });
    }

    return { packages };
  } catch (e) {
    return null;
  }
}

/**
 * Parse pip list --outdated JSON output
 * @param {string} output - JSON string from `pip list --outdated --format json`
 * @returns {Object} Parsed outdated result
 */
function parsePipOutdatedOutput(output) {
  try {
    const data = JSON.parse(output);
    const packages = data.map(pkg => ({
      name: pkg.name,
      current: pkg.version,
      latest: pkg.latest_version,
      updateType: getUpdateType(pkg.version, pkg.latest_version),
    }));

    return { packages };
  } catch (e) {
    return { packages: [] };
  }
}

/**
 * Categorize packages by update type
 * @param {Array} packages - Array of package info
 * @returns {Object} Packages grouped by update type
 */
function categorizeUpdates(packages) {
  return {
    major: packages.filter(p => p.updateType === 'major' || getUpdateType(p.current, p.latest) === 'major'),
    minor: packages.filter(p => p.updateType === 'minor' || getUpdateType(p.current, p.latest) === 'minor'),
    patch: packages.filter(p => p.updateType === 'patch' || getUpdateType(p.current, p.latest) === 'patch'),
  };
}

/**
 * Generate update plan with safe and breaking updates
 * @param {Array} packages - Array of package info
 * @param {string} packageManager - 'npm' or 'pip'
 * @returns {Object} Update plan
 */
function generateUpdatePlan(packages, packageManager) {
  const categorized = categorizeUpdates(packages);

  const safe = [...categorized.patch, ...categorized.minor];
  const breaking = categorized.major;

  let safeCommand = null;
  let breakingCommands = [];

  if (packageManager === 'npm') {
    if (safe.length > 0) {
      const pkgList = safe.map(p => `${p.name}@${p.latest}`).join(' ');
      safeCommand = `npm install ${pkgList}`;
    }
    breakingCommands = breaking.map(p => `npm install ${p.name}@${p.latest}`);
  } else if (packageManager === 'pip') {
    if (safe.length > 0) {
      const pkgList = safe.map(p => `${p.name}==${p.latest}`).join(' ');
      safeCommand = `pip install ${pkgList}`;
    }
    breakingCommands = breaking.map(p => `pip install ${p.name}==${p.latest}`);
  }

  return {
    safe,
    breaking,
    safeCommand,
    breakingCommands,
  };
}

/**
 * Format outdated packages report for CLI output
 * @param {Object} outdated - Parsed outdated result
 * @param {string} packageManager - 'npm' or 'pip'
 * @returns {string} Formatted report
 */
function formatOutdatedReport(outdated, packageManager = 'npm') {
  const { packages } = outdated;
  const lines = [];

  lines.push('');
  lines.push('Dependency Update Report');
  lines.push('════════════════════════');
  lines.push('');

  if (packages.length === 0) {
    lines.push('✅ All dependencies are up to date!');
    lines.push('');
    return lines.join('\n');
  }

  lines.push(`Found ${packages.length} outdated packages:`);
  lines.push('');

  const categorized = categorizeUpdates(packages);

  // Major updates (breaking)
  if (categorized.major.length > 0) {
    lines.push('⚠️  MAJOR updates (may contain breaking changes):');
    for (const pkg of categorized.major) {
      lines.push(`    ${pkg.name}: ${pkg.current} → ${pkg.latest}`);
    }
    lines.push('');
  }

  // Minor updates
  if (categorized.minor.length > 0) {
    lines.push('📦 Minor updates (new features):');
    for (const pkg of categorized.minor) {
      lines.push(`    ${pkg.name}: ${pkg.current} → ${pkg.latest}`);
    }
    lines.push('');
  }

  // Patch updates
  if (categorized.patch.length > 0) {
    lines.push('🔧 Patch updates (bug fixes):');
    for (const pkg of categorized.patch) {
      lines.push(`    ${pkg.name}: ${pkg.current} → ${pkg.latest}`);
    }
    lines.push('');
  }

  // Update commands
  const plan = generateUpdatePlan(packages, packageManager);

  if (plan.safe.length > 0) {
    lines.push('Safe to update:');
    lines.push(`  ${plan.safeCommand}`);
    lines.push('');
  }

  if (plan.breaking.length > 0) {
    lines.push('Requires review (major version):');
    for (const cmd of plan.breakingCommands) {
      lines.push(`  ${cmd}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

module.exports = {
  parseNpmOutdatedOutput,
  parsePipOutdatedOutput,
  categorizeUpdates,
  generateUpdatePlan,
  formatOutdatedReport,
};
