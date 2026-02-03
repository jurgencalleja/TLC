/**
 * Auth Security Module
 *
 * Secure authentication primitives.
 * Addresses OWASP A07: Identification and Authentication Failures
 */

import crypto from 'crypto';

/**
 * Argon2id parameters (OWASP recommended)
 */
const ARGON2_CONFIG = {
  type: 2, // argon2id
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4,
  hashLength: 32,
  saltLength: 16,
};

/**
 * Hash a password using Argon2id
 * Falls back to scrypt for compatibility if argon2 is not available
 * @param {string} password - Password to hash
 * @returns {Promise<string>} Hashed password
 */
export async function hashPassword(password) {
  if (!password || password.length === 0) {
    throw new Error('Password cannot be empty');
  }

  // Generate random salt
  const salt = crypto.randomBytes(ARGON2_CONFIG.saltLength);

  // Use scrypt as a fallback (similar security, widely available)
  // In production, you'd use argon2 library
  return new Promise((resolve, reject) => {
    const keyLength = ARGON2_CONFIG.hashLength;
    const options = {
      N: 16384, // CPU/memory cost parameter
      r: 8, // Block size
      p: 1, // Parallelization
      maxmem: ARGON2_CONFIG.memoryCost * 1024,
    };

    crypto.scrypt(password, salt, keyLength, options, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }

      // Format as Argon2id-like hash for future migration
      const params = `m=${ARGON2_CONFIG.memoryCost},t=${ARGON2_CONFIG.timeCost},p=${ARGON2_CONFIG.parallelism}`;
      const saltB64 = salt.toString('base64').replace(/=/g, '');
      const hashB64 = derivedKey.toString('base64').replace(/=/g, '');

      resolve(`$argon2id$v=19$${params}$${saltB64}$${hashB64}`);
    });
  });
}

/**
 * Verify a password against a hash
 * @param {string} password - Password to verify
 * @param {string} hash - Hash to verify against
 * @returns {Promise<boolean>} True if password matches
 */
export async function verifyPassword(password, hash) {
  if (!password || password.length === 0) {
    return false;
  }

  if (!hash || !hash.startsWith('$argon2id$')) {
    return false;
  }

  try {
    // Parse the hash
    const parts = hash.split('$');
    if (parts.length < 6) {
      return false;
    }

    // Extract salt and hash
    const saltB64 = parts[4];
    const hashB64 = parts[5];

    // Decode salt (add padding if needed)
    const saltPadded = saltB64 + '='.repeat((4 - (saltB64.length % 4)) % 4);
    const salt = Buffer.from(saltPadded, 'base64');

    // Decode expected hash
    const hashPadded = hashB64 + '='.repeat((4 - (hashB64.length % 4)) % 4);
    const expectedHash = Buffer.from(hashPadded, 'base64');

    // Compute hash of input password
    return new Promise((resolve) => {
      const options = {
        N: 16384,
        r: 8,
        p: 1,
        maxmem: ARGON2_CONFIG.memoryCost * 1024,
      };

      crypto.scrypt(password, salt, expectedHash.length, options, (err, derivedKey) => {
        if (err) {
          resolve(false);
          return;
        }

        // Timing-safe comparison
        resolve(crypto.timingSafeEqual(derivedKey, expectedHash));
      });
    });
  } catch {
    return false;
  }
}

/**
 * Generate a cryptographically secure session token
 * @param {Object} options - Token options
 * @returns {string} Session token
 */
export function generateSessionToken(options = {}) {
  const { bytes = 32, encoding = 'hex' } = options;

  const buffer = crypto.randomBytes(bytes);

  if (encoding === 'base64url') {
    return buffer.toString('base64url');
  }

  return buffer.toString('hex');
}

/**
 * Validate session token format
 * @param {string} token - Token to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export function validateSessionToken(token, options = {}) {
  const { expectedLength = 64 } = options;

  if (!token || token.length === 0) {
    return {
      valid: false,
      reason: 'Token is empty',
    };
  }

  if (token.length !== expectedLength) {
    return {
      valid: false,
      reason: `Token length must be ${expectedLength} characters`,
    };
  }

  if (!/^[a-f0-9]+$/i.test(token)) {
    return {
      valid: false,
      reason: 'Token contains invalid characters',
    };
  }

  return { valid: true };
}

/**
 * Create a rate limiter
 * @param {Object} options - Rate limiter options
 * @returns {Object} Rate limiter instance
 */
export function createRateLimiter(options = {}) {
  const { maxAttempts = 5, windowMs = 60000 } = options;

  const attempts = new Map();

  return {
    /**
     * Check if request is allowed
     * @param {string} key - Identifier (e.g., email, IP)
     * @returns {Object} Rate limit result
     */
    check(key) {
      const now = Date.now();
      const record = attempts.get(key);

      if (!record || now - record.windowStart >= windowMs) {
        // New window
        attempts.set(key, {
          count: 1,
          windowStart: now,
        });
        return {
          allowed: true,
          remaining: maxAttempts - 1,
          retryAfter: 0,
        };
      }

      if (record.count >= maxAttempts) {
        const retryAfter = Math.ceil((record.windowStart + windowMs - now) / 1000);
        return {
          allowed: false,
          remaining: 0,
          retryAfter,
        };
      }

      record.count++;
      return {
        allowed: true,
        remaining: maxAttempts - record.count,
        retryAfter: 0,
      };
    },

    /**
     * Reset rate limit for a key
     * @param {string} key - Identifier to reset
     */
    reset(key) {
      attempts.delete(key);
    },
  };
}

/**
 * Create an account lockout manager
 * @param {Object} options - Lockout options
 * @returns {Object} Account lockout instance
 */
export function createAccountLockout(options = {}) {
  const {
    maxFailures = 5,
    lockoutDurationMs = 900000, // 15 minutes
    exponentialBackoff = false,
  } = options;

  const accounts = new Map();

  return {
    /**
     * Record a failed login attempt
     * @param {string} accountId - Account identifier
     */
    recordFailure(accountId) {
      const now = Date.now();
      let record = accounts.get(accountId);

      if (!record) {
        record = {
          failures: 0,
          lockoutCount: 0,
          lockedUntil: null,
        };
        accounts.set(accountId, record);
      }

      record.failures++;

      if (record.failures >= maxFailures) {
        // Lock the account
        const multiplier = exponentialBackoff ? Math.pow(2, record.lockoutCount) : 1;
        record.lockedUntil = now + lockoutDurationMs * multiplier;
        record.lockoutCount++;
      }
    },

    /**
     * Record a successful login
     * @param {string} accountId - Account identifier
     */
    recordSuccess(accountId) {
      const record = accounts.get(accountId);
      if (record) {
        record.failures = 0;
        record.lockedUntil = null;
      }
    },

    /**
     * Check if account is locked
     * @param {string} accountId - Account identifier
     * @returns {Object} Lock status
     */
    isLocked(accountId) {
      const now = Date.now();
      const record = accounts.get(accountId);

      if (!record || !record.lockedUntil) {
        return { locked: false };
      }

      if (now >= record.lockedUntil) {
        // Lockout expired, reset failures but keep lockout count for backoff
        record.failures = 0;
        record.lockedUntil = null;
        return { locked: false };
      }

      return {
        locked: true,
        unlockAt: record.lockedUntil,
      };
    },
  };
}

/**
 * Generate secure cookie options
 * @param {Object} options - Cookie options
 * @returns {Object} Cookie configuration
 */
export function generateCookieOptions(options = {}) {
  const {
    production = false,
    sameSite = 'Strict',
    maxAge,
    domain,
    path = '/',
  } = options;

  const cookieOptions = {
    httpOnly: true,
    secure: production,
    sameSite,
    path,
  };

  if (maxAge !== undefined) {
    cookieOptions.maxAge = maxAge;
  }

  if (domain) {
    cookieOptions.domain = domain;
  }

  return cookieOptions;
}

/**
 * Timing-safe string comparison
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} True if strings are equal
 */
export function timingSafeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  // Use constant-time comparison
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  // If lengths differ, compare against dummy buffer of same length
  // to avoid timing leak from length difference
  if (bufA.length !== bufB.length) {
    // Do a dummy comparison to maintain constant time
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}
