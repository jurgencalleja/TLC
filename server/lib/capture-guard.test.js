/**
 * Capture Guard Tests - Phase 82 Task 4
 *
 * Tests for endpoint hardening: size limits, dedup, rate limiting.
 *
 * RED: capture-guard.js does not exist yet.
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';

import { createCaptureGuard } from './capture-guard.js';

describe('capture-guard', () => {
  let guard;

  beforeEach(() => {
    guard = createCaptureGuard();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('payload size validation', () => {
    it('rejects payload over 100KB', () => {
      const hugePayload = {
        exchanges: [{
          user: 'x'.repeat(50000),
          assistant: 'y'.repeat(60000),
          timestamp: Date.now(),
        }],
      };

      const result = guard.validate(hugePayload, 'test-project');

      expect(result.ok).toBe(false);
      expect(result.status).toBe(413);
      expect(result.error).toMatch(/payload.*too.*large/i);
    });

    it('accepts payload under 100KB', () => {
      const normalPayload = {
        exchanges: [{
          user: 'How should we handle auth?',
          assistant: 'Use JWT tokens',
          timestamp: Date.now(),
        }],
      };

      const result = guard.validate(normalPayload, 'test-project');

      expect(result.ok).toBe(true);
    });
  });

  describe('exchange validation', () => {
    it('rejects exchange without user or assistant', () => {
      const payload = {
        exchanges: [{ timestamp: Date.now() }],
      };

      const result = guard.validate(payload, 'test-project');

      expect(result.ok).toBe(false);
      expect(result.status).toBe(400);
    });

    it('accepts exchange with only assistant message', () => {
      const payload = {
        exchanges: [{ assistant: 'some response', timestamp: Date.now() }],
      };

      const result = guard.validate(payload, 'test-project');

      expect(result.ok).toBe(true);
    });

    it('accepts exchange with only user message', () => {
      const payload = {
        exchanges: [{ user: 'some question', timestamp: Date.now() }],
      };

      const result = guard.validate(payload, 'test-project');

      expect(result.ok).toBe(true);
    });
  });

  describe('deduplication', () => {
    it('deduplicates identical exchanges within 60s window', () => {
      const exchange = {
        user: 'What cache?',
        assistant: 'Use Redis',
        timestamp: Date.now(),
      };

      const first = guard.deduplicate([exchange], 'proj-1');
      expect(first).toHaveLength(1);

      // Same exchange again immediately
      const second = guard.deduplicate([exchange], 'proj-1');
      expect(second).toHaveLength(0);
    });

    it('allows same exchange after 60s window expires', () => {
      const exchange = {
        user: 'What cache?',
        assistant: 'Use Redis',
        timestamp: Date.now(),
      };

      const first = guard.deduplicate([exchange], 'proj-1');
      expect(first).toHaveLength(1);

      // Advance 61 seconds
      vi.advanceTimersByTime(61000);

      const second = guard.deduplicate([exchange], 'proj-1');
      expect(second).toHaveLength(1);
    });

    it('deduplicates per-project (same exchange in different projects is allowed)', () => {
      const exchange = {
        user: 'What cache?',
        assistant: 'Use Redis',
        timestamp: Date.now(),
      };

      const proj1 = guard.deduplicate([exchange], 'proj-1');
      expect(proj1).toHaveLength(1);

      const proj2 = guard.deduplicate([exchange], 'proj-2');
      expect(proj2).toHaveLength(1);
    });
  });

  describe('rate limiting', () => {
    it('allows requests under rate limit', () => {
      for (let i = 0; i < 50; i++) {
        const result = guard.checkRateLimit('proj-1');
        expect(result.ok).toBe(true);
      }
    });

    it('rate limits at 100 captures per minute', () => {
      // Burn through 100 requests
      for (let i = 0; i < 100; i++) {
        guard.checkRateLimit('proj-1');
      }

      const result = guard.checkRateLimit('proj-1');

      expect(result.ok).toBe(false);
      expect(result.status).toBe(429);
    });

    it('resets rate limit after 60 seconds', () => {
      // Hit the limit
      for (let i = 0; i < 100; i++) {
        guard.checkRateLimit('proj-1');
      }
      expect(guard.checkRateLimit('proj-1').ok).toBe(false);

      // Advance 61 seconds
      vi.advanceTimersByTime(61000);

      expect(guard.checkRateLimit('proj-1').ok).toBe(true);
    });

    it('rate limits per-project', () => {
      // Hit limit on proj-1
      for (let i = 0; i < 100; i++) {
        guard.checkRateLimit('proj-1');
      }
      expect(guard.checkRateLimit('proj-1').ok).toBe(false);

      // proj-2 should still be allowed
      expect(guard.checkRateLimit('proj-2').ok).toBe(true);
    });
  });
});
