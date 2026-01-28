import { describe, it, expect } from 'vitest';
import {
  parseMergeArgs,
  generateMergeSummary,
  createMergeCommand,
} from './merge-command.js';

describe('merge-command', () => {
  describe('parseMergeArgs', () => {
    it('returns defaults for empty args', () => {
      const options = parseMergeArgs('');

      expect(options.branch).toBeNull();
      expect(options.skipTests).toBe(false);
      expect(options.force).toBe(false);
      expect(options.noPush).toBe(false);
      expect(options.verbose).toBe(false);
    });

    it('parses branch name', () => {
      const options = parseMergeArgs('feature/auth');
      expect(options.branch).toBe('feature/auth');
    });

    it('parses --skip-tests flag', () => {
      const options = parseMergeArgs('feature/x --skip-tests');
      expect(options.branch).toBe('feature/x');
      expect(options.skipTests).toBe(true);
    });

    it('parses --force flag', () => {
      const options = parseMergeArgs('main --force');
      expect(options.force).toBe(true);
    });

    it('parses --no-push flag', () => {
      const options = parseMergeArgs('main --no-push');
      expect(options.noPush).toBe(true);
    });

    it('parses --verbose flag', () => {
      const options = parseMergeArgs('main --verbose');
      expect(options.verbose).toBe(true);
    });

    it('parses multiple flags', () => {
      const options = parseMergeArgs('develop --force --skip-tests --verbose');

      expect(options.branch).toBe('develop');
      expect(options.force).toBe(true);
      expect(options.skipTests).toBe(true);
      expect(options.verbose).toBe(true);
    });

    it('handles whitespace', () => {
      const options = parseMergeArgs('  feature/x   --force  ');
      expect(options.branch).toBe('feature/x');
      expect(options.force).toBe(true);
    });

    it('uses first non-flag as branch', () => {
      const options = parseMergeArgs('--force branch-name --verbose');
      expect(options.branch).toBe('branch-name');
    });
  });

  describe('generateMergeSummary', () => {
    it('generates basic summary', () => {
      const context = {
        sourceBranch: 'feature/auth',
        targetBranch: 'main',
        commits: [
          { hash: 'abc123', message: 'Add login' },
          { hash: 'def456', message: 'Add logout' },
        ],
        dependencyChanges: { hasChanges: false, files: [] },
      };

      const summary = generateMergeSummary(context);

      expect(summary).toContain('Merge Summary');
      expect(summary).toContain('feature/auth');
      expect(summary).toContain('main');
      expect(summary).toContain('2');
    });

    it('includes dependency changes', () => {
      const context = {
        sourceBranch: 'feature/x',
        targetBranch: 'main',
        commits: [],
        dependencyChanges: {
          hasChanges: true,
          files: ['package.json', 'package-lock.json'],
        },
      };

      const summary = generateMergeSummary(context);

      expect(summary).toContain('Dependency Changes');
      expect(summary).toContain('package.json');
      expect(summary).toContain('package-lock.json');
    });

    it('includes test results - passed', () => {
      const context = {
        sourceBranch: 'feature/x',
        targetBranch: 'main',
        commits: [],
        dependencyChanges: { hasChanges: false, files: [] },
        testResult: {
          success: true,
          output: '10 tests passed',
        },
      };

      const summary = generateMergeSummary(context);

      expect(summary).toContain('Tests: PASSED');
    });

    it('includes test results - failed', () => {
      const context = {
        sourceBranch: 'feature/x',
        targetBranch: 'main',
        commits: [],
        dependencyChanges: { hasChanges: false, files: [] },
        testResult: {
          success: false,
          output: 'Error: test failed',
        },
      };

      const summary = generateMergeSummary(context);

      expect(summary).toContain('Tests: FAILED');
      expect(summary).toContain('test failed');
    });

    it('truncates long test output', () => {
      const context = {
        sourceBranch: 'feature/x',
        targetBranch: 'main',
        commits: [],
        dependencyChanges: { hasChanges: false, files: [] },
        testResult: {
          success: false,
          output: 'x'.repeat(3000),
        },
      };

      const summary = generateMergeSummary(context);

      expect(summary.length).toBeLessThan(3000);
    });

    it('includes merge result - completed', () => {
      const context = {
        sourceBranch: 'feature/x',
        targetBranch: 'main',
        commits: [],
        dependencyChanges: { hasChanges: false, files: [] },
        mergeResult: {
          success: true,
          output: 'Merged',
        },
      };

      const summary = generateMergeSummary(context);

      expect(summary).toContain('Merge: COMPLETED');
    });

    it('includes merge result - conflicts', () => {
      const context = {
        sourceBranch: 'feature/x',
        targetBranch: 'main',
        commits: [],
        dependencyChanges: { hasChanges: false, files: [] },
        mergeResult: {
          success: false,
          conflicts: true,
          output: 'CONFLICT',
        },
      };

      const summary = generateMergeSummary(context);

      expect(summary).toContain('Merge: CONFLICTS');
      expect(summary).toContain('manual resolution');
    });

    it('includes merge result - failed', () => {
      const context = {
        sourceBranch: 'feature/x',
        targetBranch: 'main',
        commits: [],
        dependencyChanges: { hasChanges: false, files: [] },
        mergeResult: {
          success: false,
          conflicts: false,
          output: 'Error',
        },
      };

      const summary = generateMergeSummary(context);

      expect(summary).toContain('Merge: FAILED');
    });
  });

  describe('createMergeCommand', () => {
    it('creates command handler', () => {
      const handler = createMergeCommand();

      expect(handler.execute).toBeDefined();
      expect(handler.parseArgs).toBeDefined();
      expect(handler.getCurrentBranch).toBeDefined();
      expect(handler.branchExists).toBeDefined();
      expect(handler.hasUncommittedChanges).toBeDefined();
      expect(handler.detectTestCommand).toBeDefined();
      expect(handler.detectDependencyChanges).toBeDefined();
      expect(handler.generateMergeSummary).toBeDefined();
    });

    it('exposes parseArgs function', () => {
      const handler = createMergeCommand();
      const options = handler.parseArgs('feature/x --force');

      expect(options.branch).toBe('feature/x');
      expect(options.force).toBe(true);
    });

    it('exposes generateMergeSummary function', () => {
      const handler = createMergeCommand();
      const summary = handler.generateMergeSummary({
        sourceBranch: 'feature',
        targetBranch: 'main',
        commits: [],
        dependencyChanges: { hasChanges: false, files: [] },
      });

      expect(summary).toContain('Merge Summary');
    });
  });
});
