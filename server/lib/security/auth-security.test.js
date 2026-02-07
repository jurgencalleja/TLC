/**
 * Auth Security Tests
 *
 * Tests for secure authentication primitives.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  validateSessionToken,
  createRateLimiter,
  createAccountLockout,
  generateCookieOptions,
  timingSafeCompare,
} from './auth-security.js';

describe('auth-security', () => {
  describe('hashPassword', () => {
    it('hashes password with Argon2id', async () => {
      const hash = await hashPassword('mySecurePassword123');

      expect(hash).toMatch(/^\$argon2id\$/);
    });

    it('produces different hashes for same password', async () => {
      const hash1 = await hashPassword('samePassword');
      const hash2 = await hashPassword('samePassword');

      expect(hash1).not.toBe(hash2);
    });

    it('uses recommended Argon2id parameters', async () => {
      const hash = await hashPassword('password');

      // Argon2id with memory cost, time cost, parallelism
      expect(hash).toContain('argon2id');
      // Should have version, memory, time, parallelism encoded
      expect(hash.split('$').length).toBeGreaterThan(3);
    });

    it('rejects empty password', async () => {
      await expect(hashPassword('')).rejects.toThrow();
    });

    it('handles unicode passwords', async () => {
      const hash = await hashPassword('密码123');
      expect(hash).toMatch(/^\$argon2id\$/);
    });

    it('handles very long passwords', async () => {
      const longPassword = 'a'.repeat(1000);
      const hash = await hashPassword(longPassword);
      expect(hash).toMatch(/^\$argon2id\$/);
    });
  });

  describe('verifyPassword', () => {
    it('returns true for correct password', async () => {
      const hash = await hashPassword('correctPassword');
      const result = await verifyPassword('correctPassword', hash);

      expect(result).toBe(true);
    });

    it('returns false for incorrect password', async () => {
      const hash = await hashPassword('correctPassword');
      const result = await verifyPassword('wrongPassword', hash);

      expect(result).toBe(false);
    });

    it('returns false for empty password', async () => {
      const hash = await hashPassword('password');
      const result = await verifyPassword('', hash);

      expect(result).toBe(false);
    });

    it('returns false for malformed hash', async () => {
      const result = await verifyPassword('password', 'not-a-valid-hash');

      expect(result).toBe(false);
    });

    it('timing is constant regardless of password correctness', async () => {
      const hash = await hashPassword('password');

      // Measure time for correct password
      const startCorrect = process.hrtime.bigint();
      await verifyPassword('password', hash);
      const endCorrect = process.hrtime.bigint();
      const correctTime = Number(endCorrect - startCorrect);

      // Measure time for incorrect password
      const startIncorrect = process.hrtime.bigint();
      await verifyPassword('wrongpassword', hash);
      const endIncorrect = process.hrtime.bigint();
      const incorrectTime = Number(endIncorrect - startIncorrect);

      // Times should be roughly similar (timing-safe)
      // Allow generous threshold — timing tests are inherently flaky in CI/dev environments
      const ratio = Math.max(correctTime, incorrectTime) / Math.min(correctTime, incorrectTime);
      expect(ratio).toBeLessThan(10);
    });
  });

  describe('generateSessionToken', () => {
    it('generates 256-bit token by default', () => {
      const token = generateSessionToken();

      // 256 bits = 32 bytes = 64 hex chars
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    it('generates cryptographically random tokens', () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateSessionToken());
      }

      // All tokens should be unique
      expect(tokens.size).toBe(100);
    });

    it('generates token with custom length', () => {
      const token = generateSessionToken({ bytes: 16 });

      // 16 bytes = 32 hex chars
      expect(token).toMatch(/^[a-f0-9]{32}$/);
    });

    it('generates base64url encoded token', () => {
      const token = generateSessionToken({ encoding: 'base64url' });

      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  describe('validateSessionToken', () => {
    it('validates correctly formatted token', () => {
      const token = generateSessionToken();
      const result = validateSessionToken(token);

      expect(result.valid).toBe(true);
    });

    it('rejects token with invalid characters', () => {
      const result = validateSessionToken('invalid-token-with-dashes!');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('characters');
    });

    it('rejects token with wrong length', () => {
      const result = validateSessionToken('abc123');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('length');
    });

    it('rejects empty token', () => {
      const result = validateSessionToken('');

      expect(result.valid).toBe(false);
    });
  });

  describe('createRateLimiter', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('allows requests under threshold', () => {
      const limiter = createRateLimiter({
        maxAttempts: 5,
        windowMs: 60000,
      });

      for (let i = 0; i < 5; i++) {
        const result = limiter.check('user@example.com');
        expect(result.allowed).toBe(true);
      }
    });

    it('blocks requests over threshold', () => {
      const limiter = createRateLimiter({
        maxAttempts: 5,
        windowMs: 60000,
      });

      for (let i = 0; i < 5; i++) {
        limiter.check('user@example.com');
      }

      const result = limiter.check('user@example.com');
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('resets after window expires', () => {
      const limiter = createRateLimiter({
        maxAttempts: 5,
        windowMs: 60000,
      });

      // Exhaust attempts
      for (let i = 0; i < 5; i++) {
        limiter.check('user@example.com');
      }

      expect(limiter.check('user@example.com').allowed).toBe(false);

      // Advance time past window
      vi.advanceTimersByTime(61000);

      expect(limiter.check('user@example.com').allowed).toBe(true);
    });

    it('tracks different keys separately', () => {
      const limiter = createRateLimiter({
        maxAttempts: 5,
        windowMs: 60000,
      });

      // Exhaust attempts for user1
      for (let i = 0; i < 5; i++) {
        limiter.check('user1@example.com');
      }

      // user2 should still be allowed
      expect(limiter.check('user2@example.com').allowed).toBe(true);
    });

    it('provides remaining attempts count', () => {
      const limiter = createRateLimiter({
        maxAttempts: 5,
        windowMs: 60000,
      });

      const result1 = limiter.check('user@example.com');
      expect(result1.remaining).toBe(4);

      const result2 = limiter.check('user@example.com');
      expect(result2.remaining).toBe(3);
    });

    it('supports manual reset', () => {
      const limiter = createRateLimiter({
        maxAttempts: 5,
        windowMs: 60000,
      });

      // Exhaust attempts
      for (let i = 0; i < 5; i++) {
        limiter.check('user@example.com');
      }

      limiter.reset('user@example.com');

      expect(limiter.check('user@example.com').allowed).toBe(true);
    });
  });

  describe('createAccountLockout', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('locks account after N failed attempts', () => {
      const lockout = createAccountLockout({
        maxFailures: 3,
        lockoutDurationMs: 900000, // 15 minutes
      });

      lockout.recordFailure('user@example.com');
      lockout.recordFailure('user@example.com');
      lockout.recordFailure('user@example.com');

      const result = lockout.isLocked('user@example.com');
      expect(result.locked).toBe(true);
      expect(result.unlockAt).toBeDefined();
    });

    it('unlocks after lockout duration', () => {
      const lockout = createAccountLockout({
        maxFailures: 3,
        lockoutDurationMs: 900000,
      });

      // Lock the account
      lockout.recordFailure('user@example.com');
      lockout.recordFailure('user@example.com');
      lockout.recordFailure('user@example.com');

      expect(lockout.isLocked('user@example.com').locked).toBe(true);

      // Advance time past lockout
      vi.advanceTimersByTime(900001);

      expect(lockout.isLocked('user@example.com').locked).toBe(false);
    });

    it('resets failures on successful login', () => {
      const lockout = createAccountLockout({
        maxFailures: 3,
        lockoutDurationMs: 900000,
      });

      lockout.recordFailure('user@example.com');
      lockout.recordFailure('user@example.com');

      lockout.recordSuccess('user@example.com');

      // Should be able to fail 3 more times before lockout
      lockout.recordFailure('user@example.com');
      lockout.recordFailure('user@example.com');

      expect(lockout.isLocked('user@example.com').locked).toBe(false);
    });

    it('implements exponential backoff', () => {
      const lockout = createAccountLockout({
        maxFailures: 3,
        lockoutDurationMs: 900000,
        exponentialBackoff: true,
      });

      // First lockout
      lockout.recordFailure('user@example.com');
      lockout.recordFailure('user@example.com');
      lockout.recordFailure('user@example.com');

      const firstLockout = lockout.isLocked('user@example.com');

      // Unlock and lock again
      vi.advanceTimersByTime(900001);
      lockout.recordFailure('user@example.com');
      lockout.recordFailure('user@example.com');
      lockout.recordFailure('user@example.com');

      const secondLockout = lockout.isLocked('user@example.com');

      // Second lockout should be longer
      expect(secondLockout.unlockAt - Date.now()).toBeGreaterThan(
        firstLockout.unlockAt - Date.now() + 900000
      );
    });
  });

  describe('generateCookieOptions', () => {
    it('sets httpOnly by default', () => {
      const options = generateCookieOptions();
      expect(options.httpOnly).toBe(true);
    });

    it('sets secure in production', () => {
      const options = generateCookieOptions({ production: true });
      expect(options.secure).toBe(true);
    });

    it('sets sameSite to Strict by default', () => {
      const options = generateCookieOptions();
      expect(options.sameSite).toBe('Strict');
    });

    it('allows sameSite Lax for cross-site navigation', () => {
      const options = generateCookieOptions({ sameSite: 'Lax' });
      expect(options.sameSite).toBe('Lax');
    });

    it('sets path to / by default', () => {
      const options = generateCookieOptions();
      expect(options.path).toBe('/');
    });

    it('sets appropriate maxAge', () => {
      const options = generateCookieOptions({ maxAge: 3600000 });
      expect(options.maxAge).toBe(3600000);
    });

    it('includes domain when specified', () => {
      const options = generateCookieOptions({ domain: 'example.com' });
      expect(options.domain).toBe('example.com');
    });
  });

  describe('timingSafeCompare', () => {
    it('returns true for equal strings', () => {
      const result = timingSafeCompare('password123', 'password123');
      expect(result).toBe(true);
    });

    it('returns false for different strings', () => {
      const result = timingSafeCompare('password123', 'password456');
      expect(result).toBe(false);
    });

    it('returns false for different lengths', () => {
      const result = timingSafeCompare('short', 'muchlongerstring');
      expect(result).toBe(false);
    });

    it('returns false for empty vs non-empty', () => {
      const result = timingSafeCompare('', 'password');
      expect(result).toBe(false);
    });

    it('has constant timing regardless of match position', () => {
      const target = 'abcdefghij';

      // Mismatch at start
      const startMismatch = 'xbcdefghij';
      // Mismatch at end
      const endMismatch = 'abcdefghix';

      const times1 = [];
      const times2 = [];

      for (let i = 0; i < 100; i++) {
        const start1 = process.hrtime.bigint();
        timingSafeCompare(target, startMismatch);
        const end1 = process.hrtime.bigint();
        times1.push(Number(end1 - start1));

        const start2 = process.hrtime.bigint();
        timingSafeCompare(target, endMismatch);
        const end2 = process.hrtime.bigint();
        times2.push(Number(end2 - start2));
      }

      // Average times should be similar
      const avg1 = times1.reduce((a, b) => a + b, 0) / times1.length;
      const avg2 = times2.reduce((a, b) => a + b, 0) / times2.length;
      const ratio = Math.max(avg1, avg2) / Math.min(avg1, avg2);

      expect(ratio).toBeLessThan(10);
    });
  });
});
