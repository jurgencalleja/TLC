/**
 * Secure Code Command Module
 *
 * CLI for secure code generation and security scanning
 */

const path = require('path');
const { detectHardcodedSecrets, generateSecureRandom } = require('./crypto-patterns.js');
const { generateValidationCode } = require('./input-validator.js');
const { generateCspHeader, generateEncodingCode } = require('./output-encoder.js');
const { generateAuthCode } = require('./secure-auth.js');
const { generateCorsConfig } = require('./access-control.js');
const { generateErrorHandler } = require('./secure-errors.js');

/**
 * Parse command line arguments
 * @param {string} input - Command input
 * @returns {Object} Parsed arguments
 */
function parseArgs(input) {
  const parts = input.split(/\s+/);
  const result = {
    command: parts[0] || 'scan',
  };

  let i = 1;

  // Handle subcommand or path
  if (parts[1] && !parts[1].startsWith('--')) {
    if (parts[0] === 'generate') {
      result.subcommand = parts[1];
      i = 2;
    } else if (parts[0] === 'check') {
      result.checkType = parts[1];
      if (parts[2] && !parts[2].startsWith('--')) {
        result.path = parts[2];
        i = 3;
      } else {
        i = 2;
      }
    } else {
      result.path = parts[1];
      i = 2;
    }
  }

  // Parse flags
  while (i < parts.length) {
    const part = parts[i];

    if (part === '--type' && parts[i + 1]) {
      result.type = parts[i + 1];
      i += 2;
    } else if (part === '--format' && parts[i + 1]) {
      result.format = parts[i + 1];
      i += 2;
    } else if (part === '--framework' && parts[i + 1]) {
      result.framework = parts[i + 1];
      i += 2;
    } else if (part === '--language' && parts[i + 1]) {
      result.language = parts[i + 1];
      i += 2;
    } else if (part === '--features' && parts[i + 1]) {
      result.features = parts[i + 1].split(',');
      i += 2;
    } else if (part === '--origins' && parts[i + 1]) {
      result.origins = parts[i + 1];
      i += 2;
    } else if (part === '--category' && parts[i + 1]) {
      result.category = parts[i + 1];
      i += 2;
    } else if (part === '--diff') {
      result.diff = true;
      i++;
    } else {
      i++;
    }
  }

  return result;
}

/**
 * Format security report
 * @param {Array} issues - Security issues
 * @param {Object} options - Formatting options
 * @returns {string} Formatted report
 */
function formatSecurityReport(issues, options = {}) {
  const { showRemediation = false, showSummary = false } = options;

  const lines = [
    'Security Scan Report',
    '═'.repeat(50),
    '',
  ];

  // Group by severity
  const bySeverity = {
    critical: issues.filter(i => i.severity === 'critical'),
    high: issues.filter(i => i.severity === 'high'),
    medium: issues.filter(i => i.severity === 'medium'),
    low: issues.filter(i => i.severity === 'low'),
  };

  if (showSummary) {
    lines.push('Summary:');
    lines.push(`  Critical: ${bySeverity.critical.length}`);
    lines.push(`  High: ${bySeverity.high.length}`);
    lines.push(`  Medium: ${bySeverity.medium.length}`);
    lines.push(`  Low: ${bySeverity.low.length}`);
    lines.push('');
  }

  for (const [severity, severityIssues] of Object.entries(bySeverity)) {
    if (severityIssues.length === 0) continue;

    lines.push(`[${severity.toUpperCase()}] (${severityIssues.length} issues)`);

    for (const issue of severityIssues) {
      const typeStr = issue.type || 'unknown';
      lines.push(`  • ${typeStr} - severity: ${severity}`);
      if (issue.file) {
        lines.push(`    File: ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
      }
      if (showRemediation && issue.suggestion) {
        lines.push(`    suggestion: ${issue.suggestion}`);
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Secure Code Command class
 */
class SecureCodeCommand {
  constructor() {
    this._readFile = null;
    this._listFiles = null;
  }

  /**
   * Execute a command
   * @param {string} input - Command input
   * @returns {Promise<Object>} Execution result
   */
  async execute(input) {
    const args = parseArgs(input);

    switch (args.command) {
      case 'scan':
        return this.executeScan(args);

      case 'generate':
        return this.executeGenerate(args);

      case 'fix':
        return this.executeFix(args);

      case 'audit':
        return this.executeAudit(args);

      case 'check':
        return this.executeCheck(args);

      default:
        return {
          success: false,
          output: `Unknown command: ${args.command}`,
        };
    }
  }

  /**
   * Scan file for security issues
   */
  async executeScan(args) {
    try {
      const code = await this._readFile(args.path);
      const issues = this.analyzeCode(code);

      return {
        success: true,
        issues,
        output: formatSecurityReport(issues),
      };
    } catch (error) {
      return {
        success: false,
        issues: [],
        error: error.message,
      };
    }
  }

  /**
   * Analyze code for security issues
   */
  analyzeCode(code) {
    const issues = [];

    // Check for hardcoded secrets
    const secretsResult = detectHardcodedSecrets(code);
    if (secretsResult.found) {
      for (const secret of secretsResult.secrets) {
        issues.push({
          type: 'hardcoded-secret',
          severity: 'critical',
          subtype: secret.type,
        });
      }
    }

    // Check for SQL injection
    if (/["']\s*\+\s*(?:req\.|params\.|query\.|body\.)/i.test(code) &&
        /query\s*\(/i.test(code)) {
      issues.push({
        type: 'sql-injection',
        severity: 'critical',
      });
    }

    // Check for XSS
    if (/res\.send\s*\(\s*['"`][^'"`]*['"]\s*\+/i.test(code) ||
        /innerHTML\s*=\s*[^;]+\+/i.test(code)) {
      issues.push({
        type: 'xss',
        severity: 'high',
      });
    }

    // Check for command injection
    if (/exec\s*\(\s*['"`][^'"`]*['"]\s*\+/i.test(code) ||
        /spawn\s*\(\s*['"`][^'"`]*['"]\s*\+/i.test(code)) {
      issues.push({
        type: 'command-injection',
        severity: 'critical',
      });
    }

    return issues;
  }

  /**
   * Generate secure code
   */
  async executeGenerate(args) {
    const { subcommand, type, framework, language, features = [], origins } = args;

    let code = '';
    let resultFramework = framework;

    switch (subcommand) {
      case 'input-validation':
        code = generateValidationCode({
          type: type || 'email',
          language: language || 'javascript',
        });
        break;

      case 'auth':
        code = generateAuthCode({
          language: language || 'javascript',
          features: features,
        });
        break;

      case 'error-handler':
        code = generateErrorHandler({
          framework: framework || 'express',
          language: language || 'javascript',
        });
        break;

      case 'csp':
        const csp = generateCspHeader({});
        code = csp.headerValue || csp.toString();
        break;

      case 'cors':
        const corsConfig = generateCorsConfig({
          origins: origins ? origins.split(',') : ['https://example.com'],
        });
        code = corsConfig.code;
        break;

      default:
        code = '// Secure code template';
    }

    return {
      success: true,
      code,
      framework: resultFramework,
    };
  }

  /**
   * Fix security issues
   */
  async executeFix(args) {
    try {
      const code = await this._readFile(args.path);
      let fixed = code;

      if (args.type === 'hardcoded-secret') {
        // Replace hardcoded secrets with env vars
        fixed = fixed.replace(
          /const\s+(\w+)\s*=\s*['"][^'"]+['"]/g,
          (match, name) => {
            const envName = name.toUpperCase().replace(/([a-z])([A-Z])/g, '$1_$2');
            return `const ${name} = process.env.${envName}`;
          }
        );
      }

      if (args.type === 'sql-injection') {
        // Replace string concatenation with parameterized query
        fixed = fixed.replace(
          /query\s*\(\s*["']([^"']*)['"]\s*\+\s*(\w+)/g,
          (match, query, param) => {
            return `query("${query}$1", [${param}]`;
          }
        );
      }

      if (args.type === 'xss') {
        // Add encoding
        fixed = fixed.replace(
          /res\.send\s*\(\s*['"]([^'"]*)['"]\s*\+\s*(\w+)/g,
          (match, str, param) => {
            return `res.send('${str}' + escapeHtml(${param})`;
          }
        );
      }

      const result = {
        success: true,
        fixed,
      };

      // Always generate diff when requested
      if (args.diff) {
        const diffLines = [];
        const originalLines = code.split('\n');
        const fixedLines = fixed.split('\n');

        for (let i = 0; i < Math.max(originalLines.length, fixedLines.length); i++) {
          if (originalLines[i] !== fixedLines[i]) {
            if (originalLines[i]) diffLines.push(`- ${originalLines[i]}`);
            if (fixedLines[i]) diffLines.push(`+ ${fixedLines[i]}`);
          }
        }

        result.diff = diffLines.join('\n') || '(no changes)';
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate diff between original and fixed code
   */
  generateDiff(original, fixed) {
    const originalLines = original.split('\n');
    const fixedLines = fixed.split('\n');
    const diff = [];

    for (let i = 0; i < Math.max(originalLines.length, fixedLines.length); i++) {
      if (originalLines[i] !== fixedLines[i]) {
        if (originalLines[i]) diff.push(`- ${originalLines[i]}`);
        if (fixedLines[i]) diff.push(`+ ${fixedLines[i]}`);
      }
    }

    return diff.join('\n');
  }

  /**
   * Run full security audit
   */
  async executeAudit(args) {
    try {
      const files = await this._listFiles(args.path);
      const allIssues = [];

      for (const file of files) {
        if (!file.endsWith('.js') && !file.endsWith('.ts')) continue;

        try {
          const code = await this._readFile(path.join(args.path, file));
          const issues = this.analyzeCode(code);

          for (const issue of issues) {
            issue.file = file;
            allIssues.push(issue);
          }
        } catch {
          // Skip unreadable files
        }
      }

      const summary = {
        total: allIssues.length,
        critical: allIssues.filter(i => i.severity === 'critical').length,
        high: allIssues.filter(i => i.severity === 'high').length,
        medium: allIssues.filter(i => i.severity === 'medium').length,
        low: allIssues.filter(i => i.severity === 'low').length,
      };

      const result = {
        success: true,
        issues: allIssues,
        summary,
        output: formatSecurityReport(allIssues, { showSummary: true }),
      };

      if (args.format === 'sarif') {
        result.sarif = this.toSarif(allIssues);
        result.format = 'sarif';
      } else if (args.format === 'json') {
        result.format = 'json';
      }

      return result;
    } catch (error) {
      return {
        success: false,
        issues: [],
        summary: {},
        error: error.message,
      };
    }
  }

  /**
   * Convert issues to SARIF format
   */
  toSarif(issues) {
    return {
      version: '2.1.0',
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      runs: [
        {
          tool: {
            driver: {
              name: 'TLC Security Scanner',
              version: '1.0.0',
            },
          },
          results: issues.map(issue => ({
            ruleId: issue.type,
            level: issue.severity === 'critical' ? 'error' : issue.severity === 'high' ? 'warning' : 'note',
            message: {
              text: `Security issue: ${issue.type}`,
            },
            locations: issue.file ? [{
              physicalLocation: {
                artifactLocation: {
                  uri: issue.file,
                },
                region: {
                  startLine: issue.line || 1,
                },
              },
            }] : [],
          })),
        },
      ],
    };
  }

  /**
   * Check OWASP compliance
   */
  async executeCheck(args) {
    try {
      const files = await this._listFiles(args.path);
      const compliance = {
        A01: { name: 'Broken Access Control', issues: [] },
        A02: { name: 'Cryptographic Failures', issues: [] },
        A03: { name: 'Injection', issues: [] },
        A07: { name: 'Auth Failures', issues: [] },
      };

      for (const file of files) {
        if (!file.endsWith('.js') && !file.endsWith('.ts')) continue;

        try {
          const code = await this._readFile(path.join(args.path, file));

          // Check for each OWASP category
          if (/["']\s*\+\s*(?:req\.|params\.)/i.test(code)) {
            compliance.A03.issues.push({ file, type: 'injection' });
          }

          if (detectHardcodedSecrets(code).found) {
            compliance.A02.issues.push({ file, type: 'hardcoded-secret' });
          }
        } catch {
          // Skip
        }
      }

      const result = {
        success: true,
        compliance,
        category: args.category,
      };

      if (args.category) {
        result.categoryResult = compliance[args.category];
      }

      return result;
    } catch (error) {
      return {
        success: false,
        compliance: {},
        error: error.message,
      };
    }
  }
}

module.exports = {
  SecureCodeCommand,
  parseArgs,
  formatSecurityReport,
};
