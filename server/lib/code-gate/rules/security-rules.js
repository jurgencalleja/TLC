/**
 * Security Rules
 *
 * Detects eval(), innerHTML, SQL injection patterns,
 * disabled security headers, and other security anti-patterns.
 *
 * @module code-gate/rules/security-rules
 */

/**
 * Check if a file is a test file.
 * @param {string} filePath
 * @returns {boolean}
 */
function isTestFile(filePath) {
  return /\.(test|spec)\.[jt]sx?$/.test(filePath) || filePath.includes('__tests__');
}

/**
 * Check for eval(), new Function(), and string-based setTimeout/setInterval.
 *
 * @param {string} filePath
 * @param {string} content
 * @returns {Array<{severity: string, rule: string, line: number, message: string, fix: string}>}
 */
function checkEvalUsage(filePath, content) {
  if (isTestFile(filePath)) return [];
  const findings = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

    // eval()
    if (/\beval\s*\(/.test(line)) {
      findings.push({
        severity: 'block',
        rule: 'no-eval',
        line: i + 1,
        message: 'eval() is a code injection risk',
        fix: 'Use JSON.parse() for data, or a safe parser for expressions',
      });
    }

    // new Function()
    if (/new\s+Function\s*\(/.test(line)) {
      findings.push({
        severity: 'block',
        rule: 'no-eval',
        line: i + 1,
        message: 'new Function() is equivalent to eval()',
        fix: 'Use a safe alternative to dynamic code execution',
      });
    }

    // setTimeout/setInterval with string argument
    if (/(?:setTimeout|setInterval)\s*\(\s*['"`]/.test(line)) {
      findings.push({
        severity: 'block',
        rule: 'no-eval',
        line: i + 1,
        message: 'setTimeout/setInterval with string argument executes code via eval',
        fix: 'Pass a function reference instead of a string',
      });
    }
  }

  return findings;
}

/**
 * Check for innerHTML, outerHTML, and dangerouslySetInnerHTML.
 *
 * @param {string} filePath
 * @param {string} content
 * @returns {Array}
 */
function checkInnerHtml(filePath, content) {
  if (isTestFile(filePath)) return [];
  const findings = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

    if (/\.innerHTML\s*=/.test(line)) {
      findings.push({
        severity: 'block',
        rule: 'no-inner-html',
        line: i + 1,
        message: 'innerHTML assignment is an XSS risk',
        fix: 'Use textContent, or sanitize with DOMPurify',
      });
    }

    if (/\.outerHTML\s*=/.test(line)) {
      findings.push({
        severity: 'block',
        rule: 'no-inner-html',
        line: i + 1,
        message: 'outerHTML assignment is an XSS risk',
        fix: 'Use DOM APIs to construct elements safely',
      });
    }

    if (/dangerouslySetInnerHTML/.test(line)) {
      findings.push({
        severity: 'block',
        rule: 'no-inner-html',
        line: i + 1,
        message: 'dangerouslySetInnerHTML bypasses React XSS protection',
        fix: 'Use a sanitization library or render content safely',
      });
    }
  }

  return findings;
}

/**
 * Check for SQL injection via string concatenation or template literals.
 *
 * @param {string} filePath
 * @param {string} content
 * @returns {Array}
 */
function checkSqlInjection(filePath, content) {
  if (isTestFile(filePath)) return [];
  const findings = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

    // SQL keyword followed by string concatenation
    const sqlConcat = /['"`](?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)\b[^'"`]*['"`]\s*\+/i;
    if (sqlConcat.test(line)) {
      findings.push({
        severity: 'block',
        rule: 'no-sql-injection',
        line: i + 1,
        message: 'SQL query built with string concatenation',
        fix: 'Use parameterized queries ($1, ?) instead',
      });
    }

    // SQL keyword in template literal with interpolation
    const sqlTemplate = /`(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)\b[^`]*\$\{/i;
    if (sqlTemplate.test(line)) {
      findings.push({
        severity: 'block',
        rule: 'no-sql-injection',
        line: i + 1,
        message: 'SQL query built with template literal interpolation',
        fix: 'Use parameterized queries ($1, ?) instead',
      });
    }
  }

  return findings;
}

/**
 * Check for disabled security controls.
 *
 * @param {string} filePath
 * @param {string} content
 * @returns {Array}
 */
function checkDisabledSecurity(filePath, content) {
  if (isTestFile(filePath)) return [];
  const findings = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

    // NODE_TLS_REJECT_UNAUTHORIZED = "0"
    if (/NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"`]0['"`]/.test(line)) {
      findings.push({
        severity: 'block',
        rule: 'no-disabled-security',
        line: i + 1,
        message: 'TLS certificate verification disabled',
        fix: 'Use proper certificates instead of disabling verification',
      });
    }

    // rejectUnauthorized: false
    if (/rejectUnauthorized\s*:\s*false/.test(line)) {
      findings.push({
        severity: 'block',
        rule: 'no-disabled-security',
        line: i + 1,
        message: 'TLS certificate verification disabled',
        fix: 'Use proper certificates instead of disabling verification',
      });
    }

    // CORS wildcard origin
    if (/origin\s*:\s*['"`]\*['"`]/.test(line)) {
      findings.push({
        severity: 'block',
        rule: 'no-disabled-security',
        line: i + 1,
        message: 'CORS allows all origins (*)',
        fix: 'Specify allowed origins explicitly',
      });
    }
  }

  return findings;
}

module.exports = {
  checkEvalUsage,
  checkInnerHtml,
  checkSqlInjection,
  checkDisabledSecurity,
};
