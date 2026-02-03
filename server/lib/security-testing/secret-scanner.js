/**
 * Secret Scanner - GitLeaks secret scanning
 */

// Default patterns for secret detection
const DEFAULT_PATTERNS = [
  { name: 'api_key', regex: /(?:api[_-]?key|apikey)\s*[=:]\s*['"]?([a-zA-Z0-9_-]{16,})['"]?/i },
  { name: 'aws_access_key', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'aws_secret_key', regex: /(?:aws[_-]?secret|secret[_-]?key)\s*[=:]\s*['"]?([a-zA-Z0-9/+=]{40})['"]?/i },
  { name: 'private_key', regex: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/ },
  { name: 'github_token', regex: /ghp_[a-zA-Z0-9]{36}/ },
  { name: 'generic_secret', regex: /(?:secret|password|passwd|pwd)\s*[=:]\s*['"]?([a-zA-Z0-9!@#$%^&*()_+-=]{8,})['"]?/i }
];

/**
 * Run GitLeaks scan
 * @param {Object} options - Scan options
 * @param {string} options.path - Path to scan
 * @param {Function} options.exec - Exec function for running commands
 * @returns {Promise<Array>} Scan findings
 */
export async function runGitleaks({ path, exec }) {
  const command = `gitleaks detect --source ${path} --report-format json`;
  const { stdout } = await exec(command);
  return JSON.parse(stdout);
}

/**
 * Scan commit history for secrets
 * @param {Object} options - Scan options
 * @param {number} options.depth - Number of commits to scan
 * @param {Function} options.exec - Exec function for running commands
 * @returns {Promise<Array>} Scan findings
 */
export async function scanHistory({ depth, exec }) {
  const command = `gitleaks detect --log-opts="-n ${depth}" --report-format json`;
  const { stdout } = await exec(command);
  return JSON.parse(stdout);
}

/**
 * Detect secret patterns in content
 * @param {string} content - Content to scan
 * @param {Array} customPatterns - Additional patterns to check
 * @returns {Array} Detected secrets
 */
export function detectPatterns(content, customPatterns = []) {
  const findings = [];
  const patterns = [...DEFAULT_PATTERNS, ...customPatterns];

  for (const pattern of patterns) {
    const matches = content.match(pattern.regex);
    if (matches) {
      findings.push({
        type: pattern.name,
        match: matches[0],
        pattern: pattern.name
      });
    }
  }

  return findings;
}

/**
 * Generate findings report
 * @param {Array} findings - List of findings
 * @returns {string} Formatted report
 */
export function generateReport(findings) {
  if (findings.length === 0) {
    return 'No secrets detected.';
  }

  let report = '# Secret Scan Report\n\n';
  report += `Found ${findings.length} potential secret(s):\n\n`;

  for (const finding of findings) {
    report += `## ${finding.type}\n`;
    report += `- **File:** ${finding.file}\n`;
    report += `- **Line:** ${finding.line}\n`;
    report += `- **Type:** ${finding.type}\n`;
    report += '\n';
  }

  return report;
}

/**
 * Create a secret scanner instance
 * @param {Object} options - Scanner options
 * @param {Array} options.allowlist - Patterns to ignore
 * @returns {Object} Secret scanner instance
 */
export function createSecretScanner(options = {}) {
  const { allowlist = [] } = options;
  const customPatterns = [];

  return {
    /**
     * Scan content or path for secrets
     * @param {Object} scanOptions - Scan options
     * @returns {Array} Findings
     */
    scan(scanOptions) {
      const { content, path, exec } = scanOptions;

      if (content) {
        const findings = detectPatterns(content, customPatterns);
        // Filter out allowlisted patterns
        return findings.filter(f => {
          const matchValue = f.match;
          return !allowlist.some(allowed => matchValue.includes(allowed));
        });
      }

      return [];
    },

    /**
     * Scan commit history
     * @param {Object} historyOptions - History scan options
     * @returns {Promise<Array>} Findings
     */
    async scanHistory(historyOptions) {
      const { depth = 100, exec } = historyOptions;
      if (exec) {
        return await scanHistory({ depth, exec });
      }
      return [];
    },

    /**
     * Add a custom pattern
     * @param {Object} pattern - Pattern configuration
     */
    addPattern(pattern) {
      customPatterns.push(pattern);
    },

    /**
     * Get all patterns (default + custom)
     * @returns {Array} All patterns
     */
    getPatterns() {
      // Return array with same object references for pattern matching
      const allPatterns = [];
      for (const p of DEFAULT_PATTERNS) allPatterns.push(p);
      for (const p of customPatterns) allPatterns.push(p);
      return allPatterns;
    }
  };
}
