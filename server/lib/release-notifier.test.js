import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createReleaseNotifier } from './release-notifier.js';

/** Helper: build a minimal release config (notifications section matters most) */
function makeConfig(overrides = {}) {
  return {
    tagPattern: 'v*',
    previewUrlTemplate: 'qa-{tag}.example.com',
    tiers: {
      rc: { gates: ['tests', 'security'], coverageThreshold: 80, autoPromote: false },
    },
    notifications: {
      onDeploy: { channel: '#releases' },
      onAccept: { channel: '#releases-accepted' },
      onReject: { channel: '#releases-rejected' },
    },
    ...overrides,
  };
}

/** Helper: build a release object matching the tag-release shape */
function makeRelease(overrides = {}) {
  return {
    tag: 'v1.0.0-rc.1',
    commitSha: 'abc123',
    tier: 'rc',
    state: 'deployed',
    gateResults: {
      passed: true,
      results: [
        { gate: 'tests', status: 'pass' },
        { gate: 'security', status: 'pass' },
      ],
    },
    previewUrl: 'https://qa-v1.0.0-rc.1.example.com',
    reviewer: null,
    reason: null,
    changelog: ['Fix login bug', 'Update header styles', 'Add dark mode', 'Refactor API layer'],
    qaUsers: ['@alice', '@bob'],
    createdAt: '2025-06-01T00:00:00.000Z',
    updatedAt: '2025-06-01T01:00:00.000Z',
    ...overrides,
  };
}

describe('release-notifier', () => {
  let slackSender;
  let logger;

  beforeEach(() => {
    slackSender = vi.fn().mockResolvedValue({ ok: true });
    logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
  });

  describe('notifyDeploy', () => {
    it('sends Slack notification on deploy (calls slack sender with deploy message)', async () => {
      const config = makeConfig();
      const notifier = createReleaseNotifier(config, { slackSender, logger });
      const release = makeRelease();

      const result = await notifier.notifyDeploy(release);

      expect(slackSender).toHaveBeenCalledTimes(1);
      expect(result.sent).toBe(true);
    });

    it('notification includes tag name and version', async () => {
      const config = makeConfig();
      const notifier = createReleaseNotifier(config, { slackSender, logger });
      const release = makeRelease({ tag: 'v2.3.0-rc.5' });

      await notifier.notifyDeploy(release);

      const payload = slackSender.mock.calls[0][0];
      const allText = JSON.stringify(payload);
      expect(allText).toContain('v2.3.0-rc.5');
    });

    it('notification includes preview URL', async () => {
      const config = makeConfig();
      const notifier = createReleaseNotifier(config, { slackSender, logger });
      const release = makeRelease({ previewUrl: 'https://qa-v1.0.0-rc.1.example.com' });

      await notifier.notifyDeploy(release);

      const payload = slackSender.mock.calls[0][0];
      const allText = JSON.stringify(payload);
      expect(allText).toContain('https://qa-v1.0.0-rc.1.example.com');
    });

    it('notification includes changelog snippet (first 3 items)', async () => {
      const config = makeConfig();
      const notifier = createReleaseNotifier(config, { slackSender, logger });
      const release = makeRelease({
        changelog: ['Fix login bug', 'Update header', 'Add dark mode', 'Refactor API'],
      });

      await notifier.notifyDeploy(release);

      const payload = slackSender.mock.calls[0][0];
      const allText = JSON.stringify(payload);
      expect(allText).toContain('Fix login bug');
      expect(allText).toContain('Update header');
      expect(allText).toContain('Add dark mode');
      expect(allText).not.toContain('Refactor API');
    });

    it('notification includes gate summary (passed/failed counts)', async () => {
      const config = makeConfig();
      const notifier = createReleaseNotifier(config, { slackSender, logger });
      const release = makeRelease({
        gateResults: {
          passed: true,
          results: [
            { gate: 'tests', status: 'pass' },
            { gate: 'security', status: 'pass' },
            { gate: 'coverage', status: 'fail' },
          ],
        },
      });

      await notifier.notifyDeploy(release);

      const payload = slackSender.mock.calls[0][0];
      const allText = JSON.stringify(payload);
      // Should contain counts like "2 passed" and "1 failed"
      expect(allText).toContain('2 passed');
      expect(allText).toContain('1 failed');
    });

    it('respects per-event channel config (onDeploy)', async () => {
      const config = makeConfig({
        notifications: {
          onDeploy: { channel: '#deploy-channel' },
          onAccept: { channel: '#accept-channel' },
          onReject: { channel: '#reject-channel' },
        },
      });
      const notifier = createReleaseNotifier(config, { slackSender, logger });
      const release = makeRelease();

      const result = await notifier.notifyDeploy(release);

      expect(result.channel).toBe('#deploy-channel');
      const payload = slackSender.mock.calls[0][0];
      expect(payload.channel).toBe('#deploy-channel');
    });

    it('mentions QA users when review needed (@qa-user in message)', async () => {
      const config = makeConfig();
      const notifier = createReleaseNotifier(config, { slackSender, logger });
      const release = makeRelease({ qaUsers: ['@alice', '@bob'] });

      await notifier.notifyDeploy(release);

      const payload = slackSender.mock.calls[0][0];
      const allText = JSON.stringify(payload);
      expect(allText).toContain('@alice');
      expect(allText).toContain('@bob');
    });

    it('deploy notification includes "Review needed" call to action', async () => {
      const config = makeConfig();
      const notifier = createReleaseNotifier(config, { slackSender, logger });
      const release = makeRelease();

      await notifier.notifyDeploy(release);

      const payload = slackSender.mock.calls[0][0];
      const allText = JSON.stringify(payload);
      expect(allText).toMatch(/review needed/i);
    });
  });

  describe('notifyAccept', () => {
    it('sends Slack notification on accept (calls slack sender with accept message)', async () => {
      const config = makeConfig();
      const notifier = createReleaseNotifier(config, { slackSender, logger });
      const release = makeRelease({ state: 'accepted', reviewer: 'qa-alice' });

      const result = await notifier.notifyAccept(release);

      expect(slackSender).toHaveBeenCalledTimes(1);
      expect(result.sent).toBe(true);
    });

    it('accept notification includes reviewer name', async () => {
      const config = makeConfig();
      const notifier = createReleaseNotifier(config, { slackSender, logger });
      const release = makeRelease({ state: 'accepted', reviewer: 'qa-alice' });

      await notifier.notifyAccept(release);

      const payload = slackSender.mock.calls[0][0];
      const allText = JSON.stringify(payload);
      expect(allText).toContain('qa-alice');
    });

    it('does not mention QA users on accept (already handled)', async () => {
      const config = makeConfig();
      const notifier = createReleaseNotifier(config, { slackSender, logger });
      const release = makeRelease({ state: 'accepted', reviewer: 'qa-alice', qaUsers: ['@alice', '@bob'] });

      await notifier.notifyAccept(release);

      const payload = slackSender.mock.calls[0][0];
      const allText = JSON.stringify(payload);
      // Should not contain QA user mentions (only deploy does that)
      expect(allText).not.toContain('@alice');
      expect(allText).not.toContain('@bob');
    });

    it('respects per-event channel config (onAccept)', async () => {
      const config = makeConfig({
        notifications: {
          onDeploy: { channel: '#deploy-channel' },
          onAccept: { channel: '#accept-channel' },
          onReject: { channel: '#reject-channel' },
        },
      });
      const notifier = createReleaseNotifier(config, { slackSender, logger });
      const release = makeRelease({ state: 'accepted', reviewer: 'qa-alice' });

      const result = await notifier.notifyAccept(release);

      expect(result.channel).toBe('#accept-channel');
    });
  });

  describe('notifyReject', () => {
    it('sends Slack notification on reject (includes rejection reason)', async () => {
      const config = makeConfig();
      const notifier = createReleaseNotifier(config, { slackSender, logger });
      const release = makeRelease({ state: 'rejected', reviewer: 'qa-bob' });

      const result = await notifier.notifyReject(release, 'CSS broken on mobile');

      expect(slackSender).toHaveBeenCalledTimes(1);
      expect(result.sent).toBe(true);
      const payload = slackSender.mock.calls[0][0];
      const allText = JSON.stringify(payload);
      expect(allText).toContain('CSS broken on mobile');
    });

    it('reject notification includes reviewer name and reason', async () => {
      const config = makeConfig();
      const notifier = createReleaseNotifier(config, { slackSender, logger });
      const release = makeRelease({ state: 'rejected', reviewer: 'qa-bob' });

      await notifier.notifyReject(release, 'Layout is broken');

      const payload = slackSender.mock.calls[0][0];
      const allText = JSON.stringify(payload);
      expect(allText).toContain('qa-bob');
      expect(allText).toContain('Layout is broken');
    });

    it('respects per-event channel config (onReject)', async () => {
      const config = makeConfig({
        notifications: {
          onDeploy: { channel: '#deploy-channel' },
          onAccept: { channel: '#accept-channel' },
          onReject: { channel: '#reject-channel' },
        },
      });
      const notifier = createReleaseNotifier(config, { slackSender, logger });
      const release = makeRelease({ state: 'rejected', reviewer: 'qa-bob' });

      const result = await notifier.notifyReject(release, 'Broken');

      expect(result.channel).toBe('#reject-channel');
    });
  });

  describe('fallback behavior', () => {
    it('falls back to console.log when Slack not configured (no slackSender)', async () => {
      const config = makeConfig();
      const notifier = createReleaseNotifier(config, { slackSender: null, logger });
      const release = makeRelease();

      const result = await notifier.notifyDeploy(release);

      expect(result.sent).toBe(false);
      expect(logger.log).toHaveBeenCalled();
    });

    it('handles missing notification config gracefully (no error)', async () => {
      const config = makeConfig({ notifications: undefined });
      const notifier = createReleaseNotifier(config, { slackSender, logger });
      const release = makeRelease();

      const result = await notifier.notifyDeploy(release);

      // Should still work, just no specific channel
      expect(result.sent).toBe(true);
    });
  });
});
