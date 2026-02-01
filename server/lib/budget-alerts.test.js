import { describe, it, expect, beforeEach } from 'vitest';
import {
  BudgetAlerts,
  createAlert,
  formatAlertMessage,
  DEFAULT_THRESHOLDS,
} from './budget-alerts.js';

describe('budget-alerts', () => {
  describe('DEFAULT_THRESHOLDS', () => {
    it('includes 50%, 80%, and 100% thresholds', () => {
      expect(DEFAULT_THRESHOLDS).toContain(0.5);
      expect(DEFAULT_THRESHOLDS).toContain(0.8);
      expect(DEFAULT_THRESHOLDS).toContain(1.0);
    });
  });

  describe('BudgetAlerts', () => {
    let alerts;

    beforeEach(() => {
      alerts = new BudgetAlerts();
    });

    describe('checkThresholds', () => {
      it('fires at 50% threshold', () => {
        const config = { budgetDaily: 10.0 };
        const usage = { daily: 5.0 };

        const fired = alerts.checkThresholds('openai', usage, config);

        expect(fired).toHaveLength(1);
        expect(fired[0].threshold).toBe(0.5);
        expect(fired[0].model).toBe('openai');
      });

      it('fires at 80% threshold', () => {
        const config = { budgetDaily: 10.0 };
        const usage = { daily: 8.0 };

        const fired = alerts.checkThresholds('openai', usage, config);

        expect(fired.some(a => a.threshold === 0.8)).toBe(true);
      });

      it('fires at 100% (budget exceeded)', () => {
        const config = { budgetDaily: 10.0 };
        const usage = { daily: 10.0 };

        const fired = alerts.checkThresholds('openai', usage, config);

        expect(fired.some(a => a.threshold === 1.0)).toBe(true);
      });

      it('fires multiple thresholds when jumping over', () => {
        const config = { budgetDaily: 10.0 };
        const usage = { daily: 10.0 }; // 100% = crosses 50%, 80%, 100%

        const fired = alerts.checkThresholds('openai', usage, config);

        expect(fired).toHaveLength(3);
        expect(fired.map(a => a.threshold)).toEqual([0.5, 0.8, 1.0]);
      });

      it('does not fire duplicate alerts', () => {
        const config = { budgetDaily: 10.0 };
        const usage = { daily: 5.0 };

        // First check - should fire 50%
        const first = alerts.checkThresholds('openai', usage, config);
        expect(first).toHaveLength(1);

        // Second check - should not fire again
        const second = alerts.checkThresholds('openai', usage, config);
        expect(second).toHaveLength(0);
      });

      it('does not fire below 50%', () => {
        const config = { budgetDaily: 10.0 };
        const usage = { daily: 4.99 };

        const fired = alerts.checkThresholds('openai', usage, config);

        expect(fired).toHaveLength(0);
      });

      it('handles different models independently', () => {
        const config = { budgetDaily: 10.0 };
        const usage50 = { daily: 5.0 };

        // Fire for openai
        alerts.checkThresholds('openai', usage50, config);

        // Should still fire for deepseek (different model)
        const fired = alerts.checkThresholds('deepseek', usage50, config);
        expect(fired).toHaveLength(1);
      });

      it('supports custom thresholds', () => {
        const alertsCustom = new BudgetAlerts([0.25, 0.75]);
        const config = { budgetDaily: 10.0 };
        const usage = { daily: 2.5 };

        const fired = alertsCustom.checkThresholds('openai', usage, config);

        expect(fired).toHaveLength(1);
        expect(fired[0].threshold).toBe(0.25);
      });
    });

    describe('resetAlerts', () => {
      it('resets alerts on daily reset', () => {
        const config = { budgetDaily: 10.0 };
        const usage = { daily: 5.0 };

        // Fire initial alert
        alerts.checkThresholds('openai', usage, config);
        expect(alerts.hasFired('openai', 0.5)).toBe(true);

        // Reset
        alerts.resetAlerts('openai');

        // Should be able to fire again
        expect(alerts.hasFired('openai', 0.5)).toBe(false);
        const fired = alerts.checkThresholds('openai', usage, config);
        expect(fired).toHaveLength(1);
      });

      it('only resets specified model', () => {
        const config = { budgetDaily: 10.0 };
        const usage = { daily: 5.0 };

        // Fire for both models
        alerts.checkThresholds('openai', usage, config);
        alerts.checkThresholds('deepseek', usage, config);

        // Reset only openai
        alerts.resetAlerts('openai');

        expect(alerts.hasFired('openai', 0.5)).toBe(false);
        expect(alerts.hasFired('deepseek', 0.5)).toBe(true);
      });
    });

    describe('hasFired', () => {
      it('returns false for unfired alerts', () => {
        expect(alerts.hasFired('openai', 0.5)).toBe(false);
      });

      it('returns true for fired alerts', () => {
        const config = { budgetDaily: 10.0 };
        const usage = { daily: 5.0 };

        alerts.checkThresholds('openai', usage, config);

        expect(alerts.hasFired('openai', 0.5)).toBe(true);
      });
    });

    describe('getFiredAlerts', () => {
      it('returns empty array for no fired alerts', () => {
        expect(alerts.getFiredAlerts('openai')).toEqual([]);
      });

      it('returns list of fired thresholds', () => {
        const config = { budgetDaily: 10.0 };
        const usage = { daily: 8.5 };

        alerts.checkThresholds('openai', usage, config);

        const fired = alerts.getFiredAlerts('openai');
        expect(fired).toContain(0.5);
        expect(fired).toContain(0.8);
      });
    });
  });

  describe('createAlert', () => {
    it('creates alert object with required fields', () => {
      const alert = createAlert('openai', 0.5, 5.0, 10.0);

      expect(alert.model).toBe('openai');
      expect(alert.threshold).toBe(0.5);
      expect(alert.currentSpend).toBe(5.0);
      expect(alert.budgetLimit).toBe(10.0);
      expect(alert.percentUsed).toBe(50);
      expect(alert.timestamp).toBeDefined();
    });

    it('includes severity level', () => {
      const warning = createAlert('openai', 0.5, 5.0, 10.0);
      const caution = createAlert('openai', 0.8, 8.0, 10.0);
      const critical = createAlert('openai', 1.0, 10.0, 10.0);

      expect(warning.severity).toBe('warning');
      expect(caution.severity).toBe('caution');
      expect(critical.severity).toBe('critical');
    });
  });

  describe('formatAlertMessage', () => {
    it('generates formatted alert message', () => {
      const alert = createAlert('openai', 0.5, 5.0, 10.0);
      const message = formatAlertMessage(alert);

      expect(message).toContain('openai');
      expect(message).toContain('50%');
      expect(message).toContain('$5.00');
      expect(message).toContain('$10.00');
    });

    it('formats 80% threshold message', () => {
      const alert = createAlert('deepseek', 0.8, 4.0, 5.0);
      const message = formatAlertMessage(alert);

      expect(message).toContain('deepseek');
      expect(message).toContain('80%');
    });

    it('formats 100% exceeded message', () => {
      const alert = createAlert('openai', 1.0, 10.5, 10.0);
      const message = formatAlertMessage(alert);

      expect(message).toContain('EXCEEDED');
      expect(message).toContain('105%');
    });

    it('includes severity indicator', () => {
      const critical = createAlert('openai', 1.0, 10.0, 10.0);
      const message = formatAlertMessage(critical);

      expect(message).toMatch(/CRITICAL|!{2,}/i);
    });
  });
});
