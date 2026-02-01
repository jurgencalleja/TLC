import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const { UsageCommand, parseArgs } = await import('./usage-command.js');

describe('usage-command', () => {
  let usageCommand;
  let tempDir;

  beforeEach(() => {
    // Create temp directory for tests
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'usage-cmd-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('parseArgs', () => {
    it('parses empty args', () => {
      const result = parseArgs([]);
      expect(result).toEqual({
        reset: false,
        model: null,
        json: false,
      });
    });

    it('parses --reset flag', () => {
      const result = parseArgs(['--reset']);
      expect(result).toEqual({
        reset: true,
        model: null,
        json: false,
      });
    });

    it('parses --model flag with value', () => {
      const result = parseArgs(['--model', 'openai']);
      expect(result).toEqual({
        reset: false,
        model: 'openai',
        json: false,
      });
    });

    it('parses --json flag', () => {
      const result = parseArgs(['--json']);
      expect(result).toEqual({
        reset: false,
        model: null,
        json: true,
      });
    });

    it('parses multiple flags together', () => {
      const result = parseArgs(['--model', 'deepseek', '--json']);
      expect(result).toEqual({
        reset: false,
        model: 'deepseek',
        json: true,
      });
    });

    it('handles --model= syntax', () => {
      const result = parseArgs(['--model=openai']);
      expect(result).toEqual({
        reset: false,
        model: 'openai',
        json: false,
      });
    });
  });

  describe('execute with mocked dependencies', () => {
    let mockBudgetTracker;
    let mockUsageHistory;
    let mockBudgetAlerts;

    beforeEach(() => {
      mockBudgetTracker = {
        getUsage: vi.fn().mockReturnValue({ daily: 5.00, monthly: 50.00, requests: 100 }),
        reset: vi.fn(),
      };

      mockUsageHistory = {
        getHistory: vi.fn().mockReturnValue([
          { date: '2026-01-25', daily: 4.50, monthly: 45.00 },
          { date: '2026-01-26', daily: 5.00, monthly: 50.00 },
        ]),
        getAllModels: vi.fn().mockReturnValue(['openai', 'deepseek']),
      };

      mockBudgetAlerts = {
        checkThresholds: vi.fn().mockReturnValue([]),
        resetAlerts: vi.fn(),
      };

      usageCommand = new UsageCommand({
        budgetTracker: mockBudgetTracker,
        usageHistory: mockUsageHistory,
        budgetAlerts: mockBudgetAlerts,
      });
    });

    const defaultConfig = {
      openai: { budgetDaily: 10, budgetMonthly: 100 },
      deepseek: { budgetDaily: 5, budgetMonthly: 50 },
    };

    it('shows usage summary', () => {
      const result = usageCommand.execute([], defaultConfig);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Usage Summary');
      expect(result.output).toContain('openai');
      expect(result.output).toContain('deepseek');
    });

    it('shows history chart in summary', () => {
      const result = usageCommand.execute([], defaultConfig);

      expect(result.output).toContain('7-Day Usage History');
    });

    it('filters by model when --model flag provided', () => {
      const result = usageCommand.execute(['--model', 'openai'], defaultConfig);

      expect(result.success).toBe(true);
      expect(mockBudgetTracker.getUsage).toHaveBeenCalledWith('openai');
      expect(mockBudgetTracker.getUsage).not.toHaveBeenCalledWith('deepseek');
    });

    it('outputs JSON format when --json flag provided', () => {
      const result = usageCommand.execute(['--json'], defaultConfig);

      expect(result.success).toBe(true);
      expect(result.json).toBeDefined();
      expect(result.json.models).toBeDefined();
    });

    it('includes usage data in JSON output', () => {
      const result = usageCommand.execute(['--json'], defaultConfig);

      expect(result.json.models.openai).toBeDefined();
      expect(result.json.models.openai.daily).toBe(5.00);
      expect(result.json.models.openai.monthly).toBe(50.00);
    });

    it('includes totals in JSON output', () => {
      const result = usageCommand.execute(['--json'], defaultConfig);

      expect(result.json.totals).toBeDefined();
      expect(result.json.totals.daily).toBe(10); // 5 + 5
      expect(result.json.totals.monthly).toBe(100); // 50 + 50
    });

    it('resets usage when --reset flag provided', () => {
      const result = usageCommand.execute(['--reset'], defaultConfig);

      expect(result.success).toBe(true);
      expect(result.output).toContain('reset');
      expect(mockBudgetTracker.reset).toHaveBeenCalled();
      expect(mockBudgetAlerts.resetAlerts).toHaveBeenCalled();
    });

    it('resets only specified model with --reset --model', () => {
      usageCommand.execute(['--reset', '--model', 'openai'], defaultConfig);

      expect(mockBudgetTracker.reset).toHaveBeenCalledWith('openai');
      expect(mockBudgetAlerts.resetAlerts).toHaveBeenCalledWith('openai');
      expect(mockBudgetTracker.reset).toHaveBeenCalledTimes(1);
    });

    it('handles no usage data gracefully', () => {
      mockBudgetTracker.getUsage.mockReturnValue({ daily: 0, monthly: 0, requests: 0 });
      mockUsageHistory.getHistory.mockReturnValue([]);

      const result = usageCommand.execute([], defaultConfig);

      expect(result.success).toBe(true);
      // Should still show the summary even with zero usage
      expect(result.output).toContain('Usage Summary');
    });

    it('shows alerts if threshold crossed', () => {
      const alert = {
        model: 'openai',
        threshold: 0.8,
        currentSpend: 8.00,
        budgetLimit: 10.00,
        percentUsed: 80,
        severity: 'caution',
      };

      mockBudgetAlerts.checkThresholds.mockReturnValue([alert]);

      const result = usageCommand.execute([], defaultConfig);

      expect(result.success).toBe(true);
      expect(result.alerts).toBeDefined();
      expect(result.alerts.length).toBeGreaterThan(0);
      expect(result.alerts[0]).toContain('Budget Alert');
    });

    it('includes alerts in JSON output', () => {
      const alert = {
        model: 'openai',
        threshold: 0.8,
        currentSpend: 8.00,
        budgetLimit: 10.00,
        percentUsed: 80,
        severity: 'caution',
      };

      mockBudgetAlerts.checkThresholds.mockReturnValue([alert]);

      const result = usageCommand.execute(['--json'], defaultConfig);

      expect(result.json.alerts).toBeDefined();
      expect(result.json.alerts.length).toBeGreaterThan(0);
    });

    it('returns error for unknown model with --model flag', () => {
      const result = usageCommand.execute(['--model', 'unknown'], defaultConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('unknown');
    });
  });

  describe('getUsageData', () => {
    let mockBudgetTracker;

    beforeEach(() => {
      mockBudgetTracker = {
        getUsage: vi.fn().mockReturnValue({ daily: 5.00, monthly: 50.00, requests: 100 }),
        reset: vi.fn(),
      };

      usageCommand = new UsageCommand({
        budgetTracker: mockBudgetTracker,
        usageHistory: { getHistory: vi.fn(), getAllModels: vi.fn() },
        budgetAlerts: { checkThresholds: vi.fn(), resetAlerts: vi.fn() },
      });
    });

    it('collects usage data from all models', () => {
      const data = usageCommand.getUsageData(['openai', 'deepseek']);

      expect(data.openai).toBeDefined();
      expect(data.deepseek).toBeDefined();
      expect(mockBudgetTracker.getUsage).toHaveBeenCalledWith('openai');
      expect(mockBudgetTracker.getUsage).toHaveBeenCalledWith('deepseek');
    });

    it('returns empty object for empty model list', () => {
      const data = usageCommand.getUsageData([]);

      expect(data).toEqual({});
    });
  });

  describe('getHistoryData', () => {
    let mockUsageHistory;

    beforeEach(() => {
      mockUsageHistory = {
        getHistory: vi.fn().mockReturnValue([{ date: '2026-01-25', daily: 5.0 }]),
        getAllModels: vi.fn(),
      };

      usageCommand = new UsageCommand({
        budgetTracker: { getUsage: vi.fn(), reset: vi.fn() },
        usageHistory: mockUsageHistory,
        budgetAlerts: { checkThresholds: vi.fn(), resetAlerts: vi.fn() },
      });
    });

    it('collects history from all models', () => {
      usageCommand.getHistoryData(['openai', 'deepseek']);

      expect(mockUsageHistory.getHistory).toHaveBeenCalledWith('openai');
      expect(mockUsageHistory.getHistory).toHaveBeenCalledWith('deepseek');
    });
  });

  describe('calculateTotals', () => {
    beforeEach(() => {
      usageCommand = new UsageCommand({
        budgetTracker: { getUsage: vi.fn(), reset: vi.fn() },
        usageHistory: { getHistory: vi.fn(), getAllModels: vi.fn() },
        budgetAlerts: { checkThresholds: vi.fn(), resetAlerts: vi.fn() },
      });
    });

    it('calculates totals across models', () => {
      const usageData = {
        openai: { daily: 5, monthly: 50, requests: 100 },
        deepseek: { daily: 3, monthly: 30, requests: 60 },
      };
      const config = {
        openai: { budgetDaily: 10, budgetMonthly: 100 },
        deepseek: { budgetDaily: 5, budgetMonthly: 50 },
      };

      const totals = usageCommand.calculateTotals(usageData, config);

      expect(totals.daily).toBe(8);
      expect(totals.monthly).toBe(80);
      expect(totals.requests).toBe(160);
      expect(totals.budgetDaily).toBe(15);
      expect(totals.budgetMonthly).toBe(150);
      expect(totals.remainingDaily).toBe(7);
      expect(totals.remainingMonthly).toBe(70);
    });

    it('handles missing config for model', () => {
      const usageData = {
        unknown: { daily: 1, monthly: 10, requests: 5 },
      };
      const config = {};

      const totals = usageCommand.calculateTotals(usageData, config);

      expect(totals.daily).toBe(1);
      expect(totals.budgetDaily).toBe(0);
      expect(totals.remainingDaily).toBe(0); // Can't be negative
    });
  });

  describe('checkAlerts', () => {
    let mockBudgetAlerts;

    beforeEach(() => {
      mockBudgetAlerts = {
        checkThresholds: vi.fn().mockReturnValue([]),
        resetAlerts: vi.fn(),
      };

      usageCommand = new UsageCommand({
        budgetTracker: { getUsage: vi.fn(), reset: vi.fn() },
        usageHistory: { getHistory: vi.fn(), getAllModels: vi.fn() },
        budgetAlerts: mockBudgetAlerts,
      });
    });

    it('checks thresholds for each model', () => {
      const usageData = {
        openai: { daily: 8, monthly: 80 },
        deepseek: { daily: 4, monthly: 40 },
      };
      const config = {
        openai: { budgetDaily: 10, budgetMonthly: 100 },
        deepseek: { budgetDaily: 5, budgetMonthly: 50 },
      };

      usageCommand.checkAlerts(['openai', 'deepseek'], usageData, config);

      expect(mockBudgetAlerts.checkThresholds).toHaveBeenCalledWith('openai', usageData.openai, config.openai);
      expect(mockBudgetAlerts.checkThresholds).toHaveBeenCalledWith('deepseek', usageData.deepseek, config.deepseek);
    });

    it('aggregates alerts from all models', () => {
      const alert1 = { model: 'openai', threshold: 0.8 };
      const alert2 = { model: 'deepseek', threshold: 0.5 };

      mockBudgetAlerts.checkThresholds
        .mockReturnValueOnce([alert1])
        .mockReturnValueOnce([alert2]);

      const usageData = {
        openai: { daily: 8, monthly: 80 },
        deepseek: { daily: 2.5, monthly: 25 },
      };
      const config = {
        openai: { budgetDaily: 10 },
        deepseek: { budgetDaily: 5 },
      };

      const alerts = usageCommand.checkAlerts(['openai', 'deepseek'], usageData, config);

      expect(alerts).toHaveLength(2);
      expect(alerts).toContainEqual(alert1);
      expect(alerts).toContainEqual(alert2);
    });
  });
});
