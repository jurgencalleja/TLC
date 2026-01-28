import { describe, it, expect } from 'vitest';
import {
  WEBHOOK_SOURCES,
  EVENT_TYPES,
  verifyGitHubSignature,
  verifyGitLabToken,
  detectWebhookSource,
  parseGitHubEventType,
  parseGitLabEventType,
  parseGitHubPush,
  parseGitHubPullRequest,
  parseGitLabPush,
  parseGitLabMergeRequest,
  parseWebhookPayload,
  validateWebhook,
  extractBranchName,
  isDefaultBranchPush,
  createWebhookListener,
} from './webhook-listener.js';
import crypto from 'crypto';

describe('webhook-listener', () => {
  describe('WEBHOOK_SOURCES', () => {
    it('defines all sources', () => {
      expect(WEBHOOK_SOURCES.GITHUB).toBe('github');
      expect(WEBHOOK_SOURCES.GITLAB).toBe('gitlab');
      expect(WEBHOOK_SOURCES.BITBUCKET).toBe('bitbucket');
    });
  });

  describe('EVENT_TYPES', () => {
    it('defines all event types', () => {
      expect(EVENT_TYPES.PUSH).toBe('push');
      expect(EVENT_TYPES.PULL_REQUEST).toBe('pull_request');
      expect(EVENT_TYPES.MERGE_REQUEST).toBe('merge_request');
      expect(EVENT_TYPES.TAG).toBe('tag');
      expect(EVENT_TYPES.UNKNOWN).toBe('unknown');
    });
  });

  describe('verifyGitHubSignature', () => {
    const secret = 'test-secret';
    const payload = '{"test": "data"}';

    it('returns false for missing signature', () => {
      expect(verifyGitHubSignature(payload, null, secret)).toBe(false);
    });

    it('returns false for missing secret', () => {
      expect(verifyGitHubSignature(payload, 'sha256=abc', null)).toBe(false);
    });

    it('verifies valid signature', () => {
      const expectedSig = 'sha256=' + crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      expect(verifyGitHubSignature(payload, expectedSig, secret)).toBe(true);
    });

    it('rejects invalid signature', () => {
      expect(verifyGitHubSignature(payload, 'sha256=invalid', secret)).toBe(false);
    });
  });

  describe('verifyGitLabToken', () => {
    it('returns false for missing token', () => {
      expect(verifyGitLabToken(null, 'secret')).toBe(false);
    });

    it('returns false for missing secret', () => {
      expect(verifyGitLabToken('token', null)).toBe(false);
    });

    it('verifies matching token', () => {
      expect(verifyGitLabToken('my-secret', 'my-secret')).toBe(true);
    });

    it('rejects non-matching token', () => {
      expect(verifyGitLabToken('wrong', 'secret')).toBe(false);
    });
  });

  describe('detectWebhookSource', () => {
    it('detects GitHub from headers', () => {
      expect(detectWebhookSource({ 'X-GitHub-Event': 'push' })).toBe(WEBHOOK_SOURCES.GITHUB);
    });

    it('detects GitLab from headers', () => {
      expect(detectWebhookSource({ 'X-Gitlab-Event': 'Push Hook' })).toBe(WEBHOOK_SOURCES.GITLAB);
    });

    it('detects Bitbucket from headers', () => {
      expect(detectWebhookSource({ 'X-Event-Key': 'repo:push' })).toBe(WEBHOOK_SOURCES.BITBUCKET);
    });

    it('handles case-insensitive headers', () => {
      expect(detectWebhookSource({ 'x-github-event': 'push' })).toBe(WEBHOOK_SOURCES.GITHUB);
    });

    it('returns null for unknown source', () => {
      expect(detectWebhookSource({ 'Content-Type': 'application/json' })).toBeNull();
    });

    it('handles empty headers', () => {
      expect(detectWebhookSource({})).toBeNull();
    });
  });

  describe('parseGitHubEventType', () => {
    it('parses push event', () => {
      expect(parseGitHubEventType('push')).toBe(EVENT_TYPES.PUSH);
    });

    it('parses pull_request event', () => {
      expect(parseGitHubEventType('pull_request')).toBe(EVENT_TYPES.PULL_REQUEST);
    });

    it('parses create event as tag', () => {
      expect(parseGitHubEventType('create')).toBe(EVENT_TYPES.TAG);
    });

    it('parses release event', () => {
      expect(parseGitHubEventType('release')).toBe(EVENT_TYPES.RELEASE);
    });

    it('parses comment events', () => {
      expect(parseGitHubEventType('issue_comment')).toBe(EVENT_TYPES.COMMENT);
      expect(parseGitHubEventType('pull_request_review_comment')).toBe(EVENT_TYPES.COMMENT);
    });

    it('returns unknown for unrecognized events', () => {
      expect(parseGitHubEventType('workflow_run')).toBe(EVENT_TYPES.UNKNOWN);
    });
  });

  describe('parseGitLabEventType', () => {
    it('parses Push Hook', () => {
      expect(parseGitLabEventType('Push Hook')).toBe(EVENT_TYPES.PUSH);
    });

    it('parses Merge Request Hook', () => {
      expect(parseGitLabEventType('Merge Request Hook')).toBe(EVENT_TYPES.MERGE_REQUEST);
    });

    it('parses Tag Push Hook', () => {
      expect(parseGitLabEventType('Tag Push Hook')).toBe(EVENT_TYPES.TAG);
    });

    it('parses Note Hook as comment', () => {
      expect(parseGitLabEventType('Note Hook')).toBe(EVENT_TYPES.COMMENT);
    });

    it('returns unknown for unrecognized events', () => {
      expect(parseGitLabEventType('Pipeline Hook')).toBe(EVENT_TYPES.UNKNOWN);
    });
  });

  describe('parseGitHubPush', () => {
    it('parses branch push', () => {
      const payload = {
        ref: 'refs/heads/main',
        before: 'abc123',
        after: 'def456',
        commits: [
          { id: 'def456', message: 'Test commit', author: { name: 'Test' } },
        ],
        repository: {
          name: 'repo',
          full_name: 'owner/repo',
          default_branch: 'main',
        },
        sender: { login: 'user' },
      };

      const result = parseGitHubPush(payload);

      expect(result.source).toBe(WEBHOOK_SOURCES.GITHUB);
      expect(result.event).toBe(EVENT_TYPES.PUSH);
      expect(result.branch).toBe('main');
      expect(result.tag).toBeNull();
      expect(result.commits.length).toBe(1);
      expect(result.repository.name).toBe('repo');
    });

    it('parses tag push', () => {
      const payload = {
        ref: 'refs/tags/v1.0.0',
        repository: { name: 'repo' },
      };

      const result = parseGitHubPush(payload);

      expect(result.event).toBe(EVENT_TYPES.TAG);
      expect(result.tag).toBe('v1.0.0');
      expect(result.branch).toBeNull();
    });
  });

  describe('parseGitHubPullRequest', () => {
    it('parses pull request', () => {
      const payload = {
        action: 'opened',
        pull_request: {
          number: 123,
          title: 'Test PR',
          body: 'Description',
          state: 'open',
          draft: false,
          merged: false,
          head: { ref: 'feature', sha: 'abc' },
          base: { ref: 'main', sha: 'def' },
          user: { login: 'author' },
          html_url: 'https://github.com/owner/repo/pull/123',
        },
        repository: { name: 'repo', full_name: 'owner/repo' },
      };

      const result = parseGitHubPullRequest(payload);

      expect(result.source).toBe(WEBHOOK_SOURCES.GITHUB);
      expect(result.event).toBe(EVENT_TYPES.PULL_REQUEST);
      expect(result.action).toBe('opened');
      expect(result.number).toBe(123);
      expect(result.title).toBe('Test PR');
      expect(result.head.ref).toBe('feature');
      expect(result.base.ref).toBe('main');
    });
  });

  describe('parseGitLabPush', () => {
    it('parses GitLab push', () => {
      const payload = {
        ref: 'refs/heads/main',
        before: 'abc',
        after: 'def',
        commits: [{ id: 'def', message: 'Test', author: { name: 'Author' } }],
        project: {
          name: 'project',
          path_with_namespace: 'group/project',
          default_branch: 'main',
        },
        user_username: 'user',
        total_commits_count: 1,
      };

      const result = parseGitLabPush(payload);

      expect(result.source).toBe(WEBHOOK_SOURCES.GITLAB);
      expect(result.event).toBe(EVENT_TYPES.PUSH);
      expect(result.branch).toBe('main');
      expect(result.repository.fullName).toBe('group/project');
    });
  });

  describe('parseGitLabMergeRequest', () => {
    it('parses merge request', () => {
      const payload = {
        object_attributes: {
          iid: 42,
          title: 'MR Title',
          description: 'MR Desc',
          state: 'opened',
          source_branch: 'feature',
          target_branch: 'main',
          url: 'https://gitlab.com/mr/42',
        },
        user: { username: 'author' },
        project: { name: 'project', path_with_namespace: 'group/project' },
      };

      const result = parseGitLabMergeRequest(payload);

      expect(result.source).toBe(WEBHOOK_SOURCES.GITLAB);
      expect(result.event).toBe(EVENT_TYPES.MERGE_REQUEST);
      expect(result.number).toBe(42);
      expect(result.head.ref).toBe('feature');
      expect(result.base.ref).toBe('main');
    });
  });

  describe('parseWebhookPayload', () => {
    it('routes to GitHub push parser', () => {
      const result = parseWebhookPayload(WEBHOOK_SOURCES.GITHUB, 'push', {
        ref: 'refs/heads/main',
        repository: { name: 'repo' },
      });

      expect(result.source).toBe(WEBHOOK_SOURCES.GITHUB);
      expect(result.event).toBe(EVENT_TYPES.PUSH);
    });

    it('routes to GitLab push parser', () => {
      const result = parseWebhookPayload(WEBHOOK_SOURCES.GITLAB, 'Push Hook', {
        ref: 'refs/heads/main',
        project: { name: 'project' },
      });

      expect(result.source).toBe(WEBHOOK_SOURCES.GITLAB);
      expect(result.event).toBe(EVENT_TYPES.PUSH);
    });

    it('returns raw for unknown event', () => {
      const result = parseWebhookPayload(WEBHOOK_SOURCES.GITHUB, 'workflow_run', { data: 'test' });

      expect(result.event).toBe(EVENT_TYPES.UNKNOWN);
      expect(result.raw).toBeDefined();
    });
  });

  describe('validateWebhook', () => {
    it('returns error for unknown source', () => {
      const result = validateWebhook({
        headers: { 'Content-Type': 'application/json' },
        body: {},
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unknown');
    });

    it('validates GitHub webhook', () => {
      const result = validateWebhook({
        headers: { 'X-GitHub-Event': 'push', 'X-GitHub-Delivery': 'abc' },
        body: { ref: 'refs/heads/main', repository: { name: 'repo' } },
      });

      expect(result.valid).toBe(true);
      expect(result.source).toBe(WEBHOOK_SOURCES.GITHUB);
      expect(result.eventType).toBe('push');
    });

    it('validates GitLab webhook', () => {
      const result = validateWebhook({
        headers: { 'X-Gitlab-Event': 'Push Hook' },
        body: { ref: 'refs/heads/main', project: { name: 'project' } },
      });

      expect(result.valid).toBe(true);
      expect(result.source).toBe(WEBHOOK_SOURCES.GITLAB);
    });
  });

  describe('extractBranchName', () => {
    it('extracts branch from refs/heads/', () => {
      expect(extractBranchName('refs/heads/main')).toBe('main');
      expect(extractBranchName('refs/heads/feature/auth')).toBe('feature/auth');
    });

    it('returns null for tags', () => {
      expect(extractBranchName('refs/tags/v1.0.0')).toBeNull();
    });

    it('returns ref as-is for plain branch name', () => {
      expect(extractBranchName('main')).toBe('main');
    });

    it('returns null for empty ref', () => {
      expect(extractBranchName(null)).toBeNull();
      expect(extractBranchName('')).toBeNull();
    });
  });

  describe('isDefaultBranchPush', () => {
    it('returns true for default branch', () => {
      expect(isDefaultBranchPush({
        branch: 'main',
        repository: { defaultBranch: 'main' },
      })).toBe(true);
    });

    it('returns false for non-default branch', () => {
      expect(isDefaultBranchPush({
        branch: 'feature',
        repository: { defaultBranch: 'main' },
      })).toBe(false);
    });

    it('returns false for missing data', () => {
      expect(isDefaultBranchPush({})).toBe(false);
      expect(isDefaultBranchPush({ branch: 'main' })).toBe(false);
    });
  });

  describe('createWebhookListener', () => {
    it('creates listener with event handlers', () => {
      const listener = createWebhookListener();

      expect(listener.on).toBeDefined();
      expect(listener.off).toBeDefined();
      expect(listener.emit).toBeDefined();
      expect(listener.createHandler).toBeDefined();
    });

    it('can add and remove event handlers', () => {
      const listener = createWebhookListener();
      const handler = () => {};

      listener.on('push', handler);
      listener.off('push', handler);
    });

    it('emits events to handlers', async () => {
      const listener = createWebhookListener();
      let received = null;

      listener.on('push', (data) => {
        received = data;
      });

      await listener.emit('push', { branch: 'main' });

      expect(received).toEqual({ branch: 'main' });
    });

    it('exposes constants', () => {
      const listener = createWebhookListener();

      expect(listener.WEBHOOK_SOURCES).toBeDefined();
      expect(listener.EVENT_TYPES).toBeDefined();
    });
  });
});
