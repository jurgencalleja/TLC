/**
 * Quality Rules
 *
 * Detects hardcoded values, oversized functions, console.log leftovers,
 * TODO/FIXME without issue references, and other code quality issues.
 *
 * Each check function accepts (filePath, content) and returns an array
 * of findings: { severity, rule, line, message, fix }
 *
 * @module code-gate/rules/quality-rules
 */

/**
 * Check if a file is a test file (skip quality checks for tests).
 * @param {string} filePath
 * @returns {boolean}
 */
function isTestFile(filePath) {
  return /\.(test|spec)\.[jt]sx?$/.test(filePath) || filePath.includes('__tests__');
}

/**
 * Get the line number for a character offset in content.
 * @param {string} content
 * @param {number} offset
 * @returns {number}
 */
function lineAt(content, offset) {
  return content.substring(0, offset).split('\n').length;
}

/**
 * Check for hardcoded URLs, IPs, and ports.
 *
 * @param {string} filePath - File path
 * @param {string} content - File content
 * @returns {Array<{severity: string, rule: string, line: number, message: string, fix: string}>}
 */
function checkHardcodedUrls(filePath, content) {
  if (isTestFile(filePath)) return [];
  const findings = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      continue;
    }

    // Hardcoded http/https URLs
    const urlMatch = line.match(/['"`](https?:\/\/[^'"`]+)['"`]/);
    if (urlMatch) {
      findings.push({
        severity: 'block',
        rule: 'no-hardcoded-urls',
        line: i + 1,
        message: `Hardcoded URL: ${urlMatch[1]}`,
        fix: 'Use process.env or config for URLs',
      });
    }

    // Hardcoded IP addresses
    const ipMatch = line.match(/['"`](\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})['"`]/);
    if (ipMatch && !urlMatch) {
      findings.push({
        severity: 'block',
        rule: 'no-hardcoded-urls',
        line: i + 1,
        message: `Hardcoded IP: ${ipMatch[1]}`,
        fix: 'Use process.env or config for host addresses',
      });
    }

    // Hardcoded port assignments (const port = 3000)
    const portMatch = line.match(/\b(?:const|let|var)\s+port\s*=\s*(\d+)/);
    if (portMatch) {
      findings.push({
        severity: 'block',
        rule: 'no-hardcoded-urls',
        line: i + 1,
        message: `Hardcoded port: ${portMatch[1]}`,
        fix: 'Use process.env.PORT or config',
      });
    }
  }

  return findings;
}

/**
 * Check for hardcoded secrets, API keys, tokens, and passwords.
 *
 * @param {string} filePath - File path
 * @param {string} content - File content
 * @returns {Array}
 */
function checkHardcodedSecrets(filePath, content) {
  if (isTestFile(filePath)) return [];
  const findings = [];
  const lines = content.split('\n');

  const secretPatterns = [
    { pattern: /(?:api[_-]?key|apikey)\s*=\s*['"`]([^'"`]{8,})['"`]/i, label: 'API key' },
    { pattern: /(?:password|passwd|pwd)\s*=\s*['"`]([^'"`]+)['"`]/i, label: 'password' },
    { pattern: /(?:secret|token)\s*=\s*['"`]([^'"`]{8,})['"`]/i, label: 'token/secret' },
    { pattern: /['"`](eyJ[A-Za-z0-9_-]+\.)/i, label: 'JWT token' },
    { pattern: /['"`](sk-[a-zA-Z0-9]{20,})['"`]/, label: 'API key' },
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments and env references
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
    if (line.includes('process.env')) continue;

    for (const { pattern, label } of secretPatterns) {
      if (pattern.test(line)) {
        findings.push({
          severity: 'block',
          rule: 'no-hardcoded-secrets',
          line: i + 1,
          message: `Hardcoded ${label} detected`,
          fix: 'Use environment variables or a secrets manager',
        });
        break; // One finding per line is enough
      }
    }
  }

  return findings;
}

/**
 * Check for console.log/warn/debug left in production code.
 * console.error is allowed.
 *
 * @param {string} filePath
 * @param {string} content
 * @returns {Array}
 */
function checkConsoleLogs(filePath, content) {
  if (isTestFile(filePath)) return [];
  const findings = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) continue;

    const match = line.match(/console\.(log|warn|debug|info)\s*\(/);
    if (match) {
      findings.push({
        severity: 'warn',
        rule: 'no-console-log',
        line: i + 1,
        message: `console.${match[1]}() found in production code`,
        fix: 'Use a proper logger or remove debug output',
      });
    }
  }

  return findings;
}

/**
 * Check for functions exceeding the maximum line count.
 *
 * @param {string} filePath
 * @param {string} content
 * @param {Object} [options]
 * @param {number} [options.maxLines=50]
 * @returns {Array}
 */
function checkFunctionLength(filePath, content, options = {}) {
  const maxLines = options.maxLines || 50;
  const findings = [];
  const lines = content.split('\n');
  let braceDepth = 0;
  let funcStart = -1;
  let funcName = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect function start
    if (funcStart === -1) {
      const funcMatch = line.match(/(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)|[^=])\s*=>)\s*\{?/);
      if (funcMatch) {
        funcName = funcMatch[1] || funcMatch[2] || 'anonymous';
        if (line.includes('{')) {
          funcStart = i;
          braceDepth = 0;
          // Count braces on this line
          for (const ch of line) {
            if (ch === '{') braceDepth++;
            if (ch === '}') braceDepth--;
          }
          if (braceDepth <= 0) {
            // One-liner function
            funcStart = -1;
          }
          continue;
        }
      }
    }

    if (funcStart >= 0) {
      for (const ch of line) {
        if (ch === '{') braceDepth++;
        if (ch === '}') braceDepth--;
      }

      if (braceDepth <= 0) {
        const length = i - funcStart + 1;
        if (length > maxLines) {
          findings.push({
            severity: 'warn',
            rule: 'max-function-length',
            line: funcStart + 1,
            message: `Function '${funcName}' is ${length} lines (max: ${maxLines})`,
            fix: 'Extract helper functions to reduce complexity',
          });
        }
        funcStart = -1;
        funcName = '';
      }
    }
  }

  return findings;
}

/**
 * Check if file exceeds maximum line count.
 *
 * @param {string} filePath
 * @param {string} content
 * @param {Object} [options]
 * @param {number} [options.maxLines=300]
 * @returns {Array}
 */
function checkFileLength(filePath, content, options = {}) {
  const maxLines = options.maxLines || 300;
  const lineCount = content.split('\n').length;

  if (lineCount > maxLines) {
    return [{
      severity: 'warn',
      rule: 'max-file-length',
      line: 1,
      message: `File is ${lineCount} lines (max: ${maxLines})`,
      fix: 'Split into smaller, focused modules',
    }];
  }
  return [];
}

/**
 * Check for TODO/FIXME/HACK comments without issue references.
 * Valid references: (#123), [JIRA-456], (PROJ-789)
 *
 * @param {string} filePath
 * @param {string} content
 * @returns {Array}
 */
function checkTodoWithoutRef(filePath, content) {
  const findings = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/\/\/\s*(TODO|FIXME|HACK)\b/i);
    if (match) {
      // Check if there's an issue reference after the tag
      const hasRef = /[#(\[][A-Z0-9_-]+[\])]/i.test(line);
      if (!hasRef) {
        findings.push({
          severity: 'warn',
          rule: 'todo-needs-ref',
          line: i + 1,
          message: `${match[1]} without issue reference`,
          fix: `Add issue reference: // ${match[1]}(#123): description`,
        });
      }
    }
  }

  return findings;
}

module.exports = {
  checkHardcodedUrls,
  checkHardcodedSecrets,
  checkConsoleLogs,
  checkFunctionLength,
  checkFileLength,
  checkTodoWithoutRef,
};
