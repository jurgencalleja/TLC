/**
 * @file test-inventory.js
 * @description Test Suite Inventory API (Phase 75, Task 2).
 *
 * Factory function that accepts injected dependencies (globSync, fs) and returns
 * functions for discovering test files, counting tests per file, grouping by
 * directory, and reading cached test runs.
 */

import { join, relative, dirname } from 'path';

/**
 * Creates a test inventory service with injected dependencies.
 * @param {Object} deps - Injected dependencies
 * @param {Function} deps.globSync - Glob function for file discovery
 * @param {{ readFileSync: Function, existsSync: Function }} deps.fs - File system operations
 * @returns {{ getTestInventory: Function, getLastTestRun: Function }}
 */
export function createTestInventory({ globSync, fs }) {
  /**
   * Count the number of test cases in a file's content.
   * Matches: it(, it.only(, it.skip(, test(, test.only(, test.skip(
   * @param {string} content - File content to scan
   * @returns {number} Number of test cases found
   */
  function countTests(content) {
    const pattern = /\b(?:it|test)(?:\.only|\.skip)?\s*\(/g;
    const matches = content.match(pattern);
    return matches ? matches.length : 0;
  }

  /**
   * Discover test files, count tests, and group by directory.
   * @param {string} projectPath - Absolute path to the project root
   * @returns {{ totalFiles: number, totalTests: number, groups: Array<{ name: string, fileCount: number, testCount: number, files: Array }> }}
   */
  function getTestInventory(projectPath) {
    const patterns = [
      '**/*.test.js',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.*',
    ];

    const files = globSync(patterns, {
      cwd: projectPath,
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
    });

    /** @type {Map<string, Array<{ relativePath: string, testCount: number }>>} */
    const groupMap = new Map();

    for (const filePath of files) {
      const rel = relative(projectPath, filePath);
      const dir = dirname(rel);

      let content;
      try {
        content = fs.readFileSync(filePath, 'utf-8');
      } catch {
        content = '';
      }

      const testCount = countTests(content);

      if (!groupMap.has(dir)) {
        groupMap.set(dir, []);
      }
      groupMap.get(dir).push({ relativePath: rel, testCount });
    }

    const groups = [];
    for (const [name, fileList] of groupMap) {
      const testCount = fileList.reduce((sum, f) => sum + f.testCount, 0);
      groups.push({
        name,
        fileCount: fileList.length,
        testCount,
        files: fileList,
      });
    }

    // Sort by testCount descending
    groups.sort((a, b) => b.testCount - a.testCount);

    const totalFiles = files.length;
    const totalTests = groups.reduce((sum, g) => sum + g.testCount, 0);

    return { totalFiles, totalTests, groups };
  }

  /**
   * Read the cached last test run result.
   * @param {string} projectPath - Absolute path to the project root
   * @returns {Object|null} Parsed test run data, or null if no cache exists
   */
  function getLastTestRun(projectPath) {
    const cachePath = join(projectPath, '.tlc', 'last-test-run.json');

    if (!fs.existsSync(cachePath)) {
      return null;
    }

    const raw = fs.readFileSync(cachePath, 'utf-8');
    return JSON.parse(raw);
  }

  return { getTestInventory, getLastTestRun };
}
