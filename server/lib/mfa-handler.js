/**
 * MFA Handler
 * Multi-factor authentication support with TOTP and backup codes
 */

const crypto = require('crypto');

// Base32 alphabet for encoding secrets
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// TOTP configuration (RFC 6238)
const TOTP_CONFIG = {
  algorithm: 'sha1',
  digits: 6,
  period: 30, // 30-second time step
  window: 1, // Allow +-1 time step for clock drift
};

/**
 * Encode bytes to base32
 * @param {Buffer} buffer - Bytes to encode
 * @returns {string} Base32 encoded string
 */
function base32Encode(buffer) {
  let bits = '';
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, '0');
  }

  let result = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0');
    result += BASE32_CHARS[parseInt(chunk, 2)];
  }

  return result;
}

/**
 * Decode base32 string to bytes
 * @param {string} str - Base32 encoded string
 * @returns {Buffer} Decoded bytes
 */
function base32Decode(str) {
  let bits = '';
  for (const char of str.toUpperCase()) {
    const val = BASE32_CHARS.indexOf(char);
    if (val >= 0) {
      bits += val.toString(2).padStart(5, '0');
    }
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }

  return Buffer.from(bytes);
}

/**
 * Generate TOTP code for given secret and counter
 * @param {string} secret - Base32 encoded secret
 * @param {number} counter - Time counter
 * @returns {string} 6-digit TOTP code
 */
function generateTotp(secret, counter) {
  const key = base32Decode(secret);

  // Convert counter to 8-byte big-endian buffer
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  // Generate HMAC-SHA1
  const hmac = crypto.createHmac(TOTP_CONFIG.algorithm, key);
  hmac.update(counterBuffer);
  const hash = hmac.digest();

  // Dynamic truncation (RFC 4226)
  const offset = hash[hash.length - 1] & 0x0f;
  const code = (
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)
  ) % Math.pow(10, TOTP_CONFIG.digits);

  return code.toString().padStart(TOTP_CONFIG.digits, '0');
}

/**
 * Get current time counter
 * @param {number} offset - Time step offset
 * @returns {number} Time counter
 */
function getTimeCounter(offset = 0) {
  return Math.floor(Date.now() / 1000 / TOTP_CONFIG.period) + offset;
}

/**
 * Generate TOTP secret for a user
 * @param {string} email - User's email for QR code URL
 * @returns {Object} Secret and QR code URL
 */
function generateSecret(email) {
  // Generate 20 random bytes for the secret (160 bits as recommended)
  const secretBytes = crypto.randomBytes(20);
  const secret = base32Encode(secretBytes);

  // Build otpauth:// URL for QR code
  const encodedEmail = encodeURIComponent(email);
  const qrCodeUrl = `otpauth://totp/TLC:${encodedEmail}?secret=${secret}&issuer=TLC`;

  return {
    secret,
    qrCodeUrl,
  };
}

/**
 * Validate TOTP code
 * @param {string} secret - Base32 encoded secret
 * @param {string} code - 6-digit code to validate
 * @returns {boolean} Whether code is valid
 */
function validateCode(secret, code) {
  if (!secret || !code) {
    return false;
  }

  // Validate code format
  if (typeof code !== 'string' || code.length !== TOTP_CONFIG.digits) {
    return false;
  }

  if (!/^\d+$/.test(code)) {
    return false;
  }

  // Check code against current time and allowed window
  const currentCounter = getTimeCounter();

  for (let offset = -TOTP_CONFIG.window; offset <= TOTP_CONFIG.window; offset++) {
    const expectedCode = generateTotp(secret, currentCounter + offset);
    if (timingSafeEqual(code, expectedCode)) {
      return true;
    }
  }

  return false;
}

/**
 * Timing-safe string comparison
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} Whether strings are equal
 */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

/**
 * Generate random alphanumeric string
 * @param {number} length - String length
 * @returns {string} Random alphanumeric string (uppercase)
 */
function generateAlphanumeric(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';

  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }

  return result;
}

/**
 * Hash a backup code for storage
 * @param {string} code - Plain backup code
 * @returns {string} Hashed code
 */
function hashBackupCode(code) {
  return crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
}

/**
 * Generate backup codes
 * @returns {Object} Plain codes (for user) and hashed codes (for storage)
 */
function generateBackupCodes() {
  const codes = [];
  const hashedCodes = [];

  for (let i = 0; i < 10; i++) {
    const code = generateAlphanumeric(8);
    codes.push(code);
    hashedCodes.push(hashBackupCode(code));
  }

  return {
    codes,
    hashedCodes,
  };
}

/**
 * Validate a backup code
 * @param {string} code - Backup code to validate
 * @param {string[]} hashedCodes - Array of hashed backup codes
 * @param {Set<number>} usedCodes - Set of used code indices
 * @returns {Object} Validation result with valid flag and index
 */
function validateBackupCode(code, hashedCodes, usedCodes) {
  if (!code || !hashedCodes) {
    return { valid: false };
  }

  const normalizedCode = code.toUpperCase();
  const codeHash = hashBackupCode(normalizedCode);

  for (let i = 0; i < hashedCodes.length; i++) {
    // Skip used codes
    if (usedCodes && usedCodes.has(i)) {
      continue;
    }

    if (timingSafeEqual(codeHash, hashedCodes[i])) {
      return { valid: true, index: i };
    }
  }

  return { valid: false };
}

/**
 * Check if MFA is required for user based on user settings and policy
 * @param {Object} user - User object
 * @param {Object} policy - MFA policy configuration
 * @returns {boolean} Whether MFA is required
 */
function isMfaRequired(user, policy) {
  if (!user) {
    return false;
  }

  // User has MFA enabled
  if (user.mfaEnabled) {
    return true;
  }

  // Check policy
  if (!policy) {
    return false;
  }

  // Policy requires MFA for all users
  if (policy.required) {
    return true;
  }

  // Policy requires MFA for specific roles
  if (policy.requiredRoles && user.role) {
    return policy.requiredRoles.includes(user.role);
  }

  return false;
}

/**
 * Enable MFA requirement for user
 * @param {Object} user - User object
 * @returns {Object} Updated user object
 */
function enforceMfa(user) {
  if (!user) {
    throw new Error('User is required');
  }

  return {
    ...user,
    mfaEnabled: true,
  };
}

/**
 * Disable MFA for user
 * @param {Object} user - User object
 * @returns {Object} Updated user object with MFA data removed
 */
function disableMfa(user) {
  if (!user) {
    throw new Error('User is required');
  }

  const { mfaSecret, backupCodes, usedBackupCodes, ...rest } = user;

  return {
    ...rest,
    mfaEnabled: false,
  };
}

/**
 * Create in-memory MFA store
 * @returns {Object} MFA store
 */
function createMfaStore() {
  const mfaData = new Map();

  return {
    /**
     * Set up MFA for a user
     * @param {string} userId - User ID
     * @param {string} email - User email
     * @returns {Object} Setup data including secret, QR URL, and backup codes
     */
    async setupMfa(userId, email) {
      const { secret, qrCodeUrl } = generateSecret(email);
      const { codes, hashedCodes } = generateBackupCodes();

      mfaData.set(userId, {
        secret,
        hashedCodes,
        usedCodes: new Set(),
        enabled: true,
        setupAt: new Date().toISOString(),
      });

      return {
        secret,
        qrCodeUrl,
        backupCodes: codes,
      };
    },

    /**
     * Verify TOTP code for user
     * @param {string} userId - User ID
     * @param {string} code - TOTP code
     * @returns {Object} Verification result
     */
    async verifyMfa(userId, code) {
      const data = mfaData.get(userId);

      if (!data || !data.enabled) {
        return { valid: false, error: 'MFA not enabled' };
      }

      const valid = validateCode(data.secret, code);

      return { valid };
    },

    /**
     * Verify backup code for user (marks as used if valid)
     * @param {string} userId - User ID
     * @param {string} code - Backup code
     * @returns {Object} Verification result
     */
    async verifyBackupCode(userId, code) {
      const data = mfaData.get(userId);

      if (!data || !data.enabled) {
        return { valid: false, error: 'MFA not enabled' };
      }

      const result = validateBackupCode(code, data.hashedCodes, data.usedCodes);

      if (result.valid) {
        // Mark code as used
        data.usedCodes.add(result.index);
      }

      return { valid: result.valid };
    },

    /**
     * Regenerate backup codes for user
     * @param {string} userId - User ID
     * @returns {string[]} New backup codes
     */
    async regenerateBackupCodes(userId) {
      const data = mfaData.get(userId);

      if (!data) {
        throw new Error('MFA not set up for user');
      }

      const { codes, hashedCodes } = generateBackupCodes();

      data.hashedCodes = hashedCodes;
      data.usedCodes = new Set();

      return codes;
    },

    /**
     * Get MFA status for user
     * @param {string} userId - User ID
     * @returns {Object} MFA status
     */
    async getMfaStatus(userId) {
      const data = mfaData.get(userId);

      if (!data) {
        return { enabled: false };
      }

      const backupCodesRemaining = data.hashedCodes.length - data.usedCodes.size;

      return {
        enabled: data.enabled,
        backupCodesRemaining,
        setupAt: data.setupAt,
      };
    },

    /**
     * Remove MFA from user
     * @param {string} userId - User ID
     */
    async removeMfa(userId) {
      mfaData.delete(userId);
    },
  };
}

module.exports = {
  generateSecret,
  validateCode,
  generateBackupCodes,
  validateBackupCode,
  isMfaRequired,
  enforceMfa,
  disableMfa,
  createMfaStore,
  // Export for testing
  base32Encode,
  base32Decode,
  generateTotp,
};
