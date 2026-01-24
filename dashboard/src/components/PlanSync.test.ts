import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseTasksFromPlan, isPlanApproved, approvePlan } from './PlanSync.js';
import { vol } from 'memfs';

// Mock fs modules
vi.mock('fs', async () => {
  const memfs = await import('memfs');
  return memfs.fs;
});

vi.mock('fs/promises', async () => {
  const memfs = await import('memfs');
  return memfs.fs.promises;
});

describe('PlanSync', () => {
  beforeEach(() => {
    vol.reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('parseTasksFromPlan', () => {
    it('returns empty array for non-existent file', async () => {
      const tasks = await parseTasksFromPlan('/fake/path.md');
      expect(tasks).toEqual([]);
    });

    it('parses markdown task format (## Task N: Title)', async () => {
      vol.fromJSON({
        '/plan.md': `# Phase 1 Plan

## Task 1: Setup authentication
Configure JWT tokens and session management.

## Task 2: Create login endpoint
Build POST /api/login route.
`
      });

      const tasks = await parseTasksFromPlan('/plan.md');

      expect(tasks).toHaveLength(2);
      expect(tasks[0]).toMatchObject({
        id: 'task-1',
        title: 'Setup authentication',
      });
      expect(tasks[0].description).toContain('Configure JWT');
      expect(tasks[1]).toMatchObject({
        id: 'task-2',
        title: 'Create login endpoint',
      });
    });

    it('parses XML task format (<task id="...">)', async () => {
      vol.fromJSON({
        '/plan.md': `# Phase 1

<task id="01-01">
Setup the database connection
</task>

<task id="01-02">
Create user model
</task>
`
      });

      const tasks = await parseTasksFromPlan('/plan.md');

      expect(tasks).toHaveLength(2);
      expect(tasks[0].id).toBe('01-01');
      expect(tasks[1].id).toBe('01-02');
    });

    it('truncates description to 500 chars', async () => {
      const longDescription = 'A'.repeat(600);
      vol.fromJSON({
        '/plan.md': `## Task 1: Long task\n${longDescription}`
      });

      const tasks = await parseTasksFromPlan('/plan.md');

      expect(tasks[0].description.length).toBeLessThanOrEqual(500);
    });
  });

  describe('isPlanApproved', () => {
    it('returns false for non-existent file', async () => {
      const result = await isPlanApproved('/fake/plan.md');
      expect(result).toBe(false);
    });

    it('returns true when file contains [APPROVED]', async () => {
      vol.fromJSON({
        '/plan.md': `# Plan [APPROVED]\n\nSome content`
      });

      const result = await isPlanApproved('/plan.md');
      expect(result).toBe(true);
    });

    it('returns true when file contains Status: Approved', async () => {
      vol.fromJSON({
        '/plan.md': `# Plan\n\n> **Status: Approved**\n\nContent`
      });

      const result = await isPlanApproved('/plan.md');
      expect(result).toBe(true);
    });

    it('returns false when not approved', async () => {
      vol.fromJSON({
        '/plan.md': `# Plan\n\nNot yet approved.`
      });

      const result = await isPlanApproved('/plan.md');
      expect(result).toBe(false);
    });
  });

  describe('approvePlan', () => {
    it('does nothing for non-existent file', async () => {
      await approvePlan('/fake/plan.md');
      // No error thrown
    });

    it('adds approval status after first heading', async () => {
      vol.fromJSON({
        '/plan.md': `# My Plan\n\n## Task 1: Something`
      });

      await approvePlan('/plan.md');

      const content = vol.readFileSync('/plan.md', 'utf-8') as string;
      expect(content).toContain('Status: Approved');
      expect(content).toContain('Tasks synced to GitHub');
    });
  });
});
