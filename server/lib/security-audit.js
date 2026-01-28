/**
 * Security Audit Module
 * Parses security audit output from npm/pip and generates reports
 */

/**
 * Parse npm audit JSON output
 * @param {string} output - JSON string from `npm audit --json`
 * @returns {Object|null} Parsed audit result
 */
function parseNpmAuditOutput(output) {
  try {
    const data = JSON.parse(output);

    const vulnerabilities = [];

    if (data.vulnerabilities) {
      for (const [name, vuln] of Object.entries(data.vulnerabilities)) {
        const via = vuln.via || [];
        const firstVia = via[0] || {};

        vulnerabilities.push({
          package: name,
          severity: vuln.severity || 'unknown',
          title: typeof firstVia === 'object' ? firstVia.title : String(firstVia),
          url: typeof firstVia === 'object' ? firstVia.url : null,
          fixAvailable: !!vuln.fixAvailable,
          fixVersion: vuln.fixAvailable?.version || null,
        });
      }
    }

    const meta = data.metadata?.vulnerabilities || {};

    return {
      vulnerabilities,
      summary: {
        total: meta.total || vulnerabilities.length,
        critical: meta.critical || 0,
        high: meta.high || 0,
        moderate: meta.moderate || 0,
        low: meta.low || 0,
      },
    };
  } catch (e) {
    return null;
  }
}

/**
 * Parse pip-audit JSON output
 * @param {string} output - JSON string from `pip-audit --format json`
 * @returns {Object} Parsed audit result
 */
function parsePipAuditOutput(output) {
  try {
    const data = JSON.parse(output);

    const vulnerabilities = [];

    for (const pkg of data) {
      for (const vuln of pkg.vulns || []) {
        vulnerabilities.push({
          package: pkg.name,
          currentVersion: pkg.version,
          severity: vuln.severity || 'unknown',
          id: vuln.id,
          title: vuln.description || vuln.id,
          fixVersion: vuln.fix_versions?.[0] || null,
          fixAvailable: (vuln.fix_versions?.length || 0) > 0,
        });
      }
    }

    return {
      vulnerabilities,
      summary: {
        total: vulnerabilities.length,
        critical: vulnerabilities.filter(v => v.severity === 'critical').length,
        high: vulnerabilities.filter(v => v.severity === 'high').length,
        moderate: vulnerabilities.filter(v => v.severity === 'moderate').length,
        low: vulnerabilities.filter(v => v.severity === 'low').length,
      },
    };
  } catch (e) {
    return { vulnerabilities: [], summary: { total: 0 } };
  }
}

/**
 * Categorize vulnerabilities by severity
 * @param {Array} vulnerabilities - Array of vulnerability objects
 * @returns {Object} Vulnerabilities grouped by severity
 */
function categorizeBySeverity(vulnerabilities) {
  return {
    critical: vulnerabilities.filter(v => v.severity === 'critical'),
    high: vulnerabilities.filter(v => v.severity === 'high'),
    moderate: vulnerabilities.filter(v => v.severity === 'moderate'),
    low: vulnerabilities.filter(v => v.severity === 'low'),
  };
}

/**
 * Compare semver versions to determine if it's a major bump
 * @param {string} current - Current version
 * @param {string} target - Target version
 * @returns {boolean} True if major version change
 */
function isMajorBump(current, target) {
  if (!current || !target) return false;

  const currentMajor = parseInt(current.split('.')[0], 10);
  const targetMajor = parseInt(target.split('.')[0], 10);

  return targetMajor > currentMajor;
}

/**
 * Generate fix suggestions for a vulnerability
 * @param {Object} vuln - Vulnerability object
 * @param {string} packageManager - 'npm' or 'pip'
 * @returns {Object} Fix suggestion
 */
function generateFixSuggestions(vuln, packageManager) {
  if (!vuln.fixAvailable) {
    return {
      command: null,
      safe: false,
      reason: 'no fix available - consider alternative package',
    };
  }

  const majorBump = isMajorBump(vuln.currentVersion, vuln.fixVersion);

  if (packageManager === 'npm') {
    const cmd = vuln.fixVersion
      ? `npm install ${vuln.package}@${vuln.fixVersion}`
      : `npm audit fix`;

    return {
      command: cmd,
      safe: !majorBump,
      reason: majorBump ? 'major version bump - may contain breaking changes' : 'safe update',
    };
  }

  if (packageManager === 'pip') {
    const cmd = vuln.fixVersion
      ? `pip install ${vuln.package}==${vuln.fixVersion}`
      : `pip install --upgrade ${vuln.package}`;

    return {
      command: cmd,
      safe: !majorBump,
      reason: majorBump ? 'major version bump - may contain breaking changes' : 'safe update',
    };
  }

  return {
    command: null,
    safe: false,
    reason: 'unknown package manager',
  };
}

/**
 * Format security audit report for CLI output
 * @param {Object} auditResult - Parsed audit result
 * @returns {string} Formatted report
 */
function formatSecurityReport(auditResult) {
  const { vulnerabilities, summary } = auditResult;
  const lines = [];

  lines.push('');
  lines.push('Security Audit Report');
  lines.push('═════════════════════');
  lines.push('');

  if (vulnerabilities.length === 0) {
    lines.push('✅ No vulnerabilities found!');
    lines.push('');
    return lines.join('\n');
  }

  // Summary
  lines.push(`Found ${summary.total} vulnerabilities:`);
  if (summary.critical > 0) lines.push(`  🔴 Critical: ${summary.critical}`);
  if (summary.high > 0) lines.push(`  🟠 High: ${summary.high}`);
  if (summary.moderate > 0) lines.push(`  🟡 Moderate: ${summary.moderate}`);
  if (summary.low > 0) lines.push(`  🟢 Low: ${summary.low}`);
  lines.push('');

  // Group by severity
  const grouped = categorizeBySeverity(vulnerabilities);

  // Critical first
  if (grouped.critical.length > 0) {
    lines.push('CRITICAL:');
    for (const v of grouped.critical) {
      lines.push(`  ⚠️  ${v.package} - ${v.title}`);
      if (v.fixVersion) lines.push(`      Fix: upgrade to ${v.fixVersion}`);
    }
    lines.push('');
  }

  // High
  if (grouped.high.length > 0) {
    lines.push('HIGH:');
    for (const v of grouped.high) {
      lines.push(`  ⚠️  ${v.package} - ${v.title}`);
      if (v.fixVersion) lines.push(`      Fix: upgrade to ${v.fixVersion}`);
    }
    lines.push('');
  }

  // Moderate
  if (grouped.moderate.length > 0) {
    lines.push('MODERATE:');
    for (const v of grouped.moderate) {
      lines.push(`  ⚠  ${v.package} - ${v.title}`);
    }
    lines.push('');
  }

  // Low
  if (grouped.low.length > 0) {
    lines.push('LOW:');
    for (const v of grouped.low) {
      lines.push(`  ℹ  ${v.package} - ${v.title}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

module.exports = {
  parseNpmAuditOutput,
  parsePipAuditOutput,
  categorizeBySeverity,
  generateFixSuggestions,
  formatSecurityReport,
};
