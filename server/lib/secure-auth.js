/**
 * Secure Auth Module
 *
 * Secure authentication patterns for code generation
 */

/**
 * Create a secure auth configuration
 * @param {Object} options - Auth options
 * @returns {Object} Auth configuration
 */
function createSecureAuth(options = {}) {
  return {
    hashAlgorithm: options.hashAlgorithm || 'argon2id',
    memoryCost: options.memoryCost || 65536,
    timeCost: options.timeCost || 3,
    parallelism: options.parallelism || 4,
  };
}

/**
 * Generate password hashing configuration
 * @param {Object} options - Hashing options
 * @returns {Object} Hashing configuration
 */
function generatePasswordHash(options = {}) {
  const algorithm = options.algorithm || 'argon2id';
  const memoryCost = options.memoryCost || 65536;
  const timeCost = options.timeCost || 3;
  const parallelism = options.parallelism || 4;

  const params = {
    algorithm,
    memoryCost,
    timeCost,
    parallelism,
  };

  let warning = null;
  if (algorithm === 'bcrypt') {
    warning = 'bcrypt is less secure than argon2id. Consider using argon2id as recommended by OWASP.';
  }

  const code = `
const argon2 = require('argon2');

async function hashPassword(password) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: ${memoryCost},
    timeCost: ${timeCost},
    parallelism: ${parallelism},
  });
}`;

  return {
    params,
    code,
    warning,
  };
}

/**
 * Generate password verification code
 * @param {Object} options - Verification options
 * @returns {string} Generated code
 */
function verifyPassword(options = {}) {
  const { language = 'javascript' } = options;

  if (language === 'javascript') {
    return `
const argon2 = require('argon2');
const crypto = require('crypto');

async function verifyPassword(password, hash) {
  try {
    // Use argon2's built-in timing-safe comparison
    const isValid = await argon2.verify(hash, password);
    return isValid;
  } catch (error) {
    // Log error but don't expose details
    console.error('Password verification error');
    return false;
  }
}`;
  }

  return '';
}

/**
 * Generate rate limiter configuration
 * @param {Object} options - Rate limiter options
 * @returns {Object} Rate limiter configuration
 */
function generateRateLimiter(options = {}) {
  const {
    type = 'sliding-window',
    maxAttempts = 5,
    windowMs = 60000,
    keyBy = 'ip',
    store = 'memory',
    tokensPerInterval = 5,
  } = options;

  const code = store === 'redis'
    ? `
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

const limiter = rateLimit({
  store: new RedisStore({ /* redis config */ }),
  windowMs: ${windowMs},
  max: ${maxAttempts},
  keyGenerator: (req) => req.${keyBy},
  message: 'Too many attempts, please try again later',
});`
    : `
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: ${windowMs},
  max: ${maxAttempts},
  keyGenerator: (req) => req.${keyBy},
  message: 'Too many attempts, please try again later',
});`;

  return {
    type,
    maxAttempts,
    windowMs,
    keyBy,
    store,
    tokensPerInterval,
    code,
  };
}

/**
 * Generate account lockout configuration
 * @param {Object} options - Lockout options
 * @returns {Object} Lockout configuration
 */
function generateAccountLockout(options = {}) {
  const {
    maxAttempts = 5,
    lockoutDuration = 900000,
    progressive = false,
    baseDelay = 60000,
    notifyOnLockout = false,
    unlockMethod = 'time',
    auditLog = false,
  } = options;

  const code = `
class AccountLockout {
  constructor() {
    this.attempts = new Map();
    this.locked = new Map();
  }

  async recordFailure(userId) {
    const current = this.attempts.get(userId) || 0;
    const newCount = current + 1;
    this.attempts.set(userId, newCount);

    if (newCount >= ${maxAttempts}) {
      this.locked.set(userId, Date.now() + ${lockoutDuration});
      ${auditLog ? 'await this.logLockout(userId);' : ''}
      ${notifyOnLockout ? 'await this.notifyUser(userId);' : ''}
    }
  }

  isLocked(userId) {
    const lockUntil = this.locked.get(userId);
    if (!lockUntil) return false;
    if (Date.now() > lockUntil) {
      this.locked.delete(userId);
      this.attempts.delete(userId);
      return false;
    }
    return true;
  }
}`;

  return {
    maxAttempts,
    lockoutDuration,
    progressive,
    baseDelay,
    notifyOnLockout,
    unlockMethod,
    auditLog,
    code,
  };
}

/**
 * Generate secure session configuration
 * @param {Object} options - Session options
 * @returns {Object} Session configuration
 */
function generateSessionConfig(options = {}) {
  const { maxAge = 3600000, regenerateOnLogin = true } = options;

  const cookie = {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge,
  };

  const code = `
const crypto = require('crypto');
const session = require('express-session');

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: ${maxAge},
  },
  genid: () => crypto.randomBytes(32).toString('hex'),
}));

// Regenerate session on login
async function loginUser(req, user) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = user.id;
      resolve();
    });
  });
}`;

  return {
    cookie,
    regenerateOnLogin,
    code,
  };
}

/**
 * Generate complete auth module code
 * @param {Object} options - Generation options
 * @returns {string} Generated code
 */
function generateAuthCode(options = {}) {
  const { language = 'javascript', features = [], owaspCompliant = false } = options;

  if (language === 'typescript') {
    return `
interface AuthConfig {
  maxAttempts: number;
  lockoutDuration: number;
}

interface AuthResult {
  success: boolean;
  error?: string;
}

async function hashPassword(password: string): Promise<string> {
  // Use argon2id
  return hash;
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return verified;
}`;
  }

  if (language === 'python') {
    return `
import argon2
from functools import wraps

def hash_password(password: str) -> str:
    ph = argon2.PasswordHasher()
    return ph.hash(password)

def verify_password(password: str, hash: str) -> bool:
    ph = argon2.PasswordHasher()
    try:
        return ph.verify(hash, password)
    except argon2.exceptions.VerifyMismatchError:
        return False`;
  }

  // JavaScript
  return `
const argon2 = require('argon2');
const crypto = require('crypto');

async function hashPassword(password) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

async function verifyPassword(password, hash) {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    return false;
  }
}

function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

module.exports = { hashPassword, verifyPassword, generateSecureToken };`;
}

module.exports = {
  createSecureAuth,
  generatePasswordHash,
  verifyPassword,
  generateRateLimiter,
  generateAccountLockout,
  generateSessionConfig,
  generateAuthCode,
};
