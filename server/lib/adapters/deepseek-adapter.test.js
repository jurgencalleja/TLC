import { describe, it, expect, vi } from 'vitest';
import { DeepSeekAdapter, DEEPSEEK_PRICING, DEEPSEEK_MODEL } from './deepseek-adapter.js';
import { BaseAdapter } from './base-adapter.js';

describe('DeepSeekAdapter', () => {
  describe('constructor', () => {
    it('sets name to deepseek by default', () => {
      const adapter = new DeepSeekAdapter();
      expect(adapter.name).toBe('deepseek');
    });

    it('uses default pricing', () => {
      const adapter = new DeepSeekAdapter();
      expect(adapter.pricing).toBe(DEEPSEEK_PRICING);
    });

    it('accepts custom pricing', () => {
      const customPricing = { inputPerMillion: 0.20, outputPerMillion: 0.40 };
      const adapter = new DeepSeekAdapter({ pricing: customPricing });
      expect(adapter.pricing).toBe(customPricing);
    });
  });

  describe('review', () => {
    it('returns empty response for empty code', async () => {
      const adapter = new DeepSeekAdapter();
      const result = await adapter.review('');

      expect(result.issues).toEqual([]);
      expect(result.model).toBe('deepseek');
    });

    it('returns standardized response format', async () => {
      const adapter = new DeepSeekAdapter();
      const result = await adapter.review('const x = 1;');

      expect(BaseAdapter.validateResponse(result)).toBe(true);
      expect(result.model).toBe('deepseek');
    });

    it('throws when budget exceeded', async () => {
      const mockTracker = {
        canSpend: vi.fn(() => false),
        record: vi.fn(),
        getUsage: vi.fn(() => ({ daily: 5, monthly: 50, requests: 100 })),
      };
      const adapter = new DeepSeekAdapter({ budgetTracker: mockTracker });

      await expect(adapter.review('const x = 1;')).rejects.toThrow('Budget exceeded');
    });

    it('records cost after successful review', async () => {
      const mockTracker = {
        canSpend: vi.fn(() => true),
        record: vi.fn(),
        getUsage: vi.fn(() => ({ daily: 0, monthly: 0, requests: 0 })),
      };
      const adapter = new DeepSeekAdapter({ budgetTracker: mockTracker });

      await adapter.review('const x = 1;');

      expect(mockTracker.record).toHaveBeenCalledWith('deepseek', expect.any(Number));
    });

    it('handles API errors with warning instead of error', async () => {
      const adapter = new DeepSeekAdapter();
      adapter.callAPI = vi.fn().mockRejectedValue(new Error('Connection failed'));

      const result = await adapter.review('const x = 1;');

      expect(result.warning).toBe('DeepSeek unavailable: Connection failed');
      expect(result.issues).toEqual([]);
      expect(result.error).toBeUndefined();
    });
  });

  describe('estimateCost', () => {
    it('calculates cost based on token count', () => {
      const adapter = new DeepSeekAdapter();
      const cost = adapter.estimateCost(1000);

      // At default pricing (R1): (500 * 0.55 + 500 * 2.19) / 1M = 0.00137
      expect(cost).toBeCloseTo(0.00137, 5);
    });

    it('is much cheaper than OpenAI', () => {
      const adapter = new DeepSeekAdapter();
      const comparison = adapter.compareCostWithOpenAI(1000);

      expect(comparison.deepseek).toBeLessThan(comparison.openai);
      expect(comparison.savingsPercent).toBeGreaterThan(90); // >90% savings
    });
  });

  describe('compareCostWithOpenAI', () => {
    it('returns detailed cost comparison', () => {
      const adapter = new DeepSeekAdapter();
      const comparison = adapter.compareCostWithOpenAI(10000);

      expect(comparison).toHaveProperty('deepseek');
      expect(comparison).toHaveProperty('openai');
      expect(comparison).toHaveProperty('savings');
      expect(comparison).toHaveProperty('savingsPercent');
    });

    it('calculates savings correctly', () => {
      const adapter = new DeepSeekAdapter();
      const comparison = adapter.compareCostWithOpenAI(1000000);

      // For 1M tokens:
      // DeepSeek R1: (500k * 0.55 + 500k * 2.19) / 1M = 1.37
      // OpenAI (comparison uses hardcoded $10/$30): (500k * 10 + 500k * 30) / 1M = 20
      expect(comparison.deepseek).toBeCloseTo(1.37, 2);
      expect(comparison.openai).toBeCloseTo(20, 2);
      expect(comparison.savings).toBeCloseTo(18.63, 2);
    });
  });

  describe('canAfford', () => {
    it('returns true without budget tracker', () => {
      const adapter = new DeepSeekAdapter();
      expect(adapter.canAfford(100)).toBe(true);
    });

    it('checks budget tracker when available', () => {
      const mockTracker = {
        canSpend: vi.fn(() => true),
      };
      const adapter = new DeepSeekAdapter({
        budgetTracker: mockTracker,
        budget: { budgetDaily: 5, budgetMonthly: 50 },
      });

      adapter.canAfford(0.01);

      expect(mockTracker.canSpend).toHaveBeenCalledWith('deepseek', 0.01, expect.any(Object));
    });

    it('uses lower default budget than OpenAI', () => {
      const mockTracker = {
        canSpend: vi.fn(() => true),
      };
      const adapter = new DeepSeekAdapter({ budgetTracker: mockTracker });

      adapter.canAfford(0.01);

      // Default budget is 5 daily, 50 monthly (lower than typical OpenAI)
      expect(mockTracker.canSpend).toHaveBeenCalledWith(
        'deepseek',
        0.01,
        expect.objectContaining({ budgetDaily: 5, budgetMonthly: 50 })
      );
    });
  });

  describe('getUsage', () => {
    it('returns zero without budget tracker', () => {
      const adapter = new DeepSeekAdapter();
      expect(adapter.getUsage()).toEqual({ daily: 0, monthly: 0, requests: 0 });
    });

    it('returns tracker usage when available', () => {
      const mockTracker = {
        getUsage: vi.fn(() => ({ daily: 0.50, monthly: 5.00, requests: 100 })),
      };
      const adapter = new DeepSeekAdapter({ budgetTracker: mockTracker });

      const usage = adapter.getUsage();

      expect(usage.daily).toBe(0.50);
      expect(usage.requests).toBe(100);
    });
  });

  describe('DEEPSEEK_PRICING', () => {
    it('exports pricing constants for R1', () => {
      expect(DEEPSEEK_PRICING.inputPerMillion).toBe(0.55);
      expect(DEEPSEEK_PRICING.outputPerMillion).toBe(2.19);
    });

    it('is significantly cheaper than OpenAI', () => {
      // OpenAI o3: $10/1M input, $40/1M output
      expect(DEEPSEEK_PRICING.inputPerMillion).toBeLessThan(10);
      expect(DEEPSEEK_PRICING.outputPerMillion).toBeLessThan(40);
    });
  });

  describe('DEEPSEEK_MODEL', () => {
    it('exports latest model identifier', () => {
      expect(DEEPSEEK_MODEL).toBe('deepseek-r1');
    });
  });
});
