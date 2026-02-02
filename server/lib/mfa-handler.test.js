import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateSecret,
  validateCode,
  generateBackupCodes,
  validateBackupCode,
  isMfaRequired,
  enforceMfa,
  disableMfa,
  createMfaStore,
} from './mfa-handler.js';

describe('mfa-handler', () => {
  describe('generateSecret', () => {
    it('creates TOTP secret', () => {
      const result = generateSecret('user@example.com');

      expect(result.secret).toBeDefined();
      expect(result.secret.length).toBeGreaterThan(0);
    });

    it('returns QR code URL in otpauth format', () => {
      const result = generateSecret('user@example.com');

      expect(result.qrCodeUrl).toBeDefined();
      expect(result.qrCodeUrl).toMatch(/^otpauth:\/\/totp\//);
    });

    it('includes email in QR code URL', () => {
      const result = generateSecret('user@example.com');

      // Email is URL-encoded in the QR code URL
      expect(result.qrCodeUrl).toContain('TLC:user%40example.com');
    });

    it('includes secret in QR code URL', () => {
      const result = generateSecret('user@example.com');

      expect(result.qrCodeUrl).toContain('secret=');
      expect(result.qrCodeUrl).toContain(result.secret);
    });

    it('includes issuer in QR code URL', () => {
      const result = generateSecret('user@example.com');

      expect(result.qrCodeUrl).toContain('issuer=TLC');
    });

    it('generates base32 encoded secret', () => {
      const result = generateSecret('user@example.com');

      // Base32 only contains A-Z and 2-7
      expect(result.secret).toMatch(/^[A-Z2-7]+$/);
    });

    it('generates unique secrets for each call', () => {
      const result1 = generateSecret('user@example.com');
      const result2 = generateSecret('user@example.com');

      expect(result1.secret).not.toBe(result2.secret);
    });
  });

  describe('validateCode', () => {
    it('accepts valid TOTP code', () => {
      const { secret } = generateSecret('user@example.com');

      // Generate a valid code for current time
      const validCode = generateValidTotpCode(secret);

      expect(validateCode(secret, validCode)).toBe(true);
    });

    it('rejects invalid code', () => {
      const { secret } = generateSecret('user@example.com');

      expect(validateCode(secret, '000000')).toBe(false);
      expect(validateCode(secret, '123456')).toBe(false);
    });

    it('handles clock drift with +1 window', () => {
      const { secret } = generateSecret('user@example.com');

      // Generate code for one time step in the future
      const futureCode = generateValidTotpCode(secret, 1);

      expect(validateCode(secret, futureCode)).toBe(true);
    });

    it('handles clock drift with -1 window', () => {
      const { secret } = generateSecret('user@example.com');

      // Generate code for one time step in the past
      const pastCode = generateValidTotpCode(secret, -1);

      expect(validateCode(secret, pastCode)).toBe(true);
    });

    it('rejects codes outside window', () => {
      const { secret } = generateSecret('user@example.com');

      // Generate code for 2 time steps away (outside +-1 window)
      const farCode = generateValidTotpCode(secret, 2);

      expect(validateCode(secret, farCode)).toBe(false);
    });

    it('rejects non-numeric codes', () => {
      const { secret } = generateSecret('user@example.com');

      expect(validateCode(secret, 'abcdef')).toBe(false);
      expect(validateCode(secret, '12345a')).toBe(false);
    });

    it('rejects codes with wrong length', () => {
      const { secret } = generateSecret('user@example.com');

      expect(validateCode(secret, '12345')).toBe(false);
      expect(validateCode(secret, '1234567')).toBe(false);
    });

    it('returns false for missing inputs', () => {
      expect(validateCode(null, '123456')).toBe(false);
      expect(validateCode('secret', null)).toBe(false);
      expect(validateCode('', '123456')).toBe(false);
    });
  });

  describe('generateBackupCodes', () => {
    it('creates 10 codes', () => {
      const result = generateBackupCodes();

      expect(result.codes).toHaveLength(10);
      expect(result.hashedCodes).toHaveLength(10);
    });

    it('creates 8 character alphanumeric codes', () => {
      const result = generateBackupCodes();

      for (const code of result.codes) {
        expect(code).toHaveLength(8);
        expect(code).toMatch(/^[A-Z0-9]+$/);
      }
    });

    it('returns hashed versions for storage', () => {
      const result = generateBackupCodes();

      // Hashes should be different from plain codes
      for (let i = 0; i < result.codes.length; i++) {
        expect(result.hashedCodes[i]).not.toBe(result.codes[i]);
        expect(result.hashedCodes[i].length).toBeGreaterThan(result.codes[i].length);
      }
    });

    it('generates unique codes', () => {
      const result = generateBackupCodes();
      const uniqueCodes = new Set(result.codes);

      expect(uniqueCodes.size).toBe(10);
    });

    it('generates unique hashes', () => {
      const result = generateBackupCodes();
      const uniqueHashes = new Set(result.hashedCodes);

      expect(uniqueHashes.size).toBe(10);
    });
  });

  describe('validateBackupCode', () => {
    it('accepts valid backup code', () => {
      const { codes, hashedCodes } = generateBackupCodes();
      const usedCodes = new Set();

      const result = validateBackupCode(codes[0], hashedCodes, usedCodes);

      expect(result.valid).toBe(true);
      expect(result.index).toBe(0);
    });

    it('rejects invalid backup code', () => {
      const { hashedCodes } = generateBackupCodes();
      const usedCodes = new Set();

      const result = validateBackupCode('INVALID1', hashedCodes, usedCodes);

      expect(result.valid).toBe(false);
    });

    it('rejects used backup code', () => {
      const { codes, hashedCodes } = generateBackupCodes();
      const usedCodes = new Set([0]); // Mark first code as used

      const result = validateBackupCode(codes[0], hashedCodes, usedCodes);

      expect(result.valid).toBe(false);
    });

    it('allows unused codes even when others are used', () => {
      const { codes, hashedCodes } = generateBackupCodes();
      const usedCodes = new Set([0, 1, 2]); // Mark first 3 as used

      const result = validateBackupCode(codes[5], hashedCodes, usedCodes);

      expect(result.valid).toBe(true);
      expect(result.index).toBe(5);
    });

    it('is case insensitive for backup codes', () => {
      const { codes, hashedCodes } = generateBackupCodes();
      const usedCodes = new Set();

      const lowerCode = codes[0].toLowerCase();
      const result = validateBackupCode(lowerCode, hashedCodes, usedCodes);

      expect(result.valid).toBe(true);
    });

    it('returns false for empty code', () => {
      const { hashedCodes } = generateBackupCodes();
      const usedCodes = new Set();

      const result = validateBackupCode('', hashedCodes, usedCodes);

      expect(result.valid).toBe(false);
    });

    it('returns false for null inputs', () => {
      expect(validateBackupCode(null, [], new Set()).valid).toBe(false);
      expect(validateBackupCode('CODE1234', null, new Set()).valid).toBe(false);
    });
  });

  describe('isMfaRequired', () => {
    it('returns true when user has MFA enabled', () => {
      const user = { mfaEnabled: true };
      const policy = { required: false };

      expect(isMfaRequired(user, policy)).toBe(true);
    });

    it('returns true when policy requires MFA', () => {
      const user = { mfaEnabled: false };
      const policy = { required: true };

      expect(isMfaRequired(user, policy)).toBe(true);
    });

    it('returns true when policy requires MFA for role', () => {
      const user = { mfaEnabled: false, role: 'admin' };
      const policy = { required: false, requiredRoles: ['admin', 'engineer'] };

      expect(isMfaRequired(user, policy)).toBe(true);
    });

    it('returns false when MFA not required', () => {
      const user = { mfaEnabled: false, role: 'viewer' };
      const policy = { required: false, requiredRoles: ['admin'] };

      expect(isMfaRequired(user, policy)).toBe(false);
    });

    it('returns false with no policy', () => {
      const user = { mfaEnabled: false };

      expect(isMfaRequired(user, null)).toBe(false);
      expect(isMfaRequired(user, undefined)).toBe(false);
    });

    it('handles missing user gracefully', () => {
      const policy = { required: true };

      expect(isMfaRequired(null, policy)).toBe(false);
      expect(isMfaRequired(undefined, policy)).toBe(false);
    });
  });

  describe('enforceMfa', () => {
    it('enables MFA requirement for user', () => {
      const user = { id: '123', mfaEnabled: false };

      const result = enforceMfa(user);

      expect(result.mfaEnabled).toBe(true);
    });

    it('returns updated user object', () => {
      const user = { id: '123', email: 'test@example.com', mfaEnabled: false };

      const result = enforceMfa(user);

      expect(result.id).toBe('123');
      expect(result.email).toBe('test@example.com');
      expect(result.mfaEnabled).toBe(true);
    });

    it('preserves other user properties', () => {
      const user = {
        id: '123',
        email: 'test@example.com',
        mfaEnabled: false,
        role: 'admin',
        name: 'Test User'
      };

      const result = enforceMfa(user);

      expect(result.role).toBe('admin');
      expect(result.name).toBe('Test User');
    });

    it('throws for null user', () => {
      expect(() => enforceMfa(null)).toThrow();
    });
  });

  describe('disableMfa', () => {
    it('removes MFA for user', () => {
      const user = {
        id: '123',
        mfaEnabled: true,
        mfaSecret: 'SECRET123',
        backupCodes: ['code1', 'code2'],
        usedBackupCodes: new Set([0])
      };

      const result = disableMfa(user);

      expect(result.mfaEnabled).toBe(false);
      expect(result.mfaSecret).toBeUndefined();
      expect(result.backupCodes).toBeUndefined();
      expect(result.usedBackupCodes).toBeUndefined();
    });

    it('preserves other user properties', () => {
      const user = {
        id: '123',
        email: 'test@example.com',
        mfaEnabled: true,
        mfaSecret: 'SECRET',
        role: 'admin'
      };

      const result = disableMfa(user);

      expect(result.id).toBe('123');
      expect(result.email).toBe('test@example.com');
      expect(result.role).toBe('admin');
    });

    it('throws for null user', () => {
      expect(() => disableMfa(null)).toThrow();
    });
  });

  describe('createMfaStore', () => {
    let store;

    beforeEach(() => {
      store = createMfaStore();
    });

    it('creates store with methods', () => {
      expect(store.setupMfa).toBeDefined();
      expect(store.verifyMfa).toBeDefined();
      expect(store.verifyBackupCode).toBeDefined();
      expect(store.regenerateBackupCodes).toBeDefined();
      expect(store.getMfaStatus).toBeDefined();
      expect(store.removeMfa).toBeDefined();
    });

    it('sets up MFA for user', async () => {
      const result = await store.setupMfa('user123', 'user@example.com');

      expect(result.secret).toBeDefined();
      expect(result.qrCodeUrl).toBeDefined();
      expect(result.backupCodes).toHaveLength(10);
    });

    it('verifies valid TOTP code', async () => {
      const setup = await store.setupMfa('user123', 'user@example.com');
      const validCode = generateValidTotpCode(setup.secret);

      const result = await store.verifyMfa('user123', validCode);

      expect(result.valid).toBe(true);
    });

    it('rejects invalid TOTP code', async () => {
      await store.setupMfa('user123', 'user@example.com');

      const result = await store.verifyMfa('user123', '000000');

      expect(result.valid).toBe(false);
    });

    it('verifies backup code and marks as used', async () => {
      const setup = await store.setupMfa('user123', 'user@example.com');
      const backupCode = setup.backupCodes[0];

      const result1 = await store.verifyBackupCode('user123', backupCode);
      expect(result1.valid).toBe(true);

      // Same code should now be rejected
      const result2 = await store.verifyBackupCode('user123', backupCode);
      expect(result2.valid).toBe(false);
    });

    it('regenerates backup codes', async () => {
      const setup = await store.setupMfa('user123', 'user@example.com');
      const originalCodes = setup.backupCodes;

      const newCodes = await store.regenerateBackupCodes('user123');

      expect(newCodes).toHaveLength(10);
      expect(newCodes).not.toEqual(originalCodes);
    });

    it('gets MFA status', async () => {
      await store.setupMfa('user123', 'user@example.com');

      const status = await store.getMfaStatus('user123');

      expect(status.enabled).toBe(true);
      expect(status.backupCodesRemaining).toBe(10);
    });

    it('removes MFA from user', async () => {
      await store.setupMfa('user123', 'user@example.com');
      await store.removeMfa('user123');

      const status = await store.getMfaStatus('user123');

      expect(status.enabled).toBe(false);
    });

    it('returns not enabled for user without MFA', async () => {
      const status = await store.getMfaStatus('unknown-user');

      expect(status.enabled).toBe(false);
    });
  });
});

// Helper function to generate valid TOTP codes for testing
function generateValidTotpCode(secret, offset = 0) {
  // Import the internal TOTP generation for testing
  // This simulates what an authenticator app would generate
  const crypto = require('crypto');

  // Decode base32 secret
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of secret.toUpperCase()) {
    const val = base32Chars.indexOf(char);
    if (val >= 0) {
      bits += val.toString(2).padStart(5, '0');
    }
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  const key = Buffer.from(bytes);

  // Calculate counter (30-second time step)
  const timeStep = 30;
  const counter = Math.floor(Date.now() / 1000 / timeStep) + offset;

  // Convert counter to 8-byte big-endian buffer
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  // Generate HMAC-SHA1
  const hmac = crypto.createHmac('sha1', key);
  hmac.update(counterBuffer);
  const hash = hmac.digest();

  // Dynamic truncation
  const offsetByte = hash[hash.length - 1] & 0x0f;
  const code = (
    ((hash[offsetByte] & 0x7f) << 24) |
    ((hash[offsetByte + 1] & 0xff) << 16) |
    ((hash[offsetByte + 2] & 0xff) << 8) |
    (hash[offsetByte + 3] & 0xff)
  ) % 1000000;

  return code.toString().padStart(6, '0');
}
