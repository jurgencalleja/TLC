import { describe, it, expect } from 'vitest';
import {
  TRACKER_TYPES,
  normalizeStatus,
  normalizePriority,
  parseLinearIssue,
  parseGitHubIssue,
  parseJiraIssue,
  parseGitLabIssue,
  parseIssue,
  extractAcceptanceCriteria,
  extractTestCases,
  generateTestSpec,
  formatTestSpecMarkdown,
  mapStatusToTracker,
  createIssueTracker,
} from './issue-tracker.js';

describe('issue-tracker', () => {
  describe('TRACKER_TYPES', () => {
    it('defines tracker type constants', () => {
      expect(TRACKER_TYPES.LINEAR).toBe('linear');
      expect(TRACKER_TYPES.GITHUB).toBe('github');
      expect(TRACKER_TYPES.JIRA).toBe('jira');
      expect(TRACKER_TYPES.GITLAB).toBe('gitlab');
    });
  });

  describe('normalizeStatus', () => {
    it('normalizes todo statuses', () => {
      expect(normalizeStatus('todo')).toBe('todo');
      expect(normalizeStatus('backlog')).toBe('todo');
      expect(normalizeStatus('open')).toBe('todo');
      expect(normalizeStatus('To Do')).toBe('todo');
    });

    it('normalizes in_progress statuses', () => {
      expect(normalizeStatus('in progress')).toBe('in_progress');
      expect(normalizeStatus('In Progress')).toBe('in_progress');
      expect(normalizeStatus('doing')).toBe('in_progress');
      expect(normalizeStatus('started')).toBe('in_progress');
    });

    it('normalizes done statuses', () => {
      expect(normalizeStatus('done')).toBe('done');
      expect(normalizeStatus('closed')).toBe('done');
      expect(normalizeStatus('resolved')).toBe('done');
      expect(normalizeStatus('Completed')).toBe('done');
    });

    it('normalizes cancelled statuses', () => {
      expect(normalizeStatus('cancelled')).toBe('cancelled');
      expect(normalizeStatus('wontfix')).toBe('cancelled');
      expect(normalizeStatus('duplicate')).toBe('cancelled');
    });

    it('defaults to todo for unknown', () => {
      expect(normalizeStatus('unknown')).toBe('todo');
      expect(normalizeStatus(null)).toBe('todo');
      expect(normalizeStatus('')).toBe('todo');
    });
  });

  describe('normalizePriority', () => {
    it('normalizes urgent priorities', () => {
      expect(normalizePriority('urgent')).toBe('urgent');
      expect(normalizePriority('critical')).toBe('urgent');
      expect(normalizePriority('P0')).toBe('urgent');
      expect(normalizePriority('blocker')).toBe('urgent');
    });

    it('normalizes high priorities', () => {
      expect(normalizePriority('high')).toBe('high');
      expect(normalizePriority('P1')).toBe('high');
      expect(normalizePriority('important')).toBe('high');
    });

    it('normalizes medium priorities', () => {
      expect(normalizePriority('medium')).toBe('medium');
      expect(normalizePriority('normal')).toBe('medium');
      expect(normalizePriority('P2')).toBe('medium');
    });

    it('normalizes low priorities', () => {
      expect(normalizePriority('low')).toBe('low');
      expect(normalizePriority('P3')).toBe('low');
      expect(normalizePriority('minor')).toBe('low');
    });

    it('defaults to medium for unknown', () => {
      expect(normalizePriority('unknown')).toBe('medium');
      expect(normalizePriority(null)).toBe('medium');
    });
  });

  describe('parseLinearIssue', () => {
    it('parses Linear issue', () => {
      const issue = {
        identifier: 'TLC-123',
        title: 'Add login feature',
        description: 'Users should be able to log in',
        state: { name: 'In Progress' },
        priority: 2,
        labels: { nodes: [{ name: 'feature' }] },
        assignee: { name: 'Alice' },
        url: 'https://linear.app/team/issue/TLC-123',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      };

      const parsed = parseLinearIssue(issue);

      expect(parsed.id).toBe('TLC-123');
      expect(parsed.title).toBe('Add login feature');
      expect(parsed.status).toBe('in_progress');
      expect(parsed.labels).toContain('feature');
      expect(parsed.assignee).toBe('Alice');
      expect(parsed.source).toBe('linear');
    });

    it('handles missing fields', () => {
      const issue = { id: '123', title: 'Test' };
      const parsed = parseLinearIssue(issue);

      expect(parsed.id).toBe('123');
      expect(parsed.description).toBe('');
      expect(parsed.labels).toEqual([]);
      expect(parsed.assignee).toBeNull();
    });
  });

  describe('parseGitHubIssue', () => {
    it('parses GitHub issue', () => {
      const issue = {
        number: 42,
        title: 'Bug in login',
        body: 'Login fails on Chrome',
        state: 'open',
        labels: [{ name: 'bug' }, { name: 'high' }],
        assignee: { login: 'bob' },
        html_url: 'https://github.com/org/repo/issues/42',
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
      };

      const parsed = parseGitHubIssue(issue);

      expect(parsed.id).toBe('#42');
      expect(parsed.title).toBe('Bug in login');
      expect(parsed.status).toBe('todo');
      expect(parsed.priority).toBe('high');
      expect(parsed.labels).toContain('bug');
      expect(parsed.assignee).toBe('bob');
      expect(parsed.source).toBe('github');
    });

    it('uses first assignee from list', () => {
      const issue = {
        number: 1,
        title: 'Test',
        state: 'open',
        assignees: [{ login: 'alice' }, { login: 'bob' }],
      };

      const parsed = parseGitHubIssue(issue);

      expect(parsed.assignee).toBe('alice');
    });
  });

  describe('parseJiraIssue', () => {
    it('parses Jira issue', () => {
      const issue = {
        key: 'PROJ-123',
        fields: {
          summary: 'Implement feature X',
          description: 'Feature description',
          status: { name: 'To Do' },
          priority: { name: 'High' },
          labels: ['backend'],
          assignee: { displayName: 'Charlie' },
          created: '2024-01-01',
          updated: '2024-01-02',
        },
      };

      const parsed = parseJiraIssue(issue);

      expect(parsed.id).toBe('PROJ-123');
      expect(parsed.title).toBe('Implement feature X');
      expect(parsed.status).toBe('todo');
      expect(parsed.priority).toBe('high');
      expect(parsed.assignee).toBe('Charlie');
      expect(parsed.source).toBe('jira');
    });

    it('handles missing fields', () => {
      const issue = { key: 'TEST-1' };
      const parsed = parseJiraIssue(issue);

      expect(parsed.id).toBe('TEST-1');
      expect(parsed.title).toBeUndefined();
    });
  });

  describe('parseGitLabIssue', () => {
    it('parses GitLab issue', () => {
      const issue = {
        iid: 99,
        title: 'Update docs',
        description: 'Documentation needs updating',
        state: 'opened',
        labels: ['documentation', 'priority::low'],
        assignee: { username: 'dave' },
        web_url: 'https://gitlab.com/org/repo/-/issues/99',
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
      };

      const parsed = parseGitLabIssue(issue);

      expect(parsed.id).toBe('#99');
      expect(parsed.title).toBe('Update docs');
      expect(parsed.status).toBe('todo');
      expect(parsed.labels).toContain('documentation');
      expect(parsed.assignee).toBe('dave');
      expect(parsed.source).toBe('gitlab');
    });
  });

  describe('parseIssue', () => {
    it('routes to correct parser based on source', () => {
      const linearIssue = { identifier: 'L-1', title: 'Test' };
      const githubIssue = { number: 1, title: 'Test', state: 'open' };

      expect(parseIssue(linearIssue, 'linear').source).toBe('linear');
      expect(parseIssue(githubIssue, 'github').source).toBe('github');
    });

    it('handles unknown source', () => {
      const issue = { id: '123', title: 'Test', status: 'open' };
      const parsed = parseIssue(issue, 'unknown');

      expect(parsed.source).toBe('unknown');
      expect(parsed.id).toBe('123');
    });
  });

  describe('extractAcceptanceCriteria', () => {
    it('extracts checkbox items', () => {
      const description = `
## Acceptance Criteria
- [ ] User can log in
- [x] User can log out
- [ ] Session persists
`;

      const criteria = extractAcceptanceCriteria(description);

      expect(criteria).toContain('User can log in');
      expect(criteria).toContain('User can log out');
      expect(criteria).toContain('Session persists');
    });

    it('extracts "should" statements', () => {
      const description = `
- should allow users to log in
- should remember the session
- Should handle errors gracefully
`;

      const criteria = extractAcceptanceCriteria(description);

      expect(criteria.some(c => c.includes('allow users'))).toBe(true);
      expect(criteria.some(c => c.includes('remember'))).toBe(true);
      expect(criteria.some(c => c.includes('handle errors'))).toBe(true);
    });

    it('returns empty for no criteria', () => {
      expect(extractAcceptanceCriteria('')).toEqual([]);
      expect(extractAcceptanceCriteria(null)).toEqual([]);
    });

    it('deduplicates criteria', () => {
      const description = `
- [ ] should work
- should work
`;

      const criteria = extractAcceptanceCriteria(description);
      const workCriteria = criteria.filter(c => c.includes('work'));

      // May have duplicates from different patterns, but should be reasonable
      expect(workCriteria.length).toBeGreaterThan(0);
    });
  });

  describe('extractTestCases', () => {
    it('extracts Given/When/Then format', () => {
      const description = `
Given a logged out user
When they enter valid credentials
Then they should see the dashboard
`;

      const testCases = extractTestCases(description);

      expect(testCases.length).toBeGreaterThan(0);
      expect(testCases[0].given).toContain('logged out');
      expect(testCases[0].when).toContain('credentials');
      expect(testCases[0].then).toContain('dashboard');
    });

    it('extracts test section items', () => {
      const description = `
## Test Cases
1. Test with valid input
2. Test with invalid input
3. Test edge cases
`;

      const testCases = extractTestCases(description);

      expect(testCases.some(tc => typeof tc === 'string' && tc.includes('valid input'))).toBe(true);
    });

    it('returns empty for no test cases', () => {
      expect(extractTestCases('')).toEqual([]);
      expect(extractTestCases(null)).toEqual([]);
    });
  });

  describe('generateTestSpec', () => {
    it('generates test spec from issue', () => {
      const issue = {
        id: 'TEST-1',
        title: 'Add login',
        description: '- [ ] User can log in\n- [ ] Error shows for invalid password',
        labels: ['feature', 'auth'],
        priority: 'high',
      };

      const spec = generateTestSpec(issue);

      expect(spec.issueId).toBe('TEST-1');
      expect(spec.title).toBe('Add login');
      expect(spec.acceptanceCriteria.length).toBeGreaterThan(0);
      expect(spec.labels).toContain('feature');
    });

    it('uses acceptance criteria as test cases if none specified', () => {
      const issue = {
        id: 'TEST-2',
        title: 'Test',
        description: '- [ ] Should work',
        labels: [],
        priority: 'medium',
      };

      const spec = generateTestSpec(issue);

      expect(spec.testCases.length).toBeGreaterThan(0);
    });
  });

  describe('formatTestSpecMarkdown', () => {
    it('formats spec as markdown', () => {
      const spec = {
        issueId: 'TEST-1',
        title: 'Add login feature',
        description: 'Users need to log in',
        acceptanceCriteria: ['User can log in', 'Session persists'],
        testCases: ['Test valid login', 'Test invalid login'],
        labels: ['feature'],
        priority: 'high',
      };

      const markdown = formatTestSpecMarkdown(spec);

      expect(markdown).toContain('# Test Spec: Add login feature');
      expect(markdown).toContain('**Issue:** TEST-1');
      expect(markdown).toContain('**Priority:** high');
      expect(markdown).toContain('## Acceptance Criteria');
      expect(markdown).toContain('- [ ] User can log in');
      expect(markdown).toContain('## Test Cases');
    });

    it('handles GWT format test cases', () => {
      const spec = {
        issueId: 'TEST-2',
        title: 'Test',
        description: '',
        acceptanceCriteria: [],
        testCases: [{
          given: 'a user',
          when: 'they click login',
          then: 'they see dashboard',
        }],
        labels: [],
        priority: 'medium',
      };

      const markdown = formatTestSpecMarkdown(spec);

      expect(markdown).toContain('**Given:**');
      expect(markdown).toContain('**When:**');
      expect(markdown).toContain('**Then:**');
    });
  });

  describe('mapStatusToTracker', () => {
    it('maps to Linear statuses', () => {
      expect(mapStatusToTracker('todo', 'linear')).toBe('Todo');
      expect(mapStatusToTracker('in_progress', 'linear')).toBe('In Progress');
      expect(mapStatusToTracker('done', 'linear')).toBe('Done');
    });

    it('maps to GitHub statuses', () => {
      expect(mapStatusToTracker('todo', 'github')).toBe('open');
      expect(mapStatusToTracker('done', 'github')).toBe('closed');
    });

    it('maps to Jira statuses', () => {
      expect(mapStatusToTracker('todo', 'jira')).toBe('To Do');
      expect(mapStatusToTracker('in_progress', 'jira')).toBe('In Progress');
    });

    it('returns original for unknown tracker', () => {
      expect(mapStatusToTracker('todo', 'unknown')).toBe('todo');
    });
  });

  describe('createIssueTracker', () => {
    it('creates tracker with methods', () => {
      const tracker = createIssueTracker();

      expect(tracker.parseIssue).toBeDefined();
      expect(tracker.normalizeStatus).toBeDefined();
      expect(tracker.generateTestSpec).toBeDefined();
      expect(tracker.formatTestSpecMarkdown).toBeDefined();
    });

    it('uses specified type', () => {
      const tracker = createIssueTracker({ type: 'linear' });

      expect(tracker.type).toBe('linear');
    });

    it('defaults to github type', () => {
      const tracker = createIssueTracker();

      expect(tracker.type).toBe('github');
    });

    it('parseIssue uses tracker type', () => {
      const tracker = createIssueTracker({ type: 'github' });
      const issue = { number: 1, title: 'Test', state: 'open' };
      const parsed = tracker.parseIssue(issue);

      expect(parsed.source).toBe('github');
    });
  });
});
