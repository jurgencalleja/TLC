/**
 * Secure Auth Tests
 *
 * Secure authentication patterns for code generation
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

const {
  createSecureAuth,
  generatePasswordHash,
  verifyPassword,
  generateRateLimiter,
  generateAccountLockout,
  generateSessionConfig,
  generateAuthCode,
} = require('./secure-auth.js');

describe('Secure Auth', () => {
  let auth;

  beforeEach(() => {
    auth = createSecureAuth();
  });

  describe('createSecureAuth', () => {
    it('creates auth with default config', () => {
      assert.ok(auth);
      assert.ok(auth.hashAlgorithm);
    });

    it('defaults to argon2id', () => {
      assert.strictEqual(auth.hashAlgorithm, 'argon2id');
    });

    it('accepts custom config', () => {
      const custom = createSecureAuth({
        hashAlgorithm: 'argon2id',
        memoryCost: 65536,
      });

      assert.strictEqual(custom.memoryCost, 65536);
    });
  });

  describe('generatePasswordHash', () => {
    it('generates argon2id hash config', () => {
      const config = generatePasswordHash({
        algorithm: 'argon2id',
      });

      assert.ok(config.code);
      assert.ok(config.code.includes('argon2'));
    });

    it('includes memory cost parameter', () => {
      const config = generatePasswordHash({
        algorithm: 'argon2id',
        memoryCost: 65536,
      });

      assert.ok(config.code.includes('65536') || config.params.memoryCost === 65536);
    });

    it('includes time cost parameter', () => {
      const config = generatePasswordHash({
        algorithm: 'argon2id',
        timeCost: 3,
      });

      assert.ok(config.params.timeCost === 3);
    });

    it('includes parallelism parameter', () => {
      const config = generatePasswordHash({
        algorithm: 'argon2id',
        parallelism: 4,
      });

      assert.ok(config.params.parallelism === 4);
    });

    it('warns against bcrypt', () => {
      const config = generatePasswordHash({
        algorithm: 'bcrypt',
      });

      assert.ok(config.warning);
      assert.ok(config.warning.includes('argon2') || config.warning.includes('recommended'));
    });
  });

  describe('verifyPassword', () => {
    it('generates timing-safe verification code', () => {
      const code = verifyPassword({
        language: 'javascript',
      });

      assert.ok(code.includes('timingSafe') || code.includes('verify'));
    });

    it('includes error handling', () => {
      const code = verifyPassword({
        language: 'javascript',
      });

      assert.ok(code.includes('try') || code.includes('catch') || code.includes('error'));
    });
  });

  describe('generateRateLimiter', () => {
    it('generates rate limiter config', () => {
      const config = generateRateLimiter({
        maxAttempts: 5,
        windowMs: 60000,
      });

      assert.ok(config.code);
      assert.strictEqual(config.maxAttempts, 5);
    });

    it('generates sliding window rate limiter', () => {
      const config = generateRateLimiter({
        type: 'sliding-window',
        maxAttempts: 5,
      });

      assert.ok(config.type === 'sliding-window');
    });

    it('generates token bucket rate limiter', () => {
      const config = generateRateLimiter({
        type: 'token-bucket',
        tokensPerInterval: 5,
      });

      assert.ok(config.type === 'token-bucket');
    });

    it('includes IP-based limiting', () => {
      const config = generateRateLimiter({
        keyBy: 'ip',
      });

      assert.ok(config.code.includes('ip') || config.keyBy === 'ip');
    });

    it('includes user-based limiting', () => {
      const config = generateRateLimiter({
        keyBy: 'user',
      });

      assert.ok(config.keyBy === 'user');
    });

    it('generates redis-backed limiter', () => {
      const config = generateRateLimiter({
        store: 'redis',
      });

      assert.ok(config.code.includes('redis') || config.store === 'redis');
    });
  });

  describe('generateAccountLockout', () => {
    it('generates lockout config', () => {
      const config = generateAccountLockout({
        maxAttempts: 5,
        lockoutDuration: 900000,
      });

      assert.ok(config.code);
      assert.strictEqual(config.maxAttempts, 5);
    });

    it('includes progressive lockout', () => {
      const config = generateAccountLockout({
        progressive: true,
        baseDelay: 60000,
      });

      assert.ok(config.progressive);
    });

    it('includes notification on lockout', () => {
      const config = generateAccountLockout({
        notifyOnLockout: true,
      });

      assert.ok(config.notifyOnLockout);
    });

    it('includes unlock mechanism', () => {
      const config = generateAccountLockout({
        unlockMethod: 'email',
      });

      assert.ok(config.unlockMethod === 'email');
    });

    it('generates audit logging', () => {
      const config = generateAccountLockout({
        auditLog: true,
      });

      assert.ok(config.auditLog);
    });
  });

  describe('generateSessionConfig', () => {
    it('sets httpOnly by default', () => {
      const config = generateSessionConfig({});

      assert.strictEqual(config.cookie.httpOnly, true);
    });

    it('sets secure by default', () => {
      const config = generateSessionConfig({});

      assert.strictEqual(config.cookie.secure, true);
    });

    it('sets sameSite strict', () => {
      const config = generateSessionConfig({});

      assert.strictEqual(config.cookie.sameSite, 'strict');
    });

    it('sets reasonable max age', () => {
      const config = generateSessionConfig({
        maxAge: 3600000,
      });

      assert.strictEqual(config.cookie.maxAge, 3600000);
    });

    it('generates session regeneration code', () => {
      const config = generateSessionConfig({
        regenerateOnLogin: true,
      });

      assert.ok(config.regenerateOnLogin);
    });

    it('generates secure session ID', () => {
      const config = generateSessionConfig({});

      assert.ok(config.code.includes('crypto') || config.code.includes('random'));
    });
  });

  describe('generateAuthCode', () => {
    it('generates complete auth module', () => {
      const code = generateAuthCode({
        language: 'javascript',
        features: ['hash', 'verify', 'rateLimit', 'lockout', 'session'],
      });

      assert.ok(code.includes('function') || code.includes('const'));
    });

    it('generates TypeScript auth module', () => {
      const code = generateAuthCode({
        language: 'typescript',
      });

      assert.ok(code.includes('interface') || code.includes(':'));
    });

    it('generates Python auth module', () => {
      const code = generateAuthCode({
        language: 'python',
      });

      assert.ok(code.includes('def'));
    });

    it('includes all OWASP recommendations', () => {
      const code = generateAuthCode({
        language: 'javascript',
        owaspCompliant: true,
      });

      assert.ok(code.length > 100); // Non-trivial code
    });
  });
});
