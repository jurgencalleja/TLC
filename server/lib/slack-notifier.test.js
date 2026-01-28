import { describe, it, expect } from 'vitest';
import {
  EVENT_TYPES,
  EVENT_EMOJIS,
  EVENT_COLORS,
  formatBugNotification,
  formatTestNotification,
  formatDeployNotification,
  formatClaimNotification,
  formatPushNotification,
  formatNotification,
  isValidWebhookUrl,
  createSlackNotifier,
  loadSlackConfig,
} from './slack-notifier.js';

describe('slack-notifier', () => {
  describe('EVENT_TYPES', () => {
    it('defines all event types', () => {
      expect(EVENT_TYPES.BUG).toBe('bug');
      expect(EVENT_TYPES.TEST_PASS).toBe('test-pass');
      expect(EVENT_TYPES.TEST_FAIL).toBe('test-fail');
      expect(EVENT_TYPES.DEPLOY).toBe('deploy');
      expect(EVENT_TYPES.DEPLOY_FAIL).toBe('deploy-fail');
      expect(EVENT_TYPES.CLAIM).toBe('claim');
      expect(EVENT_TYPES.RELEASE).toBe('release');
      expect(EVENT_TYPES.PUSH).toBe('push');
    });
  });

  describe('EVENT_EMOJIS', () => {
    it('has emoji for each event type', () => {
      expect(EVENT_EMOJIS[EVENT_TYPES.BUG]).toBe(':bug:');
      expect(EVENT_EMOJIS[EVENT_TYPES.TEST_PASS]).toBe(':white_check_mark:');
      expect(EVENT_EMOJIS[EVENT_TYPES.TEST_FAIL]).toBe(':x:');
      expect(EVENT_EMOJIS[EVENT_TYPES.DEPLOY]).toBe(':rocket:');
    });
  });

  describe('EVENT_COLORS', () => {
    it('has color for each event type', () => {
      expect(EVENT_COLORS[EVENT_TYPES.BUG]).toBe('#dc3545');
      expect(EVENT_COLORS[EVENT_TYPES.TEST_PASS]).toBe('#28a745');
      expect(EVENT_COLORS[EVENT_TYPES.TEST_FAIL]).toBe('#dc3545');
    });
  });

  describe('formatBugNotification', () => {
    it('formats bug with all fields', () => {
      const msg = formatBugNotification({
        id: 'BUG-001',
        title: 'Login fails',
        description: 'Cannot login with valid credentials',
        severity: 'high',
        reporter: 'alice',
        url: 'https://example.com/bugs/1',
      });

      expect(msg.text).toContain(':bug:');
      expect(msg.text).toContain('Login fails');
      expect(msg.attachments).toBeDefined();
      expect(msg.attachments[0].color).toBe(EVENT_COLORS[EVENT_TYPES.BUG]);
    });

    it('handles missing fields', () => {
      const msg = formatBugNotification({
        title: 'Test bug',
      });

      expect(msg.text).toContain('Test bug');
      expect(msg.attachments[0].fields.length).toBeGreaterThan(0);
    });
  });

  describe('formatTestNotification', () => {
    it('formats passing tests', () => {
      const msg = formatTestNotification({
        branch: 'main',
        passed: 50,
        failed: 0,
        total: 50,
        duration: '5.2s',
      });

      expect(msg.text).toContain(':white_check_mark:');
      expect(msg.text).toContain('main');
      expect(msg.text).toContain('50/50 tests pass');
    });

    it('formats failing tests', () => {
      const msg = formatTestNotification({
        branch: 'feature',
        passed: 48,
        failed: 2,
        total: 50,
      });

      expect(msg.text).toContain(':x:');
      expect(msg.text).toContain('2 tests failed');
    });

    it('includes test counts in fields', () => {
      const msg = formatTestNotification({
        branch: 'main',
        passed: 10,
        failed: 5,
        total: 15,
      });

      const fields = msg.attachments[0].fields;
      expect(fields.some(f => f.value.includes('10 passed'))).toBe(true);
    });
  });

  describe('formatDeployNotification', () => {
    it('formats successful deploy', () => {
      const msg = formatDeployNotification({
        branch: 'main',
        subdomain: 'main.app.com',
        status: 'success',
      });

      expect(msg.text).toContain(':rocket:');
      expect(msg.text).toContain('main');
      expect(msg.text).toContain('deployed');
    });

    it('formats failed deploy', () => {
      const msg = formatDeployNotification({
        branch: 'feature',
        status: 'failed',
        error: 'Build failed',
      });

      expect(msg.text).toContain(':boom:');
      expect(msg.text).toContain('failed');
      expect(msg.attachments[0].text).toContain('Build failed');
    });

    it('includes subdomain link', () => {
      const msg = formatDeployNotification({
        branch: 'main',
        subdomain: 'main.app.com',
        status: 'running',
      });

      const fields = msg.attachments[0].fields;
      expect(fields.some(f => f.value.includes('https://main.app.com'))).toBe(true);
    });
  });

  describe('formatClaimNotification', () => {
    it('formats task claim', () => {
      const msg = formatClaimNotification({
        user: 'alice',
        taskId: '1',
        taskTitle: 'Implement auth',
        action: 'claimed',
      });

      expect(msg.text).toContain(':clipboard:');
      expect(msg.text).toContain('@alice');
      expect(msg.text).toContain('claimed');
      expect(msg.text).toContain('Task 1');
    });

    it('formats task release', () => {
      const msg = formatClaimNotification({
        user: 'bob',
        taskId: '2',
        taskTitle: 'Write tests',
        action: 'released',
      });

      expect(msg.text).toContain(':arrows_counterclockwise:');
      expect(msg.text).toContain('released');
    });

    it('includes phase info', () => {
      const msg = formatClaimNotification({
        user: 'alice',
        taskId: '1',
        taskTitle: 'Test',
        phase: 'Phase 2',
      });

      const fields = msg.attachments[0].fields;
      expect(fields.some(f => f.value === 'Phase 2')).toBe(true);
    });
  });

  describe('formatPushNotification', () => {
    it('formats push with commits', () => {
      const msg = formatPushNotification({
        branch: 'main',
        commits: [
          { message: 'Add feature' },
          { message: 'Fix bug' },
        ],
        author: 'alice',
        repository: 'owner/repo',
      });

      expect(msg.text).toContain(':arrow_up:');
      expect(msg.text).toContain('main');
      expect(msg.text).toContain('2 new commits');
    });

    it('shows singular for one commit', () => {
      const msg = formatPushNotification({
        branch: 'main',
        commits: [{ message: 'Single commit' }],
      });

      expect(msg.text).toContain('1 new commit');
    });

    it('truncates commit messages', () => {
      const msg = formatPushNotification({
        branch: 'main',
        commits: [
          { message: 'a'.repeat(100) },
        ],
      });

      expect(msg.attachments[0].text.length).toBeLessThan(100);
    });

    it('limits displayed commits', () => {
      const msg = formatPushNotification({
        branch: 'main',
        commits: [
          { message: 'Commit 1' },
          { message: 'Commit 2' },
          { message: 'Commit 3' },
          { message: 'Commit 4' },
          { message: 'Commit 5' },
        ],
      });

      const commitLines = msg.attachments[0].text.split('\n').filter(Boolean);
      expect(commitLines.length).toBeLessThanOrEqual(3);
    });
  });

  describe('formatNotification', () => {
    it('routes to bug formatter', () => {
      const msg = formatNotification(EVENT_TYPES.BUG, { title: 'Bug' });
      expect(msg.text).toContain(':bug:');
    });

    it('routes to test formatter', () => {
      const msg = formatNotification(EVENT_TYPES.TEST_PASS, {
        branch: 'main',
        passed: 10,
        failed: 0,
        total: 10,
      });
      expect(msg.text).toContain(':white_check_mark:');
    });

    it('routes to deploy formatter', () => {
      const msg = formatNotification(EVENT_TYPES.DEPLOY, {
        branch: 'main',
        status: 'success',
      });
      expect(msg.text).toContain(':rocket:');
    });

    it('handles unknown event type', () => {
      const msg = formatNotification('unknown', { message: 'Custom message' });
      expect(msg.text).toBe('Custom message');
    });
  });

  describe('isValidWebhookUrl', () => {
    it('validates Slack webhook URLs', () => {
      expect(isValidWebhookUrl('https://hooks.slack.com/services/T00/B00/XXX')).toBe(true);
    });

    it('rejects non-Slack URLs', () => {
      expect(isValidWebhookUrl('https://example.com/webhook')).toBe(false);
    });

    it('rejects HTTP URLs', () => {
      expect(isValidWebhookUrl('http://hooks.slack.com/services/xxx')).toBe(false);
    });

    it('rejects non-services paths', () => {
      expect(isValidWebhookUrl('https://hooks.slack.com/other/xxx')).toBe(false);
    });

    it('rejects invalid inputs', () => {
      expect(isValidWebhookUrl(null)).toBe(false);
      expect(isValidWebhookUrl('')).toBe(false);
      expect(isValidWebhookUrl('not-a-url')).toBe(false);
    });
  });

  describe('createSlackNotifier', () => {
    it('creates notifier with methods', () => {
      const notifier = createSlackNotifier({});

      expect(notifier.notify).toBeDefined();
      expect(notifier.send).toBeDefined();
      expect(notifier.bug).toBeDefined();
      expect(notifier.testResult).toBeDefined();
      expect(notifier.deploy).toBeDefined();
      expect(notifier.claim).toBeDefined();
      expect(notifier.release).toBeDefined();
      expect(notifier.push).toBeDefined();
    });

    it('reports configured status', () => {
      const unconfigured = createSlackNotifier({});
      expect(unconfigured.isConfigured()).toBe(false);

      const configured = createSlackNotifier({
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/XXX',
      });
      expect(configured.isConfigured()).toBe(true);
    });

    it('exposes EVENT_TYPES', () => {
      const notifier = createSlackNotifier({});
      expect(notifier.EVENT_TYPES).toBeDefined();
      expect(notifier.EVENT_TYPES.BUG).toBe('bug');
    });

    it('skips disabled events', async () => {
      const notifier = createSlackNotifier({
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/XXX',
        enabledEvents: ['bug'], // Only bug enabled
      });

      // Should skip since deploy is not enabled
      const result = await notifier.notify(EVENT_TYPES.DEPLOY, {
        branch: 'main',
        status: 'success',
      });

      expect(result.skipped).toBe(true);
    });

    it('returns error when not configured', async () => {
      const notifier = createSlackNotifier({});
      const result = await notifier.bug({ title: 'Test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No webhook URL');
    });
  });

  describe('loadSlackConfig', () => {
    it('loads config from object', () => {
      const config = loadSlackConfig({
        slack: {
          webhookUrl: 'https://hooks.slack.com/services/xxx',
          channel: '#dev',
          username: 'Bot',
          events: ['bug', 'deploy'],
        },
      });

      expect(config.webhookUrl).toBe('https://hooks.slack.com/services/xxx');
      expect(config.channel).toBe('#dev');
      expect(config.username).toBe('Bot');
      expect(config.enabledEvents).toEqual(['bug', 'deploy']);
    });

    it('uses defaults for missing values', () => {
      const config = loadSlackConfig({});

      expect(config.username).toBe('TLC Bot');
      expect(config.iconEmoji).toBe(':robot_face:');
      expect(config.enabledEvents).toEqual(Object.values(EVENT_TYPES));
    });

    it('uses env var for webhook URL', () => {
      const originalEnv = process.env.SLACK_WEBHOOK_URL;
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/env';

      const config = loadSlackConfig({});
      expect(config.webhookUrl).toBe('https://hooks.slack.com/services/env');

      if (originalEnv) {
        process.env.SLACK_WEBHOOK_URL = originalEnv;
      } else {
        delete process.env.SLACK_WEBHOOK_URL;
      }
    });
  });
});
