import { describe, it, expect } from 'vitest';
import {
  parseIssueArgs,
  getTrackerType,
  formatIssueDisplay,
  formatIssuesList,
  importIssue,
  mapTaskToIssueUpdate,
  generateSyncSummary,
  executeIssueCommand,
  createIssueCommand,
} from './issue-command.js';

describe('issue-command', () => {
  describe('parseIssueArgs', () => {
    it('returns defaults for empty args', () => {
      const options = parseIssueArgs('');

      expect(options.action).toBe('import');
      expect(options.issueId).toBeNull();
      expect(options.tracker).toBeNull();
      expect(options.dryRun).toBe(false);
    });

    it('parses action', () => {
      expect(parseIssueArgs('import').action).toBe('import');
      expect(parseIssueArgs('sync').action).toBe('sync');
      expect(parseIssueArgs('status').action).toBe('status');
      expect(parseIssueArgs('list').action).toBe('list');
    });

    it('parses issue ID', () => {
      const options = parseIssueArgs('import TLC-123');

      expect(options.action).toBe('import');
      expect(options.issueId).toBe('TLC-123');
    });

    it('parses --tracker flag', () => {
      const options = parseIssueArgs('import --tracker linear TLC-123');

      expect(options.tracker).toBe('linear');
      expect(options.issueId).toBe('TLC-123');
    });

    it('parses --output flag', () => {
      const options = parseIssueArgs('import TLC-123 --output specs/test.md');

      expect(options.output).toBe('specs/test.md');
    });

    it('parses --format flag', () => {
      const options = parseIssueArgs('import TLC-123 --format json');

      expect(options.format).toBe('json');
    });

    it('parses --json shorthand', () => {
      const options = parseIssueArgs('import TLC-123 --json');

      expect(options.format).toBe('json');
    });

    it('parses --dry-run flag', () => {
      const options = parseIssueArgs('sync --dry-run');

      expect(options.dryRun).toBe(true);
    });

    it('parses multiple flags', () => {
      const options = parseIssueArgs('import TLC-123 --tracker jira --output test.md --dry-run');

      expect(options.action).toBe('import');
      expect(options.issueId).toBe('TLC-123');
      expect(options.tracker).toBe('jira');
      expect(options.output).toBe('test.md');
      expect(options.dryRun).toBe(true);
    });
  });

  describe('getTrackerType', () => {
    it('returns override if provided', () => {
      const config = { issueTracker: { type: 'linear' } };
      expect(getTrackerType(config, 'jira')).toBe('jira');
    });

    it('returns config type if no override', () => {
      const config = { issueTracker: { type: 'linear' } };
      expect(getTrackerType(config, null)).toBe('linear');
    });

    it('defaults to github', () => {
      expect(getTrackerType({}, null)).toBe('github');
      expect(getTrackerType({ issueTracker: {} }, null)).toBe('github');
    });
  });

  describe('formatIssueDisplay', () => {
    it('formats issue for display', () => {
      const issue = {
        id: 'TLC-123',
        title: 'Add login feature',
        status: 'in_progress',
        priority: 'high',
        assignee: 'Alice',
        labels: ['feature', 'auth'],
        url: 'https://example.com/issue/123',
        description: 'Users need to log in',
      };

      const output = formatIssueDisplay(issue);

      expect(output).toContain('TLC-123');
      expect(output).toContain('Add login feature');
      expect(output).toContain('in_progress');
      expect(output).toContain('high');
      expect(output).toContain('Alice');
      expect(output).toContain('feature');
    });

    it('truncates long descriptions', () => {
      const issue = {
        id: 'TEST-1',
        title: 'Test',
        status: 'todo',
        priority: 'medium',
        labels: [],
        description: 'x'.repeat(600),
      };

      const output = formatIssueDisplay(issue);

      expect(output).toContain('...');
      expect(output.length).toBeLessThan(700);
    });

    it('handles missing optional fields', () => {
      const issue = {
        id: 'TEST-1',
        title: 'Test',
        status: 'todo',
        priority: 'medium',
        labels: [],
      };

      const output = formatIssueDisplay(issue);

      expect(output).toContain('TEST-1');
      expect(output).not.toContain('Assignee');
    });
  });

  describe('formatIssuesList', () => {
    it('formats issues as table', () => {
      const issues = [
        { id: 'TLC-1', title: 'First issue', status: 'todo', priority: 'high', assignee: 'Alice' },
        { id: 'TLC-2', title: 'Second issue', status: 'done', priority: 'low', assignee: null },
      ];

      const output = formatIssuesList(issues);

      expect(output).toContain('Issues');
      expect(output).toContain('TLC-1');
      expect(output).toContain('TLC-2');
      expect(output).toContain('Alice');
      expect(output).toContain('-'); // null assignee
    });

    it('truncates long titles', () => {
      const issues = [
        {
          id: 'TLC-1',
          title: 'This is a very long title that should be truncated for display',
          status: 'todo',
          priority: 'medium',
        },
      ];

      const output = formatIssuesList(issues);

      expect(output).toContain('...');
    });
  });

  describe('importIssue', () => {
    it('imports and generates test spec', () => {
      const issue = {
        number: 42,
        title: 'Add feature',
        body: '- [ ] Should work\n- [ ] Should handle errors',
        state: 'open',
        labels: [{ name: 'feature' }],
      };

      const result = importIssue(issue, 'github', { format: 'markdown' });

      expect(result.issue.id).toBe('#42');
      expect(result.testSpec.title).toBe('Add feature');
      expect(result.markdown).toContain('Test Spec');
    });

    it('returns JSON format', () => {
      const issue = {
        number: 1,
        title: 'Test',
        body: '',
        state: 'open',
        labels: [],
      };

      const result = importIssue(issue, 'github', { format: 'json' });

      expect(result.json).toBeDefined();
      expect(JSON.parse(result.json).title).toBe('Test');
    });
  });

  describe('mapTaskToIssueUpdate', () => {
    it('maps completed task to done', () => {
      const task = { id: 'task-1', issueId: 'TLC-123', status: 'completed' };
      const update = mapTaskToIssueUpdate(task, 'linear');

      expect(update.tlcStatus).toBe('done');
      expect(update.status).toBe('Done');
    });

    it('maps in_progress task', () => {
      const task = { id: 'task-1', issueId: 'TLC-123', status: 'in_progress' };
      const update = mapTaskToIssueUpdate(task, 'github');

      expect(update.tlcStatus).toBe('in_progress');
      expect(update.status).toBe('open');
    });

    it('maps todo task', () => {
      const task = { id: 'task-1', issueId: 'TLC-123', status: 'pending' };
      const update = mapTaskToIssueUpdate(task, 'jira');

      expect(update.tlcStatus).toBe('todo');
      expect(update.status).toBe('To Do');
    });

    it('includes task and issue IDs', () => {
      const task = { id: 'task-1', issueId: 'TLC-123', status: 'done' };
      const update = mapTaskToIssueUpdate(task, 'github');

      expect(update.taskId).toBe('task-1');
      expect(update.issueId).toBe('TLC-123');
    });
  });

  describe('generateSyncSummary', () => {
    it('generates summary for updates', () => {
      const updates = [
        { issueId: 'TLC-1', tlcStatus: 'done', status: 'Done' },
        { issueId: 'TLC-2', tlcStatus: 'in_progress', status: 'In Progress' },
      ];

      const summary = generateSyncSummary(updates);

      expect(summary).toContain('Sync Summary');
      expect(summary).toContain('TLC-1');
      expect(summary).toContain('TLC-2');
      expect(summary).toContain('done');
    });

    it('handles empty updates', () => {
      const summary = generateSyncSummary([]);

      expect(summary).toContain('No updates');
    });
  });

  describe('executeIssueCommand', () => {
    it('imports issue with data', async () => {
      const issueData = {
        number: 42,
        title: 'Test issue',
        body: '- [ ] Test this',
        state: 'open',
        labels: [],
      };

      const result = await executeIssueCommand('import', {
        projectDir: '/tmp',
        issueData,
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('import');
      expect(result.issue.id).toBe('#42');
    });

    it('returns error without issue data or ID', async () => {
      const result = await executeIssueCommand('import', {
        projectDir: '/tmp',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No issue');
    });

    it('lists issues', async () => {
      const issues = [
        { number: 1, title: 'First', state: 'open', labels: [] },
        { number: 2, title: 'Second', state: 'closed', labels: [] },
      ];

      const result = await executeIssueCommand('list', {
        projectDir: '/tmp',
        issues,
      });

      expect(result.success).toBe(true);
      expect(result.issues).toHaveLength(2);
      expect(result.output).toContain('#1');
    });

    it('shows issue status', async () => {
      const issueData = {
        number: 42,
        title: 'Test',
        body: 'Description',
        state: 'open',
        labels: [],
      };

      const result = await executeIssueCommand('status TLC-42', {
        projectDir: '/tmp',
        issueData,
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain('#42');
    });

    it('syncs task statuses', async () => {
      const tasks = [
        { id: 'task-1', issueId: 'TLC-1', status: 'completed' },
        { id: 'task-2', issueId: 'TLC-2', status: 'in_progress' },
      ];

      const result = await executeIssueCommand('sync', {
        projectDir: '/tmp',
        tasks,
      });

      expect(result.success).toBe(true);
      expect(result.updates).toHaveLength(2);
    });

    it('filters tasks without issueId in sync', async () => {
      const tasks = [
        { id: 'task-1', issueId: 'TLC-1', status: 'completed' },
        { id: 'task-2', status: 'in_progress' }, // No issueId
      ];

      const result = await executeIssueCommand('sync', {
        projectDir: '/tmp',
        tasks,
      });

      expect(result.updates).toHaveLength(1);
    });

    it('respects tracker override', async () => {
      const result = await executeIssueCommand('import TLC-123 --tracker linear', {
        projectDir: '/tmp',
      });

      expect(result.trackerType).toBe('linear');
    });
  });

  describe('createIssueCommand', () => {
    it('creates command handler', () => {
      const handler = createIssueCommand();

      expect(handler.execute).toBeDefined();
      expect(handler.parseArgs).toBeDefined();
      expect(handler.importIssue).toBeDefined();
      expect(handler.formatIssueDisplay).toBeDefined();
    });

    it('exposes parseArgs function', () => {
      const handler = createIssueCommand();
      const options = handler.parseArgs('import TLC-123 --tracker jira');

      expect(options.issueId).toBe('TLC-123');
      expect(options.tracker).toBe('jira');
    });
  });
});
