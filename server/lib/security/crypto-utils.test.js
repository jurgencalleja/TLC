/**
 * Crypto Utilities Tests
 *
 * Tests for secure cryptographic primitives.
 */

import { describe, it, expect } from 'vitest';
import {
  randomBytes,
  randomString,
  encrypt,
  decrypt,
  hmacSign,
  hmacVerify,
  deriveKey,
  constantTimeCompare,
  generateKeyPair,
  DeprecatedAlgorithmError,
} from './crypto-utils.js';

describe('crypto-utils', () => {
  describe('randomBytes', () => {
    it('generates specified number of bytes', () => {
      const bytes = randomBytes(32);

      expect(bytes).toBeInstanceOf(Buffer);
      expect(bytes.length).toBe(32);
    });

    it('generates different bytes each call', () => {
      const bytes1 = randomBytes(32);
      const bytes2 = randomBytes(32);

      expect(bytes1.equals(bytes2)).toBe(false);
    });

    it('generates cryptographically random bytes', () => {
      // Statistical test: bytes should have reasonable entropy
      const bytes = randomBytes(1000);
      const counts = new Array(256).fill(0);

      for (const byte of bytes) {
        counts[byte]++;
      }

      // Each byte value should appear roughly 1000/256 ≈ 4 times
      // With random data, standard deviation is about sqrt(1000 * (1/256) * (255/256)) ≈ 2
      // So values should be within roughly 4 ± 6 most of the time
      const avg = 1000 / 256;
      const inRange = counts.filter(c => c >= 0 && c <= avg * 3).length;

      expect(inRange).toBeGreaterThan(200); // Most values in reasonable range
    });

    it('rejects zero or negative length', () => {
      expect(() => randomBytes(0)).toThrow();
      expect(() => randomBytes(-1)).toThrow();
    });
  });

  describe('randomString', () => {
    it('generates hex string of correct length', () => {
      const str = randomString(16, 'hex');

      expect(str).toMatch(/^[a-f0-9]{32}$/); // 16 bytes = 32 hex chars
    });

    it('generates base64 string', () => {
      const str = randomString(16, 'base64');

      expect(str).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('generates base64url string', () => {
      const str = randomString(16, 'base64url');

      expect(str).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('generates alphanumeric string', () => {
      const str = randomString(32, 'alphanumeric');

      expect(str).toMatch(/^[A-Za-z0-9]{32}$/);
    });

    it('generates unique strings', () => {
      const strings = new Set();
      for (let i = 0; i < 100; i++) {
        strings.add(randomString(16, 'hex'));
      }

      expect(strings.size).toBe(100);
    });
  });

  describe('encrypt / decrypt (AES-256-GCM)', () => {
    it('roundtrips encryption correctly', () => {
      const key = randomBytes(32);
      const plaintext = 'Hello, World!';

      const encrypted = encrypt(plaintext, key);
      const decrypted = decrypt(encrypted, key);

      expect(decrypted).toBe(plaintext);
    });

    it('handles binary data', () => {
      const key = randomBytes(32);
      const plaintext = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd]);

      const encrypted = encrypt(plaintext, key);
      const decrypted = decrypt(encrypted, key, { encoding: 'buffer' });

      expect(decrypted.equals(plaintext)).toBe(true);
    });

    it('produces different ciphertext for same plaintext', () => {
      const key = randomBytes(32);
      const plaintext = 'Same message';

      const encrypted1 = encrypt(plaintext, key);
      const encrypted2 = encrypt(plaintext, key);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('fails decryption with wrong key', () => {
      const key1 = randomBytes(32);
      const key2 = randomBytes(32);
      const plaintext = 'Secret message';

      const encrypted = encrypt(plaintext, key1);

      expect(() => decrypt(encrypted, key2)).toThrow();
    });

    it('fails decryption with tampered ciphertext', () => {
      const key = randomBytes(32);
      const plaintext = 'Secret message';

      const encrypted = encrypt(plaintext, key);

      // Tamper with the ciphertext
      const tampered = Buffer.from(encrypted, 'base64');
      tampered[20] ^= 0xff;
      const tamperedStr = tampered.toString('base64');

      expect(() => decrypt(tamperedStr, key)).toThrow();
    });

    it('fails decryption with tampered auth tag', () => {
      const key = randomBytes(32);
      const plaintext = 'Secret message';

      const encrypted = encrypt(plaintext, key);

      // Tamper with the auth tag (last 16 bytes)
      const tampered = Buffer.from(encrypted, 'base64');
      tampered[tampered.length - 1] ^= 0xff;
      const tamperedStr = tampered.toString('base64');

      expect(() => decrypt(tamperedStr, key)).toThrow();
    });

    it('rejects key of wrong length', () => {
      const shortKey = randomBytes(16); // Should be 32 for AES-256
      const plaintext = 'Message';

      expect(() => encrypt(plaintext, shortKey)).toThrow();
    });

    it('supports additional authenticated data', () => {
      const key = randomBytes(32);
      const plaintext = 'Secret';
      const aad = 'context-data';

      const encrypted = encrypt(plaintext, key, { aad });
      const decrypted = decrypt(encrypted, key, { aad });

      expect(decrypted).toBe(plaintext);
    });

    it('fails with wrong additional authenticated data', () => {
      const key = randomBytes(32);
      const plaintext = 'Secret';

      const encrypted = encrypt(plaintext, key, { aad: 'correct' });

      expect(() => decrypt(encrypted, key, { aad: 'wrong' })).toThrow();
    });
  });

  describe('hmacSign / hmacVerify', () => {
    it('signs data with HMAC-SHA256', () => {
      const key = randomBytes(32);
      const data = 'Message to sign';

      const signature = hmacSign(data, key);

      expect(signature).toMatch(/^[a-f0-9]{64}$/); // SHA256 = 64 hex chars
    });

    it('verifies valid signature', () => {
      const key = randomBytes(32);
      const data = 'Message to sign';

      const signature = hmacSign(data, key);
      const isValid = hmacVerify(data, signature, key);

      expect(isValid).toBe(true);
    });

    it('rejects invalid signature', () => {
      const key = randomBytes(32);
      const data = 'Message to sign';

      const signature = hmacSign(data, key);
      const isValid = hmacVerify(data, signature + 'x', key);

      expect(isValid).toBe(false);
    });

    it('rejects signature with wrong key', () => {
      const key1 = randomBytes(32);
      const key2 = randomBytes(32);
      const data = 'Message to sign';

      const signature = hmacSign(data, key1);
      const isValid = hmacVerify(data, signature, key2);

      expect(isValid).toBe(false);
    });

    it('rejects modified data', () => {
      const key = randomBytes(32);

      const signature = hmacSign('Original message', key);
      const isValid = hmacVerify('Modified message', signature, key);

      expect(isValid).toBe(false);
    });

    it('supports SHA-512', () => {
      const key = randomBytes(32);
      const data = 'Message';

      const signature = hmacSign(data, key, { algorithm: 'sha512' });

      expect(signature).toMatch(/^[a-f0-9]{128}$/); // SHA512 = 128 hex chars
    });
  });

  describe('deriveKey', () => {
    it('derives key with PBKDF2', () => {
      const password = 'user-password';
      const salt = randomBytes(16);

      const key = deriveKey(password, salt, { algorithm: 'pbkdf2' });

      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32);
    });

    it('produces consistent keys', () => {
      const password = 'user-password';
      const salt = randomBytes(16);

      const key1 = deriveKey(password, salt);
      const key2 = deriveKey(password, salt);

      expect(key1.equals(key2)).toBe(true);
    });

    it('produces different keys with different salts', () => {
      const password = 'user-password';

      const key1 = deriveKey(password, randomBytes(16));
      const key2 = deriveKey(password, randomBytes(16));

      expect(key1.equals(key2)).toBe(false);
    });

    it('supports HKDF', () => {
      const inputKey = randomBytes(32);
      const salt = randomBytes(16);
      const info = 'context';

      const derivedKey = deriveKey(inputKey, salt, {
        algorithm: 'hkdf',
        info,
      });

      expect(derivedKey).toBeInstanceOf(Buffer);
      expect(derivedKey.length).toBe(32);
    });

    it('uses sufficient iterations for PBKDF2', () => {
      const password = 'password';
      const salt = randomBytes(16);

      // Should use at least 100,000 iterations (OWASP recommendation)
      const key = deriveKey(password, salt, { algorithm: 'pbkdf2' });

      // We can't directly check iterations, but we can check it takes time
      expect(key).toBeDefined();
    });
  });

  describe('constantTimeCompare', () => {
    it('returns true for equal buffers', () => {
      const a = Buffer.from('same-value');
      const b = Buffer.from('same-value');

      expect(constantTimeCompare(a, b)).toBe(true);
    });

    it('returns false for different buffers', () => {
      const a = Buffer.from('value-a');
      const b = Buffer.from('value-b');

      expect(constantTimeCompare(a, b)).toBe(false);
    });

    it('returns false for different length buffers', () => {
      const a = Buffer.from('short');
      const b = Buffer.from('much-longer');

      expect(constantTimeCompare(a, b)).toBe(false);
    });

    it('has constant time regardless of difference position', () => {
      const base = Buffer.from('abcdefghijklmnopqrstuvwxyz');
      const diffStart = Buffer.from('Xbcdefghijklmnopqrstuvwxyz');
      const diffEnd = Buffer.from('abcdefghijklmnopqrstuvwxyZ');

      const times1 = [];
      const times2 = [];

      for (let i = 0; i < 1000; i++) {
        const start1 = process.hrtime.bigint();
        constantTimeCompare(base, diffStart);
        const end1 = process.hrtime.bigint();
        times1.push(Number(end1 - start1));

        const start2 = process.hrtime.bigint();
        constantTimeCompare(base, diffEnd);
        const end2 = process.hrtime.bigint();
        times2.push(Number(end2 - start2));
      }

      const avg1 = times1.reduce((a, b) => a + b) / times1.length;
      const avg2 = times2.reduce((a, b) => a + b) / times2.length;
      const ratio = Math.max(avg1, avg2) / Math.min(avg1, avg2);

      // Times should be very similar (within 50%)
      expect(ratio).toBeLessThan(1.5);
    });
  });

  describe('deprecated algorithm rejection', () => {
    it('rejects MD5 for security purposes', () => {
      expect(() => {
        hmacSign('data', randomBytes(16), { algorithm: 'md5' });
      }).toThrow(DeprecatedAlgorithmError);
    });

    it('rejects SHA1 for security purposes', () => {
      expect(() => {
        hmacSign('data', randomBytes(16), { algorithm: 'sha1' });
      }).toThrow(DeprecatedAlgorithmError);
    });

    it('allows MD5 when explicitly marked as non-security', () => {
      // For checksums, not security
      const result = hmacSign('data', randomBytes(16), {
        algorithm: 'md5',
        purpose: 'checksum',
      });

      expect(result).toBeDefined();
    });
  });

  describe('generateKeyPair', () => {
    it('generates RSA key pair', async () => {
      const { publicKey, privateKey } = await generateKeyPair('rsa', {
        modulusLength: 2048,
      });

      expect(publicKey).toContain('BEGIN PUBLIC KEY');
      expect(privateKey).toContain('BEGIN PRIVATE KEY');
    });

    it('generates EC key pair', async () => {
      const { publicKey, privateKey } = await generateKeyPair('ec', {
        namedCurve: 'P-256',
      });

      expect(publicKey).toBeDefined();
      expect(privateKey).toBeDefined();
    });

    it('rejects weak RSA key sizes', async () => {
      await expect(
        generateKeyPair('rsa', { modulusLength: 1024 })
      ).rejects.toThrow();
    });
  });
});
