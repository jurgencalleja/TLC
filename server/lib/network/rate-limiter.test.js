/**
 * Rate Limiter Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createRateLimiter,
  checkRateLimit,
  getRateLimitHeaders,
  RATE_LIMIT_ALGORITHMS,
  createSlidingWindow,
  isWhitelisted,
  isBlacklisted,
} from './rate-limiter.js';

describe('rate-limiter', () => {
  describe('RATE_LIMIT_ALGORITHMS', () => {
    it('defines algorithm constants', () => {
      expect(RATE_LIMIT_ALGORITHMS.SLIDING_WINDOW).toBe('sliding_window');
      expect(RATE_LIMIT_ALGORITHMS.TOKEN_BUCKET).toBe('token_bucket');
      expect(RATE_LIMIT_ALGORITHMS.FIXED_WINDOW).toBe('fixed_window');
    });
  });

  describe('createSlidingWindow', () => {
    it('creates sliding window counter', () => {
      const window = createSlidingWindow({
        windowMs: 60000,
        maxRequests: 100,
      });

      expect(window.increment).toBeDefined();
      expect(window.getCount).toBeDefined();
      expect(window.reset).toBeDefined();
    });

    it('tracks requests within window', () => {
      const window = createSlidingWindow({
        windowMs: 60000,
        maxRequests: 100,
      });

      window.increment('192.168.1.1');
      window.increment('192.168.1.1');

      expect(window.getCount('192.168.1.1')).toBe(2);
    });

    it('respects max requests', () => {
      const window = createSlidingWindow({
        windowMs: 60000,
        maxRequests: 2,
      });

      expect(window.increment('192.168.1.1')).toBe(true);
      expect(window.increment('192.168.1.1')).toBe(true);
      expect(window.increment('192.168.1.1')).toBe(false);
    });

    it('resets after window expires', async () => {
      const window = createSlidingWindow({
        windowMs: 50,
        maxRequests: 1,
      });

      window.increment('192.168.1.1');
      expect(window.increment('192.168.1.1')).toBe(false);

      await new Promise((r) => setTimeout(r, 60));

      expect(window.increment('192.168.1.1')).toBe(true);
    });
  });

  describe('checkRateLimit', () => {
    it('allows requests under limit', () => {
      const result = checkRateLimit({
        ip: '192.168.1.1',
        endpoint: '/api/test',
        limits: { '/api/test': { maxRequests: 100, windowMs: 60000 } },
        store: new Map(),
      });

      expect(result.allowed).toBe(true);
    });

    it('blocks requests over limit', () => {
      const store = new Map();
      store.set('192.168.1.1:/api/test', { count: 100, windowStart: Date.now() });

      const result = checkRateLimit({
        ip: '192.168.1.1',
        endpoint: '/api/test',
        limits: { '/api/test': { maxRequests: 100, windowMs: 60000 } },
        store,
      });

      expect(result.allowed).toBe(false);
    });

    it('tracks per-endpoint limits', () => {
      const store = new Map();

      const result1 = checkRateLimit({
        ip: '192.168.1.1',
        endpoint: '/api/fast',
        limits: {
          '/api/fast': { maxRequests: 10, windowMs: 60000 },
          '/api/slow': { maxRequests: 100, windowMs: 60000 },
        },
        store,
      });

      const result2 = checkRateLimit({
        ip: '192.168.1.1',
        endpoint: '/api/slow',
        limits: {
          '/api/fast': { maxRequests: 10, windowMs: 60000 },
          '/api/slow': { maxRequests: 100, windowMs: 60000 },
        },
        store,
      });

      expect(result1.limit).toBe(10);
      expect(result2.limit).toBe(100);
    });

    it('returns remaining requests', () => {
      const store = new Map();
      store.set('192.168.1.1:/api/test', { count: 50, windowStart: Date.now() });

      const result = checkRateLimit({
        ip: '192.168.1.1',
        endpoint: '/api/test',
        limits: { '/api/test': { maxRequests: 100, windowMs: 60000 } },
        store,
      });

      expect(result.remaining).toBe(50);
    });
  });

  describe('getRateLimitHeaders', () => {
    it('generates X-RateLimit-Limit header', () => {
      const headers = getRateLimitHeaders({
        limit: 100,
        remaining: 50,
        resetTime: Date.now() + 60000,
      });

      expect(headers['X-RateLimit-Limit']).toBe('100');
    });

    it('generates X-RateLimit-Remaining header', () => {
      const headers = getRateLimitHeaders({
        limit: 100,
        remaining: 50,
        resetTime: Date.now() + 60000,
      });

      expect(headers['X-RateLimit-Remaining']).toBe('50');
    });

    it('generates X-RateLimit-Reset header', () => {
      const resetTime = Date.now() + 60000;
      const headers = getRateLimitHeaders({
        limit: 100,
        remaining: 50,
        resetTime,
      });

      expect(headers['X-RateLimit-Reset']).toBe(String(Math.ceil(resetTime / 1000)));
    });

    it('includes Retry-After when blocked', () => {
      const headers = getRateLimitHeaders({
        limit: 100,
        remaining: 0,
        resetTime: Date.now() + 60000,
        blocked: true,
      });

      expect(headers['Retry-After']).toBeDefined();
    });
  });

  describe('isWhitelisted', () => {
    it('returns true for whitelisted IPs', () => {
      const result = isWhitelisted('192.168.1.1', ['192.168.1.1', '10.0.0.1']);

      expect(result).toBe(true);
    });

    it('returns false for non-whitelisted IPs', () => {
      const result = isWhitelisted('192.168.1.2', ['192.168.1.1', '10.0.0.1']);

      expect(result).toBe(false);
    });

    it('supports CIDR notation', () => {
      const result = isWhitelisted('192.168.1.50', ['192.168.1.0/24']);

      expect(result).toBe(true);
    });

    it('handles empty whitelist', () => {
      const result = isWhitelisted('192.168.1.1', []);

      expect(result).toBe(false);
    });
  });

  describe('isBlacklisted', () => {
    it('returns true for blacklisted IPs', () => {
      const result = isBlacklisted('192.168.1.1', ['192.168.1.1']);

      expect(result).toBe(true);
    });

    it('returns false for non-blacklisted IPs', () => {
      const result = isBlacklisted('192.168.1.2', ['192.168.1.1']);

      expect(result).toBe(false);
    });

    it('supports CIDR notation', () => {
      const result = isBlacklisted('10.0.0.50', ['10.0.0.0/24']);

      expect(result).toBe(true);
    });
  });

  describe('createRateLimiter', () => {
    it('creates rate limiter with methods', () => {
      const limiter = createRateLimiter({
        limits: {
          default: { maxRequests: 100, windowMs: 60000 },
        },
      });

      expect(limiter.check).toBeDefined();
      expect(limiter.getHeaders).toBeDefined();
      expect(limiter.reset).toBeDefined();
    });

    it('respects whitelist', () => {
      const limiter = createRateLimiter({
        limits: { default: { maxRequests: 1, windowMs: 60000 } },
        whitelist: ['192.168.1.1'],
      });

      // Exhaust limit
      limiter.check({ ip: '192.168.1.1', endpoint: '/api/test' });
      limiter.check({ ip: '192.168.1.1', endpoint: '/api/test' });

      const result = limiter.check({ ip: '192.168.1.1', endpoint: '/api/test' });
      expect(result.allowed).toBe(true);
    });

    it('blocks blacklisted IPs immediately', () => {
      const limiter = createRateLimiter({
        limits: { default: { maxRequests: 100, windowMs: 60000 } },
        blacklist: ['192.168.1.1'],
      });

      const result = limiter.check({ ip: '192.168.1.1', endpoint: '/api/test' });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('blacklist');
    });

    it('uses per-endpoint limits when available', () => {
      const limiter = createRateLimiter({
        limits: {
          default: { maxRequests: 100, windowMs: 60000 },
          '/api/auth/login': { maxRequests: 5, windowMs: 60000 },
        },
      });

      const result = limiter.check({ ip: '192.168.1.1', endpoint: '/api/auth/login' });
      expect(result.limit).toBe(5);
    });

    it('falls back to default limit', () => {
      const limiter = createRateLimiter({
        limits: {
          default: { maxRequests: 100, windowMs: 60000 },
        },
      });

      const result = limiter.check({ ip: '192.168.1.1', endpoint: '/api/unknown' });
      expect(result.limit).toBe(100);
    });
  });
});
