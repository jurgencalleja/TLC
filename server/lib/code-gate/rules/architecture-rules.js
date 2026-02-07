/**
 * Architecture Rules
 *
 * Detects single-writer pattern violations, fake API calls,
 * stale re-export files, and raw API request bypass.
 *
 * Derived from 34 real-world bugs in production projects.
 * See: TLC-BEST-PRACTICES.md, WALL_OF_SHAME.md
 *
 * @module code-gate/rules/architecture-rules
 */

/**
 * @param {string} filePath
 * @returns {boolean}
 */
function isTestFile(filePath) {
  return /\.(test|spec)\.[jt]sx?$/.test(filePath) || filePath.includes('__tests__');
}

/**
 * Common plural-to-singular and singular-to-plural mappings.
 * Used to match table names to service file names.
 * @param {string} tableName - e.g. "users", "companies"
 * @returns {string[]} Possible service file stems
 */
function tableNameVariants(tableName) {
  const variants = [tableName];
  // Plural → singular
  if (tableName.endsWith('ies')) {
    variants.push(tableName.slice(0, -3) + 'y'); // companies → company
  } else if (tableName.endsWith('ses')) {
    variants.push(tableName.slice(0, -2)); // addresses → address (approx)
  } else if (tableName.endsWith('s')) {
    variants.push(tableName.slice(0, -1)); // users → user
  }
  // Singular → plural (for reverse matching)
  if (!tableName.endsWith('s')) {
    variants.push(tableName + 's');
  }
  return variants;
}

/**
 * Detect db.insert(X) or db.update(X) outside the service that owns table X.
 *
 * The owning service is determined by file name: X.service.* or Xs.service.*
 * This prevents the #1 architectural anti-pattern from BEST-PRACTICES.md.
 *
 * @param {string} filePath
 * @param {string} content
 * @returns {Array<{severity: string, rule: string, line: number, message: string, fix: string}>}
 */
function checkSingleWriter(filePath, content) {
  if (isTestFile(filePath)) return [];
  const findings = [];
  const lines = content.split('\n');

  const dbWritePattern = /\bdb\.(insert|update)\s*\(\s*(\w+)\s*\)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

    const match = line.match(dbWritePattern);
    if (match) {
      const operation = match[1];
      const tableName = match[2];
      const variants = tableNameVariants(tableName);

      // Check if current file is the owning service
      const fileBase = filePath.toLowerCase();
      const isOwner = variants.some(v =>
        fileBase.includes(`${v}.service`) || fileBase.includes(`${v}s.service`)
      );

      if (!isOwner) {
        findings.push({
          severity: 'block',
          rule: 'single-writer',
          line: i + 1,
          message: `db.${operation}(${tableName}) outside owning service — violates single-writer pattern`,
          fix: `Move this write to the ${tableName} service file (e.g. ${variants[0]}.service.ts)`,
        });
      }
    }
  }

  return findings;
}

/**
 * Detect setTimeout + resolve patterns that fake API calls.
 * AI code generators use this to simulate async behavior instead
 * of making real API calls.
 *
 * @param {string} filePath
 * @param {string} content
 * @returns {Array}
 */
function checkFakeApiCalls(filePath, content) {
  if (isTestFile(filePath)) return [];
  const findings = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

    // setTimeout(() => resolve(...), number)
    if (/setTimeout\s*\(\s*\(\)\s*=>\s*resolve\s*\(/.test(line)) {
      findings.push({
        severity: 'block',
        rule: 'no-fake-api',
        line: i + 1,
        message: 'Fake API call using setTimeout + resolve — use a real API endpoint',
        fix: 'Replace with actual API call using fetch() or an API client',
      });
    }
  }

  return findings;
}

/**
 * Detect files that contain only a re-export statement.
 * These accumulate as backwards-compatibility shims and become dead code.
 *
 * @param {string} filePath
 * @param {string} content
 * @returns {Array}
 */
function checkStaleReexports(filePath, content) {
  const trimmed = content.trim();
  if (!trimmed) return [];

  // Strip comments
  const stripped = trimmed
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();

  // CommonJS re-export only
  if (/^module\.exports\s*=\s*require\s*\([^)]+\)\s*;?\s*$/.test(stripped)) {
    return [{
      severity: 'warn',
      rule: 'stale-reexport',
      line: 1,
      message: 'File contains only a re-export — likely a deprecated shim',
      fix: 'Update all imports to point to the new location and delete this file',
    }];
  }

  // ESM re-export only
  if (/^export\s*\{[^}]*\}\s*from\s*['"][^'"]+['"]\s*;?\s*$/.test(stripped)) {
    return [{
      severity: 'warn',
      rule: 'stale-reexport',
      line: 1,
      message: 'File contains only a re-export — likely a deprecated shim',
      fix: 'Update all imports to point to the new location and delete this file',
    }];
  }

  return [];
}

/**
 * Detect raw apiRequest() or fetch('/api/...') calls in UI components.
 * When API helpers exist (companiesApi.create, leadsApi.update),
 * using raw requests bypasses shared logic.
 *
 * @param {string} filePath
 * @param {string} content
 * @returns {Array}
 */
function checkRawApiRequests(filePath, content) {
  if (isTestFile(filePath)) return [];

  // Skip API helper files themselves
  const fileBase = filePath.toLowerCase();
  if (fileBase.includes('/api.') || fileBase.includes('/api/') ||
      fileBase.endsWith('api.ts') || fileBase.endsWith('api.js')) {
    return [];
  }

  const findings = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

    // apiRequest("METHOD", "/api/...")
    if (/apiRequest\s*\(\s*['"`](?:GET|POST|PUT|PATCH|DELETE)['"`]\s*,\s*['"`]\/api\//.test(line)) {
      findings.push({
        severity: 'warn',
        rule: 'no-raw-api',
        line: i + 1,
        message: 'Raw apiRequest() call — use entity-specific API helper instead',
        fix: 'Use the shared API helper (e.g. companiesApi.create()) for type safety and consistency',
      });
    }

    // fetch("/api/...")
    if (/fetch\s*\(\s*['"`]\/api\//.test(line)) {
      findings.push({
        severity: 'warn',
        rule: 'no-raw-api',
        line: i + 1,
        message: 'Raw fetch() to /api/ — use entity-specific API helper instead',
        fix: 'Use the shared API helper for centralized error handling and auth',
      });
    }
  }

  return findings;
}

module.exports = {
  checkSingleWriter,
  checkFakeApiCalls,
  checkStaleReexports,
  checkRawApiRequests,
};
