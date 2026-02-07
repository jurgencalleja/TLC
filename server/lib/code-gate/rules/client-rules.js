/**
 * Client-Side Pattern Rules
 *
 * Detects Zustand stores without persistence middleware
 * and Zod schemas using z.date() instead of z.coerce.date().
 *
 * Derived from Bug #13 (state lost on refresh) and Bug #12 (date coercion).
 *
 * @module code-gate/rules/client-rules
 */

/**
 * @param {string} filePath
 * @returns {boolean}
 */
function isTestFile(filePath) {
  return /\.(test|spec)\.[jt]sx?$/.test(filePath) || filePath.includes('__tests__');
}

/** Store names that are intentionally ephemeral (UI state, not data) */
const EPHEMERAL_PATTERNS = [
  'ui-store', 'ui.store', 'uiStore',
  'modal-store', 'modalStore',
  'toast-store', 'toastStore',
  'theme-store', 'themeStore',
];

/**
 * Detect Zustand create() without persist middleware.
 * Stores that hold user data should use persist() to survive page refreshes.
 * UI-only stores (modals, toasts) are exempt.
 *
 * @param {string} filePath
 * @param {string} content
 * @returns {Array<{severity: string, rule: string, line: number, message: string, fix: string}>}
 */
function checkZustandPersistence(filePath, content) {
  if (isTestFile(filePath)) return [];

  // Only check store files
  if (!filePath.includes('store')) return [];

  // Skip ephemeral stores (UI state)
  const fileBase = filePath.toLowerCase();
  if (EPHEMERAL_PATTERNS.some(p => fileBase.includes(p))) return [];

  // Check if file imports/uses zustand create
  const hasZustandCreate = /\bcreate\s*[<(]/.test(content) &&
    (content.includes("from 'zustand'") || content.includes('from "zustand"') ||
     content.includes("require('zustand')") || content.includes('require("zustand")'));

  if (!hasZustandCreate) return [];

  // Check if persist is used
  const hasPersist = content.includes('persist(') || content.includes('persist<');

  if (!hasPersist) {
    const findings = [];
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (/\bcreate\s*[<(]/.test(lines[i])) {
        findings.push({
          severity: 'warn',
          rule: 'zustand-needs-persist',
          line: i + 1,
          message: 'Zustand store without persist middleware — state lost on page refresh',
          fix: "Wrap with persist(): create(persist((set) => ({...}), { name: 'store-name' }))",
        });
        break;
      }
    }
    return findings;
  }

  return [];
}

/**
 * Detect z.date() in schema files that should use z.coerce.date().
 * When API clients send ISO strings, z.date() rejects them.
 * z.coerce.date() handles both Date objects and ISO strings.
 *
 * @param {string} filePath
 * @param {string} content
 * @returns {Array}
 */
function checkZodDateCoercion(filePath, content) {
  if (isTestFile(filePath)) return [];

  // Only check schema-related files
  const fileBase = filePath.toLowerCase();
  if (!fileBase.includes('schema') && !fileBase.includes('schemas')) return [];

  const findings = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

    // z.date() without coerce
    if (/z\.date\s*\(/.test(line) && !line.includes('z.coerce.date')) {
      findings.push({
        severity: 'warn',
        rule: 'zod-use-coerce-date',
        line: i + 1,
        message: 'z.date() rejects ISO strings from API clients — use z.coerce.date()',
        fix: 'Replace z.date() with z.coerce.date() to accept both Date objects and ISO strings',
      });
    }
  }

  return findings;
}

module.exports = {
  checkZustandPersistence,
  checkZodDateCoercion,
};
