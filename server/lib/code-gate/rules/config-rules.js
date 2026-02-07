/**
 * Config Rules
 *
 * Detects magic numbers (hardcoded timeouts, durations, thresholds)
 * and hardcoded role strings that should live in config or database.
 *
 * Derived from Bug #18 (hardcoded role mappings) and Bug #23 (magic numbers).
 *
 * @module code-gate/rules/config-rules
 */

/**
 * @param {string} filePath
 * @returns {boolean}
 */
function isTestFile(filePath) {
  return /\.(test|spec)\.[jt]sx?$/.test(filePath) || filePath.includes('__tests__');
}

/**
 * @param {string} filePath
 * @returns {boolean}
 */
function isConfigFile(filePath) {
  const base = filePath.toLowerCase();
  return base.includes('config') || base.includes('constants') ||
         base.includes('.env') || base.endsWith('.json') ||
         base.endsWith('.yml') || base.endsWith('.yaml');
}

/** Numbers that are safe to hardcode (HTTP status codes, common values) */
const SAFE_NUMBERS = new Set([
  0, 1, 2, 3, 4, 5, 10, 24, 60, 100,
  200, 201, 204, 301, 302, 304, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503,
  1000, // 1 second in ms
  1024, 2048, 4096, // byte sizes
]);

/** Threshold above which a number is suspicious (1 minute in ms) */
const MAGIC_THRESHOLD = 60000;

/**
 * Detect large hardcoded numbers that look like timeouts or durations.
 * Numbers >= 60000 in assignments (not in const UPPER_CASE declarations)
 * are flagged as likely magic numbers.
 *
 * @param {string} filePath
 * @param {string} content
 * @returns {Array<{severity: string, rule: string, line: number, message: string, fix: string}>}
 */
function checkMagicNumbers(filePath, content) {
  if (isTestFile(filePath)) return [];
  if (isConfigFile(filePath)) return [];
  const findings = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

    // Find number literals >= MAGIC_THRESHOLD
    const numberMatches = line.matchAll(/\b(\d{5,})\b/g);
    for (const match of numberMatches) {
      const num = parseInt(match[1], 10);
      if (num < MAGIC_THRESHOLD || SAFE_NUMBERS.has(num)) continue;

      // Allow if it's a UPPER_CASE constant declaration
      if (/\b(?:const|let|var)\s+[A-Z][A-Z0-9_]+\s*=/.test(line)) continue;

      findings.push({
        severity: 'warn',
        rule: 'no-magic-numbers',
        line: i + 1,
        message: `Magic number ${num} — use a named constant or config value`,
        fix: 'Extract to a named constant (e.g. const SESSION_TIMEOUT = ...) or use config',
      });
      break; // One finding per line
    }
  }

  return findings;
}

/** Role-related keywords to detect in comparisons and object literals */
const ROLE_STRINGS = [
  'admin', 'manager', 'editor', 'viewer', 'user', 'moderator',
  'owner', 'member', 'guest', 'superadmin', 'super_admin',
];

/**
 * Detect hardcoded role strings in comparisons and object literals.
 * Roles should come from constants, RBAC tables, or config — not inline strings.
 *
 * @param {string} filePath
 * @param {string} content
 * @returns {Array}
 */
function checkHardcodedRoles(filePath, content) {
  if (isTestFile(filePath)) return [];

  // Skip role definition files
  const base = filePath.toLowerCase();
  if (base.includes('role') || base.includes('permission') ||
      base.includes('rbac') || isConfigFile(filePath)) {
    return [];
  }

  const findings = [];
  const lines = content.split('\n');
  const rolePattern = new RegExp(
    `(?:role|userRole|workspaceRole)\\s*(?:===?|!==?)\\s*['"\`](${ROLE_STRINGS.join('|')})['"\`]`
  );
  const roleLiteralPattern = new RegExp(
    `\\brole\\s*:\\s*['"\`](${ROLE_STRINGS.join('|')})['"\`]`
  );

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

    if (rolePattern.test(line) || roleLiteralPattern.test(line)) {
      findings.push({
        severity: 'warn',
        rule: 'no-hardcoded-roles',
        line: i + 1,
        message: 'Hardcoded role string — use RBAC constants or database roles',
        fix: 'Import role constants (e.g. ROLES.ADMIN) instead of string literals',
      });
    }
  }

  return findings;
}

module.exports = {
  checkMagicNumbers,
  checkHardcodedRoles,
};
