import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { BudgetTracker } from './budget-tracker.js';

describe('BudgetTracker', () => {
  let testDir;
  let tracker;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-budget-test-'));
    tracker = new BudgetTracker(path.join(testDir, '.tlc', 'usage.json'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('initialization', () => {
    it('creates usage file if not exists', () => {
      expect(fs.existsSync(tracker.configPath)).toBe(true);
    });

    it('loads existing usage', () => {
      const initialData = {
        openai: { daily: 2.50, monthly: 25.00, lastDailyReset: new Date().toISOString() },
      };
      fs.mkdirSync(path.dirname(tracker.configPath), { recursive: true });
      fs.writeFileSync(tracker.configPath, JSON.stringify(initialData));

      const newTracker = new BudgetTracker(tracker.configPath);
      expect(newTracker.usage.openai.daily).toBe(2.50);
    });
  });

  describe('canSpend', () => {
    it('allows spending within daily budget', () => {
      const config = { budgetDaily: 5.00, budgetMonthly: 50.00 };
      tracker.usage.openai = { daily: 2.00, monthly: 10.00 };

      expect(tracker.canSpend('openai', 1.00, config)).toBe(true);
    });

    it('blocks spending over daily budget', () => {
      const config = { budgetDaily: 5.00, budgetMonthly: 50.00 };
      tracker.usage.openai = { daily: 4.50, monthly: 10.00 };

      expect(tracker.canSpend('openai', 1.00, config)).toBe(false);
    });

    it('blocks spending over monthly budget', () => {
      const config = { budgetDaily: 5.00, budgetMonthly: 50.00 };
      tracker.usage.openai = { daily: 0.00, monthly: 49.50 };

      expect(tracker.canSpend('openai', 1.00, config)).toBe(false);
    });
  });

  describe('record', () => {
    it('records spending', () => {
      tracker.record('openai', 1.50);

      expect(tracker.usage.openai.daily).toBe(1.50);
      expect(tracker.usage.openai.monthly).toBe(1.50);
    });

    it('accumulates spending', () => {
      tracker.record('openai', 1.00);
      tracker.record('openai', 0.50);

      expect(tracker.usage.openai.daily).toBe(1.50);
    });

    it('persists to file', () => {
      tracker.record('openai', 2.00);

      const loaded = JSON.parse(fs.readFileSync(tracker.configPath, 'utf-8'));
      expect(loaded.openai.daily).toBe(2.00);
    });
  });

  describe('daily reset', () => {
    it('resets daily at midnight', () => {
      tracker.usage.openai = {
        daily: 5.00,
        monthly: 20.00,
        lastDailyReset: new Date('2026-01-30').toISOString(),
        lastMonthlyReset: new Date('2026-01-01').toISOString(), // Same month
      };

      // Simulate new day (same month)
      vi.setSystemTime(new Date('2026-01-31T10:00:00'));
      tracker.checkResets();

      expect(tracker.usage.openai.daily).toBe(0);
      expect(tracker.usage.openai.monthly).toBe(20.00); // Monthly preserved
    });

    it('does not reset if same day', () => {
      const now = new Date('2026-01-31T10:00:00');
      vi.setSystemTime(now);

      tracker.usage.openai = {
        daily: 3.00,
        monthly: 15.00,
        lastDailyReset: now.toISOString(),
      };

      tracker.checkResets();

      expect(tracker.usage.openai.daily).toBe(3.00);
    });
  });

  describe('monthly reset', () => {
    it('resets monthly at month start', () => {
      tracker.usage.openai = {
        daily: 5.00,
        monthly: 45.00,
        lastMonthlyReset: new Date('2025-12-15').toISOString(),
      };

      // Simulate new month
      vi.setSystemTime(new Date('2026-01-15'));
      tracker.checkResets();

      expect(tracker.usage.openai.monthly).toBe(0);
    });
  });

  describe('shouldAlert', () => {
    it('returns true at threshold', () => {
      tracker.usage.openai = { daily: 4.00, monthly: 0 };
      const config = { budgetDaily: 5.00, alertThreshold: 0.8 };

      expect(tracker.shouldAlert('openai', config)).toBe(true);
    });

    it('returns false below threshold', () => {
      tracker.usage.openai = { daily: 2.00, monthly: 0 };
      const config = { budgetDaily: 5.00, alertThreshold: 0.8 };

      expect(tracker.shouldAlert('openai', config)).toBe(false);
    });
  });

  describe('getUsage', () => {
    it('returns usage for model', () => {
      tracker.usage.openai = { daily: 2.50, monthly: 25.00, requests: 10 };

      const usage = tracker.getUsage('openai');

      expect(usage.daily).toBe(2.50);
      expect(usage.monthly).toBe(25.00);
    });

    it('returns zero for unknown model', () => {
      const usage = tracker.getUsage('unknown');

      expect(usage.daily).toBe(0);
      expect(usage.monthly).toBe(0);
    });
  });
});
