/**
 * Structure Rules
 *
 * Detects flat folder anti-patterns, files in wrong locations,
 * and missing test colocation.
 *
 * @module code-gate/rules/structure-rules
 */

const path = require('path');

/** Folder names that indicate flat anti-patterns when at root level */
const FLAT_FOLDER_PATTERNS = ['services', 'controllers', 'interfaces', 'helpers', 'utils'];

/** Files allowed at project root */
const ALLOWED_ROOT_FILES = [
  'index.js', 'index.ts', 'index.mjs',
  'package.json', 'package-lock.json',
  'tsconfig.json', 'vitest.config.js', 'vitest.config.ts',
  'jest.config.js', 'jest.config.ts', '.eslintrc.js',
];

/** Patterns for allowed root file naming */
const ALLOWED_ROOT_PATTERNS = [
  /^\./, // dotfiles
  /\.config\.[jt]s$/, // config files
  /\.json$/, // JSON files
  /\.ya?ml$/, // YAML files
  /\.md$/, // Markdown
  /\.lock$/, // Lock files
];

/**
 * Detect flat folder anti-patterns (services/, interfaces/, controllers/ at root).
 *
 * @param {string} filePath - File path relative to project root
 * @param {string} content - File content (unused for structure checks)
 * @returns {Array<{severity: string, rule: string, line: number, message: string, fix: string}>}
 */
function checkFlatFolders(filePath, content) {
  const parts = filePath.split(/[/\\]/);

  // Check if the first or second directory segment is a flat anti-pattern
  for (let i = 0; i < Math.min(parts.length - 1, 2); i++) {
    const dir = parts[i];
    if (FLAT_FOLDER_PATTERNS.includes(dir)) {
      // Only flag if not inside a module (e.g. src/user/services is fine)
      const isNested = i >= 2 || (i === 1 && parts[0] === 'src' && parts.length > 3);
      if (!isNested) {
        return [{
          severity: 'warn',
          rule: 'no-flat-folders',
          line: 1,
          message: `File in flat '${dir}/' folder — use module-scoped organization`,
          fix: `Move to a feature module: src/{feature}/${dir}/${path.basename(filePath)}`,
        }];
      }
    }
  }

  return [];
}

/**
 * Detect loose source files at project root that should be in subdirectories.
 *
 * @param {string} filePath
 * @param {string} content
 * @returns {Array}
 */
function checkLooseFiles(filePath, content) {
  // Only check files at root (no directory separator)
  if (filePath.includes('/') || filePath.includes('\\')) {
    return [];
  }

  // Check against allowed files and patterns
  if (ALLOWED_ROOT_FILES.includes(filePath)) {
    return [];
  }
  for (const pattern of ALLOWED_ROOT_PATTERNS) {
    if (pattern.test(filePath)) {
      return [];
    }
  }

  // Only flag JS/TS source files
  if (!/\.[jt]sx?$/.test(filePath)) {
    return [];
  }

  return [{
    severity: 'warn',
    rule: 'no-loose-files',
    line: 1,
    message: `Source file '${filePath}' at project root`,
    fix: 'Move into a feature module directory: src/{feature}/',
  }];
}

/**
 * Check that source files have corresponding test files.
 * Skips test files, config files, and non-JS files.
 *
 * @param {string} filePath
 * @param {string} content
 * @param {Object} [options]
 * @param {string[]} [options.allFiles] - All file paths in the changeset
 * @returns {Array}
 */
function checkTestColocation(filePath, content, options = {}) {
  // Skip non-JS files
  if (!/\.[jt]sx?$/.test(filePath)) return [];

  // Skip test files themselves
  if (/\.(test|spec)\.[jt]sx?$/.test(filePath)) return [];

  // Skip config files
  if (/\.config\.[jt]sx?$/.test(filePath)) return [];

  // Skip index files and type definitions
  if (/^index\.[jt]sx?$/.test(path.basename(filePath))) return [];
  if (/\.d\.ts$/.test(filePath)) return [];

  const allFiles = options.allFiles || [];
  const base = filePath.replace(/\.[jt]sx?$/, '');
  const testPatterns = [
    `${base}.test.js`,
    `${base}.test.ts`,
    `${base}.test.jsx`,
    `${base}.test.tsx`,
    `${base}.spec.js`,
    `${base}.spec.ts`,
  ];

  const hasTest = testPatterns.some(tp => allFiles.includes(tp));

  if (!hasTest) {
    return [{
      severity: 'block',
      rule: 'require-test-file',
      line: 1,
      message: `No test file found for '${filePath}'`,
      fix: `Create test file: ${base}.test.js`,
    }];
  }

  return [];
}

module.exports = {
  checkFlatFolders,
  checkLooseFiles,
  checkTestColocation,
};
