import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const { WorkspaceTestRunner } = await import('./workspace-test-runner.js');

describe('WorkspaceTestRunner', () => {
  let tempDir;
  let runner;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-test-runner-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function createRepo(name, options = {}) {
    const repoPath = path.join(tempDir, name);
    fs.mkdirSync(repoPath, { recursive: true });

    const packageJson = {
      name: options.packageName || name,
      version: '1.0.0',
      scripts: {
        test: options.testCommand || 'echo "Tests passed"',
      },
      dependencies: options.dependencies || {},
    };

    fs.writeFileSync(
      path.join(repoPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    if (options.tlcConfig) {
      fs.writeFileSync(
        path.join(repoPath, '.tlc.json'),
        JSON.stringify(options.tlcConfig, null, 2)
      );
    }

    return repoPath;
  }

  describe('single repo', () => {
    it('runs tests in a single repo', async () => {
      createRepo('my-app', { testCommand: 'echo "1 test passed"' });

      runner = new WorkspaceTestRunner(tempDir, ['my-app']);
      const result = await runner.runTests();

      expect(result.repos['my-app'].success).toBe(true);
      expect(result.summary.total).toBe(1);
      expect(result.summary.passed).toBe(1);
    });

    it('detects test failure', async () => {
      createRepo('failing-app', { testCommand: 'exit 1' });

      runner = new WorkspaceTestRunner(tempDir, ['failing-app']);
      const result = await runner.runTests();

      expect(result.repos['failing-app'].success).toBe(false);
      expect(result.summary.failed).toBe(1);
    });
  });

  describe('multiple repos sequential', () => {
    it('runs tests in multiple repos sequentially', async () => {
      createRepo('repo-a', { testCommand: 'echo "A passed"' });
      createRepo('repo-b', { testCommand: 'echo "B passed"' });
      createRepo('repo-c', { testCommand: 'echo "C passed"' });

      runner = new WorkspaceTestRunner(tempDir, ['repo-a', 'repo-b', 'repo-c']);
      const result = await runner.runTests({ parallel: false });

      expect(result.summary.total).toBe(3);
      expect(result.summary.passed).toBe(3);
      expect(result.summary.failed).toBe(0);
    });
  });

  describe('parallel execution', () => {
    it('runs independent repos in parallel', async () => {
      createRepo('independent-a', { testCommand: 'echo "A"' });
      createRepo('independent-b', { testCommand: 'echo "B"' });

      runner = new WorkspaceTestRunner(tempDir, ['independent-a', 'independent-b']);
      const result = await runner.runTests({ parallel: true });

      expect(result.summary.total).toBe(2);
      expect(result.summary.passed).toBe(2);
      // Both should run roughly at the same time (no strict timing check)
    });
  });

  describe('dependency order', () => {
    it('respects dependency order (test A before B if B depends on A)', async () => {
      createRepo('core', {
        packageName: 'core',
        testCommand: 'echo "core tested"',
      });
      createRepo('api', {
        packageName: 'api',
        testCommand: 'echo "api tested"',
        dependencies: { core: 'workspace:*' },
      });

      runner = new WorkspaceTestRunner(tempDir, ['api', 'core']);
      const result = await runner.runTests();

      // Core should be tested before api
      expect(result.order).toEqual(['core', 'api']);
    });

    it('handles complex dependency chains', async () => {
      createRepo('base', { packageName: 'base' });
      createRepo('middle', {
        packageName: 'middle',
        dependencies: { base: 'workspace:*' },
      });
      createRepo('top', {
        packageName: 'top',
        dependencies: { middle: 'workspace:*' },
      });

      runner = new WorkspaceTestRunner(tempDir, ['top', 'middle', 'base']);
      const result = await runner.runTests();

      const baseIdx = result.order.indexOf('base');
      const middleIdx = result.order.indexOf('middle');
      const topIdx = result.order.indexOf('top');

      expect(baseIdx).toBeLessThan(middleIdx);
      expect(middleIdx).toBeLessThan(topIdx);
    });
  });

  describe('result aggregation', () => {
    it('aggregates pass/fail counts', async () => {
      createRepo('pass-1', { testCommand: 'echo "ok"' });
      createRepo('pass-2', { testCommand: 'echo "ok"' });
      createRepo('fail-1', { testCommand: 'exit 1' });

      runner = new WorkspaceTestRunner(tempDir, ['pass-1', 'pass-2', 'fail-1']);
      const result = await runner.runTests({ bail: false });

      expect(result.summary.total).toBe(3);
      expect(result.summary.passed).toBe(2);
      expect(result.summary.failed).toBe(1);
    });

    it('reports duration per repo', async () => {
      createRepo('timed-repo', { testCommand: 'echo "done"' });

      runner = new WorkspaceTestRunner(tempDir, ['timed-repo']);
      const result = await runner.runTests();

      expect(result.repos['timed-repo'].duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('bail mode', () => {
    it('stops on first failure in bail mode', async () => {
      createRepo('first', { testCommand: 'echo "pass"' });
      createRepo('second', { testCommand: 'exit 1' });
      createRepo('third', { testCommand: 'echo "pass"' });

      runner = new WorkspaceTestRunner(tempDir, ['first', 'second', 'third']);
      const result = await runner.runTests({ bail: true });

      // Should stop after second fails
      expect(result.summary.passed).toBe(1);
      expect(result.summary.failed).toBe(1);
      expect(result.summary.skipped).toBe(1);
      expect(result.repos['third'].skipped).toBe(true);
    });
  });

  describe('no-bail mode', () => {
    it('continues on failure in no-bail mode', async () => {
      createRepo('first', { testCommand: 'echo "pass"' });
      createRepo('second', { testCommand: 'exit 1' });
      createRepo('third', { testCommand: 'echo "pass"' });

      runner = new WorkspaceTestRunner(tempDir, ['first', 'second', 'third']);
      const result = await runner.runTests({ bail: false });

      // Should continue to third
      expect(result.summary.passed).toBe(2);
      expect(result.summary.failed).toBe(1);
      expect(result.summary.skipped).toBe(0);
    });
  });

  describe('repos without tests', () => {
    it('handles repo with no test script', async () => {
      const repoPath = path.join(tempDir, 'no-tests');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ name: 'no-tests', version: '1.0.0' })
      );

      runner = new WorkspaceTestRunner(tempDir, ['no-tests']);
      const result = await runner.runTests();

      expect(result.repos['no-tests'].noTests).toBe(true);
      expect(result.summary.noTests).toBe(1);
    });

    it('handles repo with no package.json', async () => {
      fs.mkdirSync(path.join(tempDir, 'empty-repo'));

      runner = new WorkspaceTestRunner(tempDir, ['empty-repo']);
      const result = await runner.runTests();

      expect(result.repos['empty-repo'].noTests).toBe(true);
    });
  });

  describe('custom test commands', () => {
    it('respects per-repo test config from .tlc.json', async () => {
      createRepo('custom-tests', {
        testCommand: 'echo "default"',
        tlcConfig: {
          commands: {
            test: 'echo "custom from tlc.json"',
          },
        },
      });

      runner = new WorkspaceTestRunner(tempDir, ['custom-tests']);
      const result = await runner.runTests();

      expect(result.repos['custom-tests'].success).toBe(true);
      expect(result.repos['custom-tests'].output).toContain('custom from tlc.json');
    });
  });

  describe('filter repos', () => {
    it('can run tests for specific repos only', async () => {
      createRepo('run-me');
      createRepo('skip-me');
      createRepo('also-skip');

      runner = new WorkspaceTestRunner(tempDir, ['run-me', 'skip-me', 'also-skip']);
      const result = await runner.runTests({ filter: ['run-me'] });

      expect(result.summary.total).toBe(1);
      expect(Object.keys(result.repos)).toEqual(['run-me']);
    });
  });

  describe('affected repos', () => {
    it('can run tests only for affected repos', async () => {
      createRepo('core', { packageName: 'core' });
      createRepo('api', {
        packageName: 'api',
        dependencies: { core: 'workspace:*' },
      });
      createRepo('unrelated', { packageName: 'unrelated' });

      runner = new WorkspaceTestRunner(tempDir, ['core', 'api', 'unrelated']);
      const result = await runner.runTests({ affected: 'core' });

      // Should test core and api (which depends on core), not unrelated
      expect(Object.keys(result.repos).sort()).toEqual(['api', 'core']);
    });
  });

  describe('output capture', () => {
    it('captures stdout from test runs', async () => {
      createRepo('verbose', { testCommand: 'echo "Test output here"' });

      runner = new WorkspaceTestRunner(tempDir, ['verbose']);
      const result = await runner.runTests();

      expect(result.repos['verbose'].output).toContain('Test output here');
    });

    it('captures stderr from failed tests', async () => {
      createRepo('error-repo', { testCommand: 'echo "error message" >&2 && exit 1' });

      runner = new WorkspaceTestRunner(tempDir, ['error-repo']);
      const result = await runner.runTests();

      expect(result.repos['error-repo'].output).toContain('error message');
    });
  });
});
