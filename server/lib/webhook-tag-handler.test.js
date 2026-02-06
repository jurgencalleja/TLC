import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWebhookTagHandler } from './webhook-tag-handler.js';

/**
 * Helper: build a GitHub tag push payload.
 *
 * @param {string} tag - Full ref (e.g., 'refs/tags/v1.0.0')
 * @param {string} sha - Commit SHA
 * @param {string} pusher - Pusher name
 * @returns {Object} GitHub-shaped payload
 */
function githubPayload(tag, sha = 'abc123', pusher = 'octocat') {
  return {
    ref: `refs/tags/${tag}`,
    after: sha,
    pusher: { name: pusher },
  };
}

/**
 * Helper: build a GitLab tag push payload.
 *
 * @param {string} tag - Tag name (e.g., 'v1.0.0')
 * @param {string} sha - Commit SHA
 * @param {string} userName - User name
 * @returns {Object} GitLab-shaped payload
 */
function gitlabPayload(tag, sha = 'def456', userName = 'gitlabuser') {
  return {
    ref: tag,
    checkout_sha: sha,
    user_name: userName,
  };
}

describe('webhook-tag-handler', () => {
  let onRelease;
  let logger;

  beforeEach(() => {
    onRelease = vi.fn().mockResolvedValue(undefined);
    logger = vi.fn();
  });

  describe('GitHub tag push handling', () => {
    it('triggers pipeline for v1.0.0-rc.1 tag push', async () => {
      const handler = createWebhookTagHandler({ onRelease, logger });
      const result = await handler.handleGitHubPush(githubPayload('v1.0.0-rc.1'));

      expect(result.triggered).toBe(true);
      expect(result.tag).toBe('v1.0.0-rc.1');
    });

    it('triggers pipeline for v1.0.0 release tag push', async () => {
      const handler = createWebhookTagHandler({ onRelease, logger });
      const result = await handler.handleGitHubPush(githubPayload('v1.0.0'));

      expect(result.triggered).toBe(true);
      expect(result.tag).toBe('v1.0.0');
    });

    it('extracts correct commit SHA from GitHub payload', async () => {
      const handler = createWebhookTagHandler({ onRelease, logger });
      await handler.handleGitHubPush(githubPayload('v2.0.0', 'sha-github-123'));

      expect(onRelease).toHaveBeenCalledWith(
        expect.objectContaining({ commit: 'sha-github-123' })
      );
    });

    it('extracts pusher name from GitHub payload', async () => {
      const handler = createWebhookTagHandler({ onRelease, logger });
      await handler.handleGitHubPush(githubPayload('v3.0.0', 'abc', 'deploy-bot'));

      expect(onRelease).toHaveBeenCalledWith(
        expect.objectContaining({ pusher: 'deploy-bot' })
      );
    });
  });

  describe('GitLab tag push handling', () => {
    it('triggers pipeline for GitLab v1.0.0-rc.1 tag push', async () => {
      const handler = createWebhookTagHandler({ onRelease, logger });
      const result = await handler.handleGitLabPush(gitlabPayload('v1.0.0-rc.1'));

      expect(result.triggered).toBe(true);
      expect(result.tag).toBe('v1.0.0-rc.1');
    });

    it('extracts correct commit SHA from GitLab payload', async () => {
      const handler = createWebhookTagHandler({ onRelease, logger });
      await handler.handleGitLabPush(gitlabPayload('v2.0.0', 'sha-gitlab-456'));

      expect(onRelease).toHaveBeenCalledWith(
        expect.objectContaining({ commit: 'sha-gitlab-456' })
      );
    });

    it('extracts pusher name from GitLab payload', async () => {
      const handler = createWebhookTagHandler({ onRelease, logger });
      await handler.handleGitLabPush(gitlabPayload('v4.0.0', 'abc', 'gitlab-admin'));

      expect(onRelease).toHaveBeenCalledWith(
        expect.objectContaining({ pusher: 'gitlab-admin' })
      );
    });
  });

  describe('non-release tag filtering', () => {
    it('ignores build-123 non-release tags', async () => {
      const handler = createWebhookTagHandler({ onRelease, logger });
      const result = await handler.handleGitHubPush(githubPayload('build-123'));

      expect(result.triggered).toBe(false);
      expect(result.reason).toMatch(/invalid|not.*valid|not.*release/i);
      expect(onRelease).not.toHaveBeenCalled();
    });

    it('ignores deploy-staging non-release tags', async () => {
      const handler = createWebhookTagHandler({ onRelease, logger });
      const result = await handler.handleGitHubPush(githubPayload('deploy-staging'));

      expect(result.triggered).toBe(false);
      expect(result.reason).toMatch(/invalid|not.*valid|not.*release/i);
      expect(onRelease).not.toHaveBeenCalled();
    });
  });

  describe('deduplication and rate limiting', () => {
    it('deduplicates rapid webhook retries for same tag within window', async () => {
      const handler = createWebhookTagHandler({
        onRelease,
        logger,
        dedupeWindowMs: 60000,
      });

      const first = await handler.handleGitHubPush(githubPayload('v1.0.0'));
      const second = await handler.handleGitHubPush(githubPayload('v1.0.0'));

      expect(first.triggered).toBe(true);
      expect(second.triggered).toBe(false);
      expect(second.reason).toMatch(/duplicate|dedupe|already/i);
      expect(onRelease).toHaveBeenCalledTimes(1);
    });

    it('rate limit: second trigger for same tag within 60s is ignored', async () => {
      const handler = createWebhookTagHandler({
        onRelease,
        logger,
        dedupeWindowMs: 60000,
      });

      await handler.handleGitHubPush(githubPayload('v5.0.0'));
      const result = await handler.handleGitHubPush(githubPayload('v5.0.0'));

      expect(result.triggered).toBe(false);
      expect(onRelease).toHaveBeenCalledTimes(1);
    });

    it('rate limit: same tag after 60s window triggers again', async () => {
      const now = Date.now();
      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(now)           // first handleGitHubPush
        .mockReturnValueOnce(now + 61000);  // second handleGitHubPush (61s later)

      const handler = createWebhookTagHandler({
        onRelease,
        logger,
        dedupeWindowMs: 60000,
      });

      const first = await handler.handleGitHubPush(githubPayload('v6.0.0'));
      const second = await handler.handleGitHubPush(githubPayload('v6.0.0'));

      expect(first.triggered).toBe(true);
      expect(second.triggered).toBe(true);
      expect(onRelease).toHaveBeenCalledTimes(2);

      vi.restoreAllMocks();
    });
  });

  describe('onRelease callback', () => {
    it('calls onRelease callback with tag, commit, and pusher info', async () => {
      const handler = createWebhookTagHandler({ onRelease, logger });

      await handler.handleGitHubPush(githubPayload('v1.2.3', 'commit-sha', 'release-user'));

      expect(onRelease).toHaveBeenCalledTimes(1);
      expect(onRelease).toHaveBeenCalledWith({
        tag: 'v1.2.3',
        commit: 'commit-sha',
        pusher: 'release-user',
        source: 'github',
      });
    });
  });

  describe('logging', () => {
    it('logs webhook events via logger function', async () => {
      const handler = createWebhookTagHandler({ onRelease, logger });

      await handler.handleGitHubPush(githubPayload('v1.0.0'));

      expect(logger).toHaveBeenCalled();
      const logMessage = logger.mock.calls[0][0];
      expect(logMessage).toMatch(/v1\.0\.0/);
    });
  });

  describe('handleTagEvent generic dispatch', () => {
    it('dispatches GitHub payloads via handleTagEvent', async () => {
      const handler = createWebhookTagHandler({ onRelease, logger });
      const result = await handler.handleTagEvent('github', githubPayload('v7.0.0'));

      expect(result.triggered).toBe(true);
      expect(result.tag).toBe('v7.0.0');
    });

    it('dispatches GitLab payloads via handleTagEvent', async () => {
      const handler = createWebhookTagHandler({ onRelease, logger });
      const result = await handler.handleTagEvent('gitlab', gitlabPayload('v8.0.0'));

      expect(result.triggered).toBe(true);
      expect(result.tag).toBe('v8.0.0');
    });
  });
});
