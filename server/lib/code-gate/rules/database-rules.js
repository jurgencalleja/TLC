/**
 * Database Rules
 *
 * Detects new Date() in ORM .set() blocks (should use sql`now()`)
 * and inline billing math that should use shared calculation utilities.
 *
 * Derived from production bugs: timestamp drift, copy-paste billing errors.
 * See: WALL_OF_SHAME.md Bug #29 (missing VAT), Lesson #3 (timestamps)
 *
 * @module code-gate/rules/database-rules
 */

/**
 * @param {string} filePath
 * @returns {boolean}
 */
function isTestFile(filePath) {
  return /\.(test|spec)\.[jt]sx?$/.test(filePath) || filePath.includes('__tests__');
}

/**
 * Detect new Date() inside ORM .set({}) blocks.
 * Database timestamps should use sql`now()` for consistent DB-server time.
 * new Date() uses app-server time which can drift.
 *
 * @param {string} filePath
 * @param {string} content
 * @returns {Array<{severity: string, rule: string, line: number, message: string, fix: string}>}
 */
function checkNewDateInSet(filePath, content) {
  if (isTestFile(filePath)) return [];
  const findings = [];
  const lines = content.split('\n');

  let inSetBlock = false;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect .set({ or .set( { start
    if (/\.set\s*\(\s*\{/.test(line)) {
      inSetBlock = true;
      braceDepth = 0;
      // Count braces on this line
      for (const ch of line) {
        if (ch === '{') braceDepth++;
        if (ch === '}') braceDepth--;
      }
      if (braceDepth <= 0) {
        // Single-line .set({...}) — check this line
        if (/new\s+Date\s*\(\s*\)/.test(line)) {
          findings.push({
            severity: 'block',
            rule: 'no-new-date-in-set',
            line: i + 1,
            message: 'new Date() in .set() block — use sql`now()` for consistent DB timestamps',
            fix: 'Replace new Date() with sql`now()` for database-server time consistency',
          });
        }
        inSetBlock = false;
        continue;
      }
      // Check the opening line too
      if (/new\s+Date\s*\(\s*\)/.test(line)) {
        findings.push({
          severity: 'block',
          rule: 'no-new-date-in-set',
          line: i + 1,
          message: 'new Date() in .set() block — use sql`now()` for consistent DB timestamps',
          fix: 'Replace new Date() with sql`now()` for database-server time consistency',
        });
      }
      continue;
    }

    if (inSetBlock) {
      for (const ch of line) {
        if (ch === '{') braceDepth++;
        if (ch === '}') braceDepth--;
      }

      if (/new\s+Date\s*\(\s*\)/.test(line)) {
        findings.push({
          severity: 'block',
          rule: 'no-new-date-in-set',
          line: i + 1,
          message: 'new Date() in .set() block — use sql`now()` for consistent DB timestamps',
          fix: 'Replace new Date() with sql`now()` for database-server time consistency',
        });
      }

      if (braceDepth <= 0) {
        inSetBlock = false;
      }
    }
  }

  return findings;
}

/** Billing-related variable names that indicate inline math */
const BILLING_VARS = [
  'quantity', 'rate', 'price', 'cost', 'amount',
  'subtotal', 'discount', 'tax', 'vat', 'total',
  'lineTotal', 'grandTotal', 'unitPrice',
];

/**
 * Detect inline billing math that should use shared calculation utilities.
 * When billing calculations are scattered across files, bugs like missing VAT
 * or wrong discount logic slip through.
 *
 * @param {string} filePath
 * @param {string} content
 * @returns {Array}
 */
function checkInlineBillingMath(filePath, content) {
  if (isTestFile(filePath)) return [];

  // Allow math in calculation utility files
  const fileBase = filePath.toLowerCase();
  if (fileBase.includes('calculation') || fileBase.includes('calc.') ||
      fileBase.includes('calc/') || fileBase.includes('-calc')) {
    return [];
  }

  const findings = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

    // Check for billing-variable arithmetic: quantity * rate, subtotal - discount, etc.
    for (const varName of BILLING_VARS) {
      const pattern = new RegExp(`\\b${varName}\\b\\s*[*+\\-]\\s*\\b(${BILLING_VARS.join('|')})\\b`);
      if (pattern.test(line)) {
        findings.push({
          severity: 'warn',
          rule: 'no-inline-billing-math',
          line: i + 1,
          message: 'Inline billing calculation — use shared calculation utility',
          fix: 'Use calculateLineTotal(), calculateSubtotal(), or calculateGrandTotal() from billing-calculations module',
        });
        break; // One finding per line
      }
    }
  }

  return findings;
}

module.exports = {
  checkNewDateInSet,
  checkInlineBillingMath,
};
