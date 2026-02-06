import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createQAReleaseTask,
  formatChangelog,
  formatGateSummary,
  getQAUsers,
} from './qa-release-task.js';

/**
 * Helper: build a minimal release object matching the shape from tag-release.js
 */
function makeRelease(overrides = {}) {
  return {
    tag: 'v1.0.0-rc.1',
    commitSha: 'abc1234',
    tier: 'rc',
    state: 'deployed',
    gateResults: {
      passed: true,
      results: [
        { gate: 'tests', status: 'pass', details: { total: 50, passing: 48, failing: 2 } },
        { gate: 'security', status: 'pass', details: { vulnerabilities: 0 } },
      ],
    },
    previewUrl: 'qa-v1.0.0-rc.1.example.com',
    reviewer: null,
    reason: null,
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:05:00.000Z',
    ...overrides,
  };
}

/**
 * Helper: build a config object resembling .tlc.json
 */
function makeConfig(overrides = {}) {
  return {
    auth: {
      users: [
        { email: 'admin@local.com', name: 'Admin', role: 'admin' },
        { email: 'qa1@local.com', name: 'QA One', role: 'qa' },
        { email: 'qa2@local.com', name: 'QA Two', role: 'qa' },
      ],
    },
    ...overrides,
  };
}

describe('qa-release-task', () => {
  describe('createQAReleaseTask', () => {
    it('should create task with correct tag metadata (tag name, version, tier)', () => {
      const release = makeRelease();
      const config = makeConfig();

      const task = createQAReleaseTask(release, config);

      expect(task.tag).toBe('v1.0.0-rc.1');
      expect(task.title).toContain('v1.0.0-rc.1');
      expect(task.title).toContain('rc');
    });

    it('should include preview URL from release', () => {
      const release = makeRelease({ previewUrl: 'qa-v2.0.0-beta.1.example.com' });
      const config = makeConfig();

      const task = createQAReleaseTask(release, config);

      expect(task.previewUrl).toBe('qa-v2.0.0-beta.1.example.com');
    });

    it('should include gate results summary (pass/fail counts)', () => {
      const release = makeRelease({
        gateResults: {
          passed: false,
          results: [
            { gate: 'tests', status: 'pass', details: {} },
            { gate: 'security', status: 'fail', details: {} },
            { gate: 'coverage', status: 'pass', details: {} },
          ],
        },
      });
      const config = makeConfig();

      const task = createQAReleaseTask(release, config);

      expect(task.gateSummary).toContain('2');
      expect(task.gateSummary).toContain('1');
    });

    it('should assign to QA users from config (role=qa)', () => {
      const release = makeRelease();
      const config = makeConfig();

      const task = createQAReleaseTask(release, config);

      expect(task.assignee).toEqual([
        { email: 'qa1@local.com', name: 'QA One', role: 'qa' },
        { email: 'qa2@local.com', name: 'QA Two', role: 'qa' },
      ]);
    });

    it('should generate changelog from git commits array', () => {
      const release = makeRelease();
      const config = makeConfig();
      const commits = [
        { sha: 'aaa111', message: 'feat: add login page' },
        { sha: 'bbb222', message: 'fix: resolve crash on startup' },
      ];

      const task = createQAReleaseTask(release, config, { commits });

      expect(task.changelog).toContain('add login page');
      expect(task.changelog).toContain('resolve crash on startup');
    });

    it('should include test summary: total, passing, failing, coverage %', () => {
      const release = makeRelease();
      const config = makeConfig();
      const testSummary = { total: 100, passing: 95, failing: 5, coveragePercent: 87 };

      const task = createQAReleaseTask(release, config, { testSummary });

      expect(task.testSummary).toContain('100');
      expect(task.testSummary).toContain('95');
      expect(task.testSummary).toContain('5');
      expect(task.testSummary).toContain('87');
    });

    it('should include security scan summary (vulnerabilities found or clean)', () => {
      const release = makeRelease();
      const config = makeConfig();

      const taskClean = createQAReleaseTask(release, config, {
        securitySummary: { vulnerabilities: 0 },
      });
      expect(taskClean.securitySummary).toContain('0');

      const taskDirty = createQAReleaseTask(release, config, {
        securitySummary: { vulnerabilities: 3 },
      });
      expect(taskDirty.securitySummary).toContain('3');
    });

    it('should produce task format compatible with QATaskQueue component', () => {
      const release = makeRelease();
      const config = makeConfig();

      const task = createQAReleaseTask(release, config);

      // Must have all required QATaskQueue fields
      expect(task).toHaveProperty('id');
      expect(task).toHaveProperty('title');
      expect(task).toHaveProperty('description');
      expect(task).toHaveProperty('status');
      expect(task).toHaveProperty('assignee');
      expect(task).toHaveProperty('type');
      expect(typeof task.id).toBe('string');
      expect(typeof task.title).toBe('string');
      expect(typeof task.description).toBe('string');
    });

    it('should handle empty changelog gracefully', () => {
      const release = makeRelease();
      const config = makeConfig();

      const task = createQAReleaseTask(release, config, { commits: [] });

      expect(task.changelog).toBeDefined();
      expect(typeof task.changelog).toBe('string');
    });

    it('should handle missing QA users (unassigned)', () => {
      const release = makeRelease();
      const config = makeConfig({
        auth: {
          users: [
            { email: 'admin@local.com', name: 'Admin', role: 'admin' },
          ],
        },
      });

      const task = createQAReleaseTask(release, config);

      expect(task.assignee).toEqual([]);
    });

    it('should handle missing gate results (shows "pending")', () => {
      const release = makeRelease({ gateResults: null });
      const config = makeConfig();

      const task = createQAReleaseTask(release, config);

      expect(task.gateSummary).toContain('pending');
    });

    it('should include link to deployed preview environment', () => {
      const release = makeRelease({ previewUrl: 'qa-v1.0.0-rc.1.example.com' });
      const config = makeConfig();

      const task = createQAReleaseTask(release, config);

      expect(task.previewUrl).toBe('qa-v1.0.0-rc.1.example.com');
      expect(task.description).toContain('qa-v1.0.0-rc.1.example.com');
    });

    it('should start with status "pending"', () => {
      const release = makeRelease();
      const config = makeConfig();

      const task = createQAReleaseTask(release, config);

      expect(task.status).toBe('pending');
    });

    it('should have type "release-review"', () => {
      const release = makeRelease();
      const config = makeConfig();

      const task = createQAReleaseTask(release, config);

      expect(task.type).toBe('release-review');
    });

    it('should not create multiple tasks for same tag (idempotent)', () => {
      const release = makeRelease();
      const config = makeConfig();

      const task1 = createQAReleaseTask(release, config);
      const task2 = createQAReleaseTask(release, config);

      expect(task1.id).toBe(task2.id);
    });

    it('should include createdAt timestamp', () => {
      const release = makeRelease();
      const config = makeConfig();

      const task = createQAReleaseTask(release, config);

      expect(task.createdAt).toBeDefined();
      expect(typeof task.createdAt).toBe('string');
      // Should be valid ISO date
      expect(new Date(task.createdAt).toISOString()).toBe(task.createdAt);
    });
  });

  describe('formatChangelog', () => {
    it('should format commits as markdown list', () => {
      const commits = [
        { sha: 'aaa111', message: 'feat: add new feature' },
        { sha: 'bbb222', message: 'fix: resolve bug' },
      ];

      const result = formatChangelog(commits);

      expect(result).toContain('aaa111');
      expect(result).toContain('add new feature');
      expect(result).toContain('bbb222');
      expect(result).toContain('resolve bug');
    });

    it('should return empty string for empty commits array', () => {
      expect(formatChangelog([])).toBe('');
    });

    it('should return empty string for null/undefined commits', () => {
      expect(formatChangelog(null)).toBe('');
      expect(formatChangelog(undefined)).toBe('');
    });
  });

  describe('formatGateSummary', () => {
    it('should format gate results with pass/fail counts', () => {
      const gateResults = {
        passed: false,
        results: [
          { gate: 'tests', status: 'pass', details: {} },
          { gate: 'security', status: 'fail', details: {} },
          { gate: 'coverage', status: 'pass', details: {} },
        ],
      };

      const result = formatGateSummary(gateResults);

      expect(result).toContain('2');
      expect(result).toContain('1');
    });

    it('should return "pending" for null gate results', () => {
      const result = formatGateSummary(null);

      expect(result).toContain('pending');
    });
  });

  describe('getQAUsers', () => {
    it('should return only users with role=qa', () => {
      const config = makeConfig();

      const users = getQAUsers(config);

      expect(users).toHaveLength(2);
      expect(users[0].role).toBe('qa');
      expect(users[1].role).toBe('qa');
    });

    it('should return empty array when no QA users exist', () => {
      const config = makeConfig({
        auth: {
          users: [{ email: 'admin@local.com', name: 'Admin', role: 'admin' }],
        },
      });

      const users = getQAUsers(config);

      expect(users).toEqual([]);
    });

    it('should return empty array when auth config is missing', () => {
      expect(getQAUsers({})).toEqual([]);
      expect(getQAUsers(null)).toEqual([]);
      expect(getQAUsers(undefined)).toEqual([]);
    });
  });
});
