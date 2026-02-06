import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClaudeAdapter, CLAUDE_PRICING, CLAUDE_MODEL } from './claude-adapter.js';
import { BaseAdapter } from './base-adapter.js';

describe('ClaudeAdapter', () => {
  describe('constructor', () => {
    it('sets name to claude by default', () => {
      const adapter = new ClaudeAdapter();
      expect(adapter.name).toBe('claude');
    });

    it('accepts custom config', () => {
      const adapter = new ClaudeAdapter({ apiKey: 'test-key' });
      expect(adapter.config.apiKey).toBe('test-key');
    });

    it('accepts budget tracker', () => {
      const mockTracker = { canSpend: vi.fn() };
      const adapter = new ClaudeAdapter({ budgetTracker: mockTracker });
      expect(adapter.budgetTracker).toBe(mockTracker);
    });
  });

  describe('review', () => {
    it('returns empty response for empty code', async () => {
      const adapter = new ClaudeAdapter();
      const result = await adapter.review('');

      expect(result.issues).toEqual([]);
      expect(result.score).toBe(100);
      expect(result.model).toBe('claude');
    });

    it('returns empty response for whitespace-only code', async () => {
      const adapter = new ClaudeAdapter();
      const result = await adapter.review('   \n\t  ');

      expect(result.issues).toEqual([]);
    });

    it('returns standardized response format', async () => {
      const adapter = new ClaudeAdapter();
      const result = await adapter.review('const x = 1;');

      expect(BaseAdapter.validateResponse(result)).toBe(true);
      expect(result.model).toBe('claude');
      expect(typeof result.tokensUsed).toBe('number');
      expect(typeof result.cost).toBe('number');
    });

    it('checks budget before review', async () => {
      const mockTracker = {
        canSpend: vi.fn(() => false),
        record: vi.fn(),
        getUsage: vi.fn(() => ({ daily: 10, monthly: 100, requests: 50 })),
      };
      const adapter = new ClaudeAdapter({
        budgetTracker: mockTracker,
        budget: { budgetDaily: 5, budgetMonthly: 50 },
      });

      await expect(adapter.review('const x = 1;')).rejects.toThrow('Budget exceeded');
    });

    it('records cost after successful review', async () => {
      const mockTracker = {
        canSpend: vi.fn(() => true),
        record: vi.fn(),
        getUsage: vi.fn(() => ({ daily: 0, monthly: 0, requests: 0 })),
      };
      const adapter = new ClaudeAdapter({ budgetTracker: mockTracker });

      await adapter.review('const x = 1;');

      expect(mockTracker.record).toHaveBeenCalledWith('claude', expect.any(Number));
    });

    it('handles API errors gracefully', async () => {
      const adapter = new ClaudeAdapter();
      adapter.callAPI = vi.fn().mockRejectedValue(new Error('API timeout'));

      const result = await adapter.review('const x = 1;');

      expect(result.error).toBe('API timeout');
      expect(result.issues).toEqual([]);
    });
  });

  describe('estimateTokens', () => {
    it('estimates tokens based on code length', () => {
      const adapter = new ClaudeAdapter();

      // ~4 chars per token
      expect(adapter.estimateTokens('abcd')).toBe(1);
      expect(adapter.estimateTokens('abcdefgh')).toBe(2);
      expect(adapter.estimateTokens('a'.repeat(100))).toBe(25);
    });
  });

  describe('estimateCost', () => {
    it('calculates cost based on token count', () => {
      const adapter = new ClaudeAdapter();
      const cost = adapter.estimateCost(1000);

      // At default pricing (Opus 4.5): (500 * 15 + 500 * 75) / 1M = 0.045
      expect(cost).toBeCloseTo(0.045, 4);
    });

    it('uses custom pricing if provided', () => {
      const adapter = new ClaudeAdapter({
        pricing: { inputPerMillion: 1.00, outputPerMillion: 2.00 },
      });
      const cost = adapter.estimateCost(1000);

      // (500 * 1 + 500 * 2) / 1M = 0.0015
      expect(cost).toBeCloseTo(0.0015, 5);
    });
  });

  describe('canAfford', () => {
    it('returns true without budget tracker', () => {
      const adapter = new ClaudeAdapter();
      expect(adapter.canAfford(100)).toBe(true);
    });

    it('returns true when tracking disabled', () => {
      const adapter = new ClaudeAdapter({ trackCost: false });
      expect(adapter.canAfford(100)).toBe(true);
    });

    it('checks budget tracker when enabled', () => {
      const mockTracker = {
        canSpend: vi.fn(() => true),
      };
      const adapter = new ClaudeAdapter({
        budgetTracker: mockTracker,
        budget: { budgetDaily: 10, budgetMonthly: 100 },
      });

      adapter.canAfford(0.5);

      expect(mockTracker.canSpend).toHaveBeenCalledWith('claude', 0.5, expect.any(Object));
    });
  });

  describe('getUsage', () => {
    it('returns zero without budget tracker', () => {
      const adapter = new ClaudeAdapter();
      const usage = adapter.getUsage();

      expect(usage).toEqual({ daily: 0, monthly: 0, requests: 0 });
    });

    it('returns tracker usage when available', () => {
      const mockTracker = {
        getUsage: vi.fn(() => ({ daily: 2.50, monthly: 25.00, requests: 10 })),
      };
      const adapter = new ClaudeAdapter({ budgetTracker: mockTracker });

      const usage = adapter.getUsage();

      expect(usage.daily).toBe(2.50);
      expect(usage.monthly).toBe(25.00);
      expect(usage.requests).toBe(10);
    });
  });

  describe('CLAUDE_PRICING', () => {
    it('exports default pricing for Opus 4.6', () => {
      expect(CLAUDE_PRICING.inputPerMillion).toBe(15.00);
      expect(CLAUDE_PRICING.outputPerMillion).toBe(75.00);
    });
  });

  describe('CLAUDE_MODEL', () => {
    it('exports latest model identifier', () => {
      expect(CLAUDE_MODEL).toBe('claude-opus-4-6-20260205');
    });
  });
});
