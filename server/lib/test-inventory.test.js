/**
 * @file test-inventory.test.js
 * @description Tests for the Test Suite Inventory API (Phase 75, Task 2).
 *
 * Tests the factory function `createTestInventory(deps)` which accepts injected
 * dependencies (globSync, fs) and returns functions for discovering test files,
 * counting tests per file, grouping by directory, and reading cached test runs.
 *
 * Factory returns: { getTestInventory(projectPath), getLastTestRun(projectPath) }
 *
 * All dependencies are fully mocked with vi.fn() — no real filesystem access.
 * These tests are written BEFORE the implementation (Red phase).
 */
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { createTestInventory } from './test-inventory.js';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

/**
 * Creates a mock globSync function that returns the given file paths.
 * @param {string[]} files - Array of file paths to return from globSync
 * @returns {Function} vi.fn() that returns the files array
 */
function createMockGlob(files = []) {
  return vi.fn().mockReturnValue(files);
}

/**
 * Creates a mock fs object with readFileSync and existsSync stubs.
 * readFileSync returns content from the fileContents map, or throws ENOENT.
 * existsSync returns true if the path exists in the map.
 * @param {Object<string, string>} fileContents - Map of file path to file content
 * @returns {{ readFileSync: Function, existsSync: Function }} Mock fs object
 */
function createMockFs(fileContents = {}) {
  return {
    readFileSync: vi.fn((p) => {
      if (p in fileContents) return fileContents[p];
      throw new Error(`ENOENT: no such file or directory, open '${p}'`);
    }),
    existsSync: vi.fn((p) => p in fileContents),
  };
}

// ---------------------------------------------------------------------------
// Sample test file contents for counting
// ---------------------------------------------------------------------------

/** A typical test file with 3 tests (2 it + 1 test) */
const threeTestFile = `
import { describe, it, expect } from 'vitest';

describe('auth', () => {
  it('logs in with valid credentials', () => {
    expect(true).toBe(true);
  });

  it('rejects invalid password', () => {
    expect(true).toBe(true);
  });

  test('handles missing email', () => {
    expect(true).toBe(true);
  });
});
`;

/** A test file with 2 tests using it.only and it.skip */
const twoTestFileWithModifiers = `
import { describe, it, expect } from 'vitest';

describe('session', () => {
  it.only('creates new session', () => {
    expect(true).toBe(true);
  });

  it.skip('expires after timeout', () => {
    expect(true).toBe(true);
  });
});
`;

/** A test file with 1 test using test.only */
const oneTestFile = `
import { describe, test, expect } from 'vitest';

describe('utils', () => {
  test.only('formats date correctly', () => {
    expect(true).toBe(true);
  });
});
`;

/** An empty test file (no it/test calls) */
const emptyTestFile = `
import { describe, expect } from 'vitest';

describe('placeholder', () => {
  // TODO: add tests
});
`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('test-inventory', () => {
  let inventory;
  let mockGlob;
  let mockFs;

  beforeEach(() => {
    mockGlob = createMockGlob();
    mockFs = createMockFs();
    inventory = createTestInventory({ globSync: mockGlob, fs: mockFs });
  });

  describe('getTestInventory', () => {
    it('discovers test files by glob patterns', () => {
      const files = [
        '/project/server/lib/auth.test.js',
        '/project/server/lib/tasks.test.ts',
        '/project/dashboard-web/src/App.test.tsx',
        '/project/server/lib/utils.spec.js',
      ];
      mockGlob.mockReturnValue(files);
      mockFs.readFileSync.mockReturnValue(emptyTestFile);

      inventory.getTestInventory('/project');

      // Verify globSync was called with patterns that cover all test extensions
      const callArgs = mockGlob.mock.calls[0];
      const patterns = callArgs[0];

      // Should search for .test.js, .test.ts, .test.tsx, and .spec.* patterns
      expect(patterns).toEqual(
        expect.arrayContaining([
          expect.stringContaining('*.test.js'),
          expect.stringContaining('*.test.ts'),
          expect.stringContaining('*.test.tsx'),
          expect.stringContaining('*.spec.*'),
        ])
      );
    });

    it('groups files by directory', () => {
      const files = [
        '/project/server/lib/auth.test.js',
        '/project/server/lib/tasks.test.js',
        '/project/dashboard-web/src/Login.test.tsx',
        '/project/dashboard-web/src/App.test.tsx',
      ];
      mockGlob.mockReturnValue(files);
      mockFs.readFileSync.mockReturnValue(threeTestFile);

      const result = inventory.getTestInventory('/project');

      expect(result.groups).toHaveLength(2);

      const groupNames = result.groups.map((g) => g.name);
      expect(groupNames).toContain('server/lib');
      expect(groupNames).toContain('dashboard-web/src');

      const serverGroup = result.groups.find((g) => g.name === 'server/lib');
      expect(serverGroup.fileCount).toBe(2);

      const dashGroup = result.groups.find((g) => g.name === 'dashboard-web/src');
      expect(dashGroup.fileCount).toBe(2);
    });

    it('counts tests per file (it/test occurrences)', () => {
      const files = ['/project/server/lib/auth.test.js'];
      mockGlob.mockReturnValue(files);
      mockFs.readFileSync.mockReturnValue(threeTestFile);

      const result = inventory.getTestInventory('/project');

      const file = result.groups[0].files[0];
      expect(file.testCount).toBe(3);
    });

    it('summary totals are correct', () => {
      const files = [
        '/project/server/lib/auth.test.js',
        '/project/server/lib/session.test.js',
        '/project/server/lib/utils.test.js',
      ];
      mockGlob.mockReturnValue(files);

      // auth has 3, session has 2, utils has 1 = 6 total
      const contents = {
        '/project/server/lib/auth.test.js': threeTestFile,
        '/project/server/lib/session.test.js': twoTestFileWithModifiers,
        '/project/server/lib/utils.test.js': oneTestFile,
      };
      mockFs.readFileSync.mockImplementation((p) => {
        if (p in contents) return contents[p];
        throw new Error(`ENOENT: ${p}`);
      });

      const result = inventory.getTestInventory('/project');

      expect(result.totalFiles).toBe(3);
      expect(result.totalTests).toBe(6);

      // Group total should also sum correctly
      const group = result.groups[0];
      expect(group.testCount).toBe(6);
      expect(group.fileCount).toBe(3);
    });

    it('groups sorted by test count descending', () => {
      const files = [
        // Group A: server/lib — 1 file with 1 test
        '/project/server/lib/utils.test.js',
        // Group B: dashboard-web/src — 1 file with 3 tests
        '/project/dashboard-web/src/App.test.tsx',
      ];
      mockGlob.mockReturnValue(files);

      const contents = {
        '/project/server/lib/utils.test.js': oneTestFile,
        '/project/dashboard-web/src/App.test.tsx': threeTestFile,
      };
      mockFs.readFileSync.mockImplementation((p) => {
        if (p in contents) return contents[p];
        throw new Error(`ENOENT: ${p}`);
      });

      const result = inventory.getTestInventory('/project');

      // dashboard-web/src has 3 tests, server/lib has 1 — dashboard first
      expect(result.groups[0].name).toBe('dashboard-web/src');
      expect(result.groups[0].testCount).toBe(3);
      expect(result.groups[1].name).toBe('server/lib');
      expect(result.groups[1].testCount).toBe(1);
    });

    it('ignores node_modules and dist', () => {
      mockGlob.mockReturnValue([]);

      inventory.getTestInventory('/project');

      const callArgs = mockGlob.mock.calls[0];
      const options = callArgs[1];

      // The options should include ignore patterns for node_modules, dist, .git
      expect(options).toBeDefined();
      expect(options.ignore).toEqual(
        expect.arrayContaining([
          expect.stringContaining('node_modules'),
          expect.stringContaining('dist'),
          expect.stringContaining('.git'),
        ])
      );
    });

    it('returns empty inventory for no test files', () => {
      mockGlob.mockReturnValue([]);

      const result = inventory.getTestInventory('/project');

      expect(result.totalFiles).toBe(0);
      expect(result.totalTests).toBe(0);
      expect(result.groups).toEqual([]);
    });

    it('handles mixed extensions (.test.js, .test.ts, .test.tsx)', () => {
      const files = [
        '/project/src/auth.test.js',
        '/project/src/config.test.ts',
        '/project/src/App.test.tsx',
      ];
      mockGlob.mockReturnValue(files);
      mockFs.readFileSync.mockReturnValue(oneTestFile);

      const result = inventory.getTestInventory('/project');

      expect(result.totalFiles).toBe(3);
      // All three files should be discovered regardless of extension
      const filePaths = result.groups[0].files.map((f) => f.relativePath);
      expect(filePaths).toContain('src/auth.test.js');
      expect(filePaths).toContain('src/config.test.ts');
      expect(filePaths).toContain('src/App.test.tsx');
    });

    it('handles spec files (.spec.js)', () => {
      const files = [
        '/project/src/utils.spec.js',
        '/project/src/helpers.spec.ts',
      ];
      mockGlob.mockReturnValue(files);
      mockFs.readFileSync.mockReturnValue(threeTestFile);

      const result = inventory.getTestInventory('/project');

      expect(result.totalFiles).toBe(2);
      const filePaths = result.groups[0].files.map((f) => f.relativePath);
      expect(filePaths).toContain('src/utils.spec.js');
      expect(filePaths).toContain('src/helpers.spec.ts');
    });

    it('works with nested directory structures', () => {
      const files = [
        '/project/server/lib/auth/login.test.js',
        '/project/server/lib/auth/logout.test.js',
        '/project/server/lib/tasks.test.js',
        '/project/dashboard-web/src/pages/Home.test.tsx',
      ];
      mockGlob.mockReturnValue(files);
      mockFs.readFileSync.mockReturnValue(oneTestFile);

      const result = inventory.getTestInventory('/project');

      // Nested dirs should be grouped by their top-level directory segments
      const groupNames = result.groups.map((g) => g.name);

      // server/lib/auth/ and server/lib/ files should group under server/lib
      // (or similar sensible grouping)
      expect(groupNames.length).toBeGreaterThanOrEqual(2);

      // All 4 files should be accounted for
      expect(result.totalFiles).toBe(4);
    });
  });

  describe('getLastTestRun', () => {
    it('returns null when no cached run exists', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = inventory.getLastTestRun('/project');

      expect(result).toBeNull();
    });

    it('returns cached test run data when available', () => {
      const cachedRun = JSON.stringify({
        timestamp: '2026-02-09T10:30:00Z',
        passed: 347,
        failed: 3,
        total: 350,
        duration: 12500,
      });

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(cachedRun);

      const result = inventory.getLastTestRun('/project');

      expect(result).not.toBeNull();
      expect(result.timestamp).toBe('2026-02-09T10:30:00Z');
      expect(result.passed).toBe(347);
      expect(result.failed).toBe(3);
      expect(result.total).toBe(350);
      expect(result.duration).toBe(12500);
    });
  });
});
