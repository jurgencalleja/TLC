/**
 * Alert Manager Tests
 */
import { describe, it, expect, vi } from 'vitest';
import {
  createAlert,
  routeAlert,
  sendToPagerDuty,
  sendToSlack,
  deduplicateAlerts,
  acknowledgeAlert,
  ALERT_SEVERITY,
  createAlertManager,
} from './alert-manager.js';

describe('alert-manager', () => {
  describe('ALERT_SEVERITY', () => {
    it('defines severity constants', () => {
      expect(ALERT_SEVERITY.CRITICAL).toBe('critical');
      expect(ALERT_SEVERITY.WARNING).toBe('warning');
      expect(ALERT_SEVERITY.INFO).toBe('info');
    });
  });

  describe('createAlert', () => {
    it('creates alert with required fields', () => {
      const alert = createAlert({ title: 'Test Alert', severity: 'critical' });
      expect(alert.id).toBeDefined();
      expect(alert.title).toBe('Test Alert');
      expect(alert.severity).toBe('critical');
      expect(alert.timestamp).toBeDefined();
    });
  });

  describe('routeAlert', () => {
    it('routes critical alerts to PagerDuty', () => {
      const routes = routeAlert({ severity: 'critical' }, {
        critical: ['pagerduty'],
        warning: ['slack'],
      });
      expect(routes).toContain('pagerduty');
    });

    it('routes warning alerts to Slack', () => {
      const routes = routeAlert({ severity: 'warning' }, {
        critical: ['pagerduty'],
        warning: ['slack'],
      });
      expect(routes).toContain('slack');
    });
  });

  describe('sendToPagerDuty', () => {
    it('sends alert to PagerDuty', async () => {
      const mockPost = vi.fn().mockResolvedValue({ ok: true });
      await sendToPagerDuty({ title: 'Test' }, { post: mockPost, routingKey: 'key' });
      expect(mockPost).toHaveBeenCalled();
    });
  });

  describe('sendToSlack', () => {
    it('sends alert to Slack', async () => {
      const mockPost = vi.fn().mockResolvedValue({ ok: true });
      await sendToSlack({ title: 'Test' }, { post: mockPost, webhookUrl: 'url' });
      expect(mockPost).toHaveBeenCalled();
    });
  });

  describe('deduplicateAlerts', () => {
    it('removes duplicate alerts', () => {
      const alerts = [
        { id: '1', fingerprint: 'abc', title: 'Alert 1' },
        { id: '2', fingerprint: 'abc', title: 'Alert 1' },
        { id: '3', fingerprint: 'def', title: 'Alert 2' },
      ];
      const deduped = deduplicateAlerts(alerts);
      expect(deduped.length).toBe(2);
    });
  });

  describe('acknowledgeAlert', () => {
    it('marks alert as acknowledged', () => {
      const alert = createAlert({ title: 'Test' });
      const acked = acknowledgeAlert(alert, { user: 'admin' });
      expect(acked.acknowledged).toBe(true);
      expect(acked.acknowledgedBy).toBe('admin');
    });
  });

  describe('createAlertManager', () => {
    it('creates manager with methods', () => {
      const manager = createAlertManager();
      expect(manager.send).toBeDefined();
      expect(manager.acknowledge).toBeDefined();
      expect(manager.list).toBeDefined();
      expect(manager.configure).toBeDefined();
    });

    it('configures escalation rules', () => {
      const manager = createAlertManager({
        escalation: { afterMinutes: 5, to: 'pagerduty' },
      });
      expect(manager.getConfig().escalation).toBeDefined();
    });
  });
});
