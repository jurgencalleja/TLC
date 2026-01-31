import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIAdapter, OPENAI_PRICING, OPENAI_MODEL, DEFAULT_RATE_LIMITS } from './openai-adapter.js';
import { BaseAdapter } from './base-adapter.js';

describe('OpenAIAdapter', () => {
  describe('constructor', () => {
    it('sets name to openai by default', () => {
      const adapter = new OpenAIAdapter();
      expect(adapter.name).toBe('openai');
    });

    it('initializes rate limit counters', () => {
      const adapter = new OpenAIAdapter();
      expect(adapter.requestsThisMinute).toBe(0);
      expect(adapter.tokensThisMinute).toBe(0);
    });

    it('accepts custom rate limits', () => {
      const adapter = new OpenAIAdapter({
        rateLimits: { requestsPerMinute: 100, tokensPerMinute: 50000 },
      });
      expect(adapter.rateLimits.requestsPerMinute).toBe(100);
      expect(adapter.rateLimits.tokensPerMinute).toBe(50000);
    });
  });

  describe('review', () => {
    it('returns empty response for empty code', async () => {
      const adapter = new OpenAIAdapter();
      const result = await adapter.review('');

      expect(result.issues).toEqual([]);
      expect(result.model).toBe('openai');
    });

    it('returns standardized response format', async () => {
      const adapter = new OpenAIAdapter();
      const result = await adapter.review('const x = 1;');

      expect(BaseAdapter.validateResponse(result)).toBe(true);
      expect(result.model).toBe('openai');
    });

    it('throws when budget exceeded', async () => {
      const mockTracker = {
        canSpend: vi.fn(() => false),
        record: vi.fn(),
        getUsage: vi.fn(() => ({ daily: 10, monthly: 100, requests: 50 })),
      };
      const adapter = new OpenAIAdapter({ budgetTracker: mockTracker });

      await expect(adapter.review('const x = 1;')).rejects.toThrow('Budget exceeded');
    });

    it('throws when rate limit exceeded', async () => {
      const adapter = new OpenAIAdapter({
        rateLimits: { requestsPerMinute: 1, tokensPerMinute: 10 },
      });

      // First request succeeds
      await adapter.review('const x = 1;');

      // Second request exceeds rate limit
      await expect(adapter.review('const y = 2;')).rejects.toThrow('Rate limit exceeded');
    });

    it('records cost after successful review', async () => {
      const mockTracker = {
        canSpend: vi.fn(() => true),
        record: vi.fn(),
        getUsage: vi.fn(() => ({ daily: 0, monthly: 0, requests: 0 })),
      };
      const adapter = new OpenAIAdapter({ budgetTracker: mockTracker });

      await adapter.review('const x = 1;');

      expect(mockTracker.record).toHaveBeenCalledWith('openai', expect.any(Number));
    });

    it('increments rate limit counters', async () => {
      const adapter = new OpenAIAdapter();

      await adapter.review('const x = 1;');

      expect(adapter.requestsThisMinute).toBe(1);
      expect(adapter.tokensThisMinute).toBeGreaterThan(0);
    });

    it('handles API errors gracefully', async () => {
      const adapter = new OpenAIAdapter();
      adapter.callAPI = vi.fn().mockRejectedValue(new Error('API error'));

      const result = await adapter.review('const x = 1;');

      expect(result.error).toBe('API error');
      expect(result.issues).toEqual([]);
    });
  });

  describe('rate limiting', () => {
    it('resets counters after minute window', () => {
      const adapter = new OpenAIAdapter();
      adapter.requestsThisMinute = 100;
      adapter.tokensThisMinute = 50000;
      adapter.lastMinuteReset = Date.now() - 61000; // 61 seconds ago

      adapter.checkRateLimitReset();

      expect(adapter.requestsThisMinute).toBe(0);
      expect(adapter.tokensThisMinute).toBe(0);
    });

    it('does not reset within minute window', () => {
      const adapter = new OpenAIAdapter();
      adapter.requestsThisMinute = 100;
      adapter.lastMinuteReset = Date.now() - 30000; // 30 seconds ago

      adapter.checkRateLimitReset();

      expect(adapter.requestsThisMinute).toBe(100);
    });

    it('withinRateLimits checks both requests and tokens', () => {
      const adapter = new OpenAIAdapter({
        rateLimits: { requestsPerMinute: 10, tokensPerMinute: 1000 },
      });

      // Within limits
      expect(adapter.withinRateLimits(500)).toBe(true);

      // Exceed token limit
      expect(adapter.withinRateLimits(1500)).toBe(false);

      // Exceed request limit
      adapter.requestsThisMinute = 10;
      expect(adapter.withinRateLimits(100)).toBe(false);
    });
  });

  describe('estimateCost', () => {
    it('calculates cost based on token count', () => {
      const adapter = new OpenAIAdapter();
      const cost = adapter.estimateCost(1000);

      // At default pricing (o3): (500 * 10 + 500 * 40) / 1M = 0.025
      expect(cost).toBeCloseTo(0.025, 4);
    });

    it('uses custom pricing if provided', () => {
      const adapter = new OpenAIAdapter({
        pricing: { inputPerMillion: 5.00, outputPerMillion: 15.00 },
      });
      const cost = adapter.estimateCost(1000);

      // (500 * 5 + 500 * 15) / 1M = 0.01
      expect(cost).toBeCloseTo(0.01, 4);
    });
  });

  describe('canAfford', () => {
    it('returns true without budget tracker', () => {
      const adapter = new OpenAIAdapter();
      expect(adapter.canAfford(100)).toBe(true);
    });

    it('checks budget tracker when available', () => {
      const mockTracker = {
        canSpend: vi.fn(() => true),
      };
      const adapter = new OpenAIAdapter({
        budgetTracker: mockTracker,
        budget: { budgetDaily: 10, budgetMonthly: 100 },
      });

      adapter.canAfford(0.5);

      expect(mockTracker.canSpend).toHaveBeenCalledWith('openai', 0.5, expect.any(Object));
    });
  });

  describe('getUsage', () => {
    it('returns zero without budget tracker', () => {
      const adapter = new OpenAIAdapter();
      expect(adapter.getUsage()).toEqual({ daily: 0, monthly: 0, requests: 0 });
    });

    it('returns tracker usage when available', () => {
      const mockTracker = {
        getUsage: vi.fn(() => ({ daily: 5.00, monthly: 50.00, requests: 25 })),
      };
      const adapter = new OpenAIAdapter({ budgetTracker: mockTracker });

      const usage = adapter.getUsage();

      expect(usage.daily).toBe(5.00);
      expect(usage.requests).toBe(25);
    });
  });

  describe('getRateLimitStatus', () => {
    it('returns current rate limit status', () => {
      const adapter = new OpenAIAdapter();
      adapter.requestsThisMinute = 5;
      adapter.tokensThisMinute = 1000;

      const status = adapter.getRateLimitStatus();

      expect(status.requestsUsed).toBe(5);
      expect(status.requestsLimit).toBe(DEFAULT_RATE_LIMITS.requestsPerMinute);
      expect(status.tokensUsed).toBe(1000);
      expect(status.tokensLimit).toBe(DEFAULT_RATE_LIMITS.tokensPerMinute);
      expect(typeof status.resetsIn).toBe('number');
    });
  });

  describe('exports', () => {
    it('exports OPENAI_PRICING for o3', () => {
      expect(OPENAI_PRICING.inputPerMillion).toBe(10.00);
      expect(OPENAI_PRICING.outputPerMillion).toBe(40.00);
    });

    it('exports OPENAI_MODEL', () => {
      expect(OPENAI_MODEL).toBe('o3');
    });

    it('exports DEFAULT_RATE_LIMITS', () => {
      expect(DEFAULT_RATE_LIMITS.requestsPerMinute).toBe(500);
      expect(DEFAULT_RATE_LIMITS.tokensPerMinute).toBe(150000);
    });
  });
});
