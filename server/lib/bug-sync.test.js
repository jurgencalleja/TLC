import { describe, it, expect } from 'vitest';
import {
  BUG_STATUS,
  parseBugFromMarkdown,
  parseBugsFile,
  formatBugMarkdown,
  bugToIssue,
  formatBugDescription,
  issueToBug,
  mapIssueStatusToBugStatus,
  mapBugStatusToIssueStatus,
  findBugsToSync,
  findStatusUpdates,
  generateBugId,
  generateSyncReport,
  createBugSync,
} from './bug-sync.js';

describe('bug-sync', () => {
  describe('BUG_STATUS', () => {
    it('defines status constants', () => {
      expect(BUG_STATUS.OPEN).toBe('open');
      expect(BUG_STATUS.IN_PROGRESS).toBe('in_progress');
      expect(BUG_STATUS.FIXED).toBe('fixed');
      expect(BUG_STATUS.CLOSED).toBe('closed');
    });
  });

  describe('parseBugFromMarkdown', () => {
    it('parses bug header', () => {
      const text = '## BUG-001: Login fails on Safari';
      const bug = parseBugFromMarkdown(text);

      expect(bug.id).toBe('BUG-001');
      expect(bug.title).toBe('Login fails on Safari');
    });

    it('parses all metadata fields', () => {
      const text = `## BUG-042: Test bug
**Status:** in_progress
**Priority:** high
**Reporter:** @alice
**Assignee:** @bob
**Issue:** TLC-123
**Created:** 2024-01-15
**Labels:** critical, frontend
`;

      const bug = parseBugFromMarkdown(text);

      expect(bug.status).toBe('in_progress');
      expect(bug.priority).toBe('high');
      expect(bug.reporter).toBe('alice');
      expect(bug.assignee).toBe('bob');
      expect(bug.issueId).toBe('TLC-123');
      expect(bug.createdAt).toBe('2024-01-15');
      expect(bug.labels).toContain('critical');
      expect(bug.labels).toContain('frontend');
    });

    it('parses description section', () => {
      const text = `## BUG-001: Test

### Description

This is the bug description.
It spans multiple lines.

### Steps to Reproduce
`;

      const bug = parseBugFromMarkdown(text);

      expect(bug.description).toContain('bug description');
      expect(bug.description).toContain('multiple lines');
    });

    it('handles missing fields', () => {
      const text = '## BUG-001: Minimal bug';
      const bug = parseBugFromMarkdown(text);

      expect(bug.status).toBe('open');
      expect(bug.priority).toBe('medium');
      expect(bug.reporter).toBeNull();
      expect(bug.assignee).toBeNull();
    });
  });

  describe('parseBugsFile', () => {
    it('parses multiple bugs', () => {
      const content = `# Bugs

## BUG-001: First bug
**Status:** open

---

## BUG-002: Second bug
**Status:** fixed

---
`;

      const bugs = parseBugsFile(content);

      expect(bugs).toHaveLength(2);
      expect(bugs[0].id).toBe('BUG-001');
      expect(bugs[1].id).toBe('BUG-002');
    });

    it('returns empty for null content', () => {
      expect(parseBugsFile(null)).toEqual([]);
      expect(parseBugsFile('')).toEqual([]);
    });
  });

  describe('formatBugMarkdown', () => {
    it('formats bug as markdown', () => {
      const bug = {
        id: 'BUG-001',
        title: 'Test bug',
        status: 'open',
        priority: 'high',
        reporter: 'alice',
        assignee: 'bob',
        issueId: 'TLC-123',
        createdAt: '2024-01-15',
        labels: ['critical'],
        description: 'Bug description here',
      };

      const markdown = formatBugMarkdown(bug);

      expect(markdown).toContain('## BUG-001: Test bug');
      expect(markdown).toContain('**Status:** open');
      expect(markdown).toContain('**Priority:** high');
      expect(markdown).toContain('@alice');
      expect(markdown).toContain('@bob');
      expect(markdown).toContain('TLC-123');
      expect(markdown).toContain('Bug description here');
    });

    it('omits missing optional fields', () => {
      const bug = {
        id: 'BUG-001',
        title: 'Minimal',
        status: 'open',
        priority: 'medium',
        labels: [],
      };

      const markdown = formatBugMarkdown(bug);

      expect(markdown).not.toContain('Reporter');
      expect(markdown).not.toContain('Assignee');
      expect(markdown).not.toContain('Labels');
    });
  });

  describe('bugToIssue', () => {
    it('converts bug to GitHub issue format', () => {
      const bug = {
        id: 'BUG-001',
        title: 'Login fails',
        description: 'Cannot log in',
        priority: 'high',
        reporter: 'alice',
        labels: ['frontend'],
      };

      const issue = bugToIssue(bug, 'github');

      expect(issue.title).toBe('[BUG] Login fails');
      expect(issue.body).toContain('Bug Report');
      expect(issue.labels).toContain('bug');
      expect(issue.labels).toContain('priority:high');
    });

    it('converts to Linear format', () => {
      const bug = {
        id: 'BUG-001',
        title: 'Test',
        description: 'Desc',
        priority: 'medium',
        labels: [],
      };

      const issue = bugToIssue(bug, 'linear');

      expect(issue.description).toBeDefined();
      expect(issue.body).toBeUndefined();
    });

    it('converts to Jira format', () => {
      const bug = {
        id: 'BUG-001',
        title: 'Test',
        description: 'Desc',
        priority: 'medium',
        labels: [],
      };

      const issue = bugToIssue(bug, 'jira');

      expect(issue.fields).toBeDefined();
      expect(issue.fields.issuetype.name).toBe('Bug');
    });
  });

  describe('formatBugDescription', () => {
    it('formats description for issue tracker', () => {
      const bug = {
        id: 'BUG-001',
        title: 'Test',
        description: 'Bug details here',
        priority: 'high',
        reporter: 'alice',
        createdAt: '2024-01-15',
      };

      const desc = formatBugDescription(bug);

      expect(desc).toContain('Bug Report');
      expect(desc).toContain('BUG-001');
      expect(desc).toContain('high');
      expect(desc).toContain('alice');
      expect(desc).toContain('Bug details here');
    });
  });

  describe('issueToBug', () => {
    it('converts issue to bug format', () => {
      const issue = {
        id: '#42',
        title: '[BUG] Login fails',
        description: 'Cannot log in',
        status: 'todo',
        priority: 'high',
        assignee: 'bob',
        labels: ['bug', 'frontend'],
        createdAt: '2024-01-15',
      };

      const bug = issueToBug(issue);

      expect(bug.title).toBe('Login fails');
      expect(bug.status).toBe('open');
      expect(bug.issueId).toBe('#42');
      expect(bug.isBug).toBe(true);
    });

    it('detects non-bug issues', () => {
      const issue = {
        id: '#42',
        title: 'Add feature',
        description: 'New feature',
        status: 'todo',
        priority: 'medium',
        labels: ['feature'],
      };

      const bug = issueToBug(issue);

      expect(bug.isBug).toBe(false);
    });
  });

  describe('mapIssueStatusToBugStatus', () => {
    it('maps todo to open', () => {
      expect(mapIssueStatusToBugStatus('todo')).toBe('open');
    });

    it('maps in_progress', () => {
      expect(mapIssueStatusToBugStatus('in_progress')).toBe('in_progress');
    });

    it('maps done to fixed', () => {
      expect(mapIssueStatusToBugStatus('done')).toBe('fixed');
    });

    it('maps cancelled to wontfix', () => {
      expect(mapIssueStatusToBugStatus('cancelled')).toBe('wontfix');
    });

    it('defaults to open', () => {
      expect(mapIssueStatusToBugStatus('unknown')).toBe('open');
    });
  });

  describe('mapBugStatusToIssueStatus', () => {
    it('maps open to todo', () => {
      expect(mapBugStatusToIssueStatus('open')).toBe('todo');
    });

    it('maps fixed/verified/closed to done', () => {
      expect(mapBugStatusToIssueStatus('fixed')).toBe('done');
      expect(mapBugStatusToIssueStatus('verified')).toBe('done');
      expect(mapBugStatusToIssueStatus('closed')).toBe('done');
    });

    it('maps wontfix to cancelled', () => {
      expect(mapBugStatusToIssueStatus('wontfix')).toBe('cancelled');
    });
  });

  describe('findBugsToSync', () => {
    it('finds bugs without issueId', () => {
      const bugs = [
        { id: 'BUG-001', issueId: 'TLC-1', status: 'open' },
        { id: 'BUG-002', issueId: null, status: 'open' },
        { id: 'BUG-003', status: 'open' },
      ];

      const toSync = findBugsToSync(bugs);

      expect(toSync).toHaveLength(2);
      expect(toSync.map(b => b.id)).toContain('BUG-002');
      expect(toSync.map(b => b.id)).toContain('BUG-003');
    });

    it('excludes closed bugs', () => {
      const bugs = [
        { id: 'BUG-001', status: 'open' },
        { id: 'BUG-002', status: 'closed' },
      ];

      const toSync = findBugsToSync(bugs);

      expect(toSync).toHaveLength(1);
      expect(toSync[0].id).toBe('BUG-001');
    });
  });

  describe('findStatusUpdates', () => {
    it('finds bugs with status mismatch', () => {
      const bugs = [
        { id: 'BUG-001', issueId: '#1', status: 'open' },
        { id: 'BUG-002', issueId: '#2', status: 'open' },
      ];

      const issues = [
        { id: '#1', status: 'done' },
        { id: '#2', status: 'todo' },
      ];

      const updates = findStatusUpdates(bugs, issues);

      expect(updates).toHaveLength(1);
      expect(updates[0].bugId).toBe('BUG-001');
      expect(updates[0].newStatus).toBe('fixed');
    });

    it('skips bugs without linked issues', () => {
      const bugs = [{ id: 'BUG-001', status: 'open' }];
      const issues = [{ id: '#1', status: 'done' }];

      const updates = findStatusUpdates(bugs, issues);

      expect(updates).toHaveLength(0);
    });
  });

  describe('generateBugId', () => {
    it('generates next sequential ID', () => {
      const bugs = [
        { id: 'BUG-001' },
        { id: 'BUG-002' },
        { id: 'BUG-005' },
      ];

      expect(generateBugId(bugs)).toBe('BUG-006');
    });

    it('starts at 001 for empty list', () => {
      expect(generateBugId([])).toBe('BUG-001');
    });

    it('pads ID with zeros', () => {
      const bugs = [{ id: 'BUG-009' }];
      expect(generateBugId(bugs)).toBe('BUG-010');
    });
  });

  describe('generateSyncReport', () => {
    it('generates report for created issues', () => {
      const result = {
        created: [{ bugId: 'BUG-001', issueId: 'TLC-1' }],
        updated: [],
        imported: [],
      };

      const report = generateSyncReport(result);

      expect(report).toContain('Created Issues');
      expect(report).toContain('BUG-001');
      expect(report).toContain('TLC-1');
    });

    it('generates report for status updates', () => {
      const result = {
        created: [],
        updated: [
          { bugId: 'BUG-001', issueId: 'TLC-1', currentStatus: 'open', newStatus: 'fixed' },
        ],
        imported: [],
      };

      const report = generateSyncReport(result);

      expect(report).toContain('Status Updates');
      expect(report).toContain('open');
      expect(report).toContain('fixed');
    });

    it('generates report for imported bugs', () => {
      const result = {
        created: [],
        updated: [],
        imported: [{ issueId: '#42', bugId: 'BUG-001' }],
      };

      const report = generateSyncReport(result);

      expect(report).toContain('Imported Bugs');
      expect(report).toContain('#42');
    });

    it('handles no changes', () => {
      const result = { created: [], updated: [], imported: [] };
      const report = generateSyncReport(result);

      expect(report).toContain('No changes');
    });
  });

  describe('createBugSync', () => {
    it('creates handler with all methods', () => {
      const handler = createBugSync();

      expect(handler.parseBugFromMarkdown).toBeDefined();
      expect(handler.parseBugsFile).toBeDefined();
      expect(handler.formatBugMarkdown).toBeDefined();
      expect(handler.bugToIssue).toBeDefined();
      expect(handler.issueToBug).toBeDefined();
      expect(handler.findBugsToSync).toBeDefined();
      expect(handler.findStatusUpdates).toBeDefined();
      expect(handler.generateBugId).toBeDefined();
      expect(handler.generateSyncReport).toBeDefined();
    });
  });
});
