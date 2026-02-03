/**
 * Crypto Utilities Module
 *
 * Secure cryptographic primitives.
 * Addresses OWASP A02: Cryptographic Failures
 */

import crypto from 'crypto';

/**
 * Custom error for deprecated algorithm usage
 */
export class DeprecatedAlgorithmError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DeprecatedAlgorithmError';
  }
}

/**
 * Deprecated algorithms that should not be used for security
 */
const DEPRECATED_ALGORITHMS = ['md5', 'sha1', 'md4', 'ripemd160'];

/**
 * Generate cryptographically secure random bytes
 * @param {number} length - Number of bytes to generate
 * @returns {Buffer} Random bytes
 */
export function randomBytes(length) {
  if (length <= 0) {
    throw new Error('Length must be positive');
  }
  return crypto.randomBytes(length);
}

/**
 * Generate a random string in specified encoding
 * @param {number} bytes - Number of bytes of randomness
 * @param {string} encoding - Output encoding (hex, base64, base64url, alphanumeric)
 * @returns {string} Random string
 */
export function randomString(bytes, encoding = 'hex') {
  const buffer = randomBytes(bytes);

  switch (encoding) {
    case 'hex':
      return buffer.toString('hex');
    case 'base64':
      return buffer.toString('base64');
    case 'base64url':
      return buffer.toString('base64url');
    case 'alphanumeric': {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < bytes; i++) {
        result += chars[buffer[i] % chars.length];
      }
      return result;
    }
    default:
      return buffer.toString('hex');
  }
}

/**
 * Encrypt data using AES-256-GCM
 * @param {string|Buffer} plaintext - Data to encrypt
 * @param {Buffer} key - 32-byte encryption key
 * @param {Object} options - Encryption options
 * @returns {string} Base64-encoded ciphertext with IV and auth tag
 */
export function encrypt(plaintext, key, options = {}) {
  const { aad } = options;

  if (key.length !== 32) {
    throw new Error('Key must be 32 bytes for AES-256');
  }

  // Generate random 12-byte IV
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  if (aad) {
    cipher.setAAD(Buffer.from(aad));
  }

  const plaintextBuffer = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(plaintext);
  const encrypted = Buffer.concat([cipher.update(plaintextBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Format: IV (12 bytes) + ciphertext + authTag (16 bytes)
  const combined = Buffer.concat([iv, encrypted, authTag]);
  return combined.toString('base64');
}

/**
 * Decrypt data encrypted with AES-256-GCM
 * @param {string} ciphertext - Base64-encoded ciphertext
 * @param {Buffer} key - 32-byte decryption key
 * @param {Object} options - Decryption options
 * @returns {string|Buffer} Decrypted data
 */
export function decrypt(ciphertext, key, options = {}) {
  const { aad, encoding = 'utf8' } = options;

  if (key.length !== 32) {
    throw new Error('Key must be 32 bytes for AES-256');
  }

  const combined = Buffer.from(ciphertext, 'base64');

  // Extract IV (first 12 bytes), ciphertext, and authTag (last 16 bytes)
  const iv = combined.subarray(0, 12);
  const authTag = combined.subarray(combined.length - 16);
  const encrypted = combined.subarray(12, combined.length - 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  if (aad) {
    decipher.setAAD(Buffer.from(aad));
  }

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return encoding === 'buffer' ? decrypted : decrypted.toString(encoding);
}

/**
 * Sign data with HMAC
 * @param {string|Buffer} data - Data to sign
 * @param {Buffer} key - Signing key
 * @param {Object} options - HMAC options
 * @returns {string} Hex-encoded signature
 */
export function hmacSign(data, key, options = {}) {
  const { algorithm = 'sha256', purpose = 'security' } = options;

  // Check for deprecated algorithms
  if (DEPRECATED_ALGORITHMS.includes(algorithm.toLowerCase()) && purpose !== 'checksum') {
    throw new DeprecatedAlgorithmError(`Algorithm ${algorithm} is deprecated for security purposes`);
  }

  const hmac = crypto.createHmac(algorithm, key);
  hmac.update(data);
  return hmac.digest('hex');
}

/**
 * Verify HMAC signature
 * @param {string|Buffer} data - Original data
 * @param {string} signature - Signature to verify
 * @param {Buffer} key - Signing key
 * @param {Object} options - HMAC options
 * @returns {boolean} True if signature is valid
 */
export function hmacVerify(data, signature, key, options = {}) {
  const { algorithm = 'sha256' } = options;

  const expected = hmacSign(data, key, { ...options, purpose: 'security' });
  return constantTimeCompare(Buffer.from(expected), Buffer.from(signature));
}

/**
 * Derive a key from password or input key material
 * @param {string|Buffer} input - Password or key material
 * @param {Buffer} salt - Salt for derivation
 * @param {Object} options - Derivation options
 * @returns {Buffer} Derived key
 */
export function deriveKey(input, salt, options = {}) {
  const {
    algorithm = 'pbkdf2',
    keyLength = 32,
    iterations = 100000, // OWASP minimum
    info = '',
  } = options;

  const inputBuffer = Buffer.isBuffer(input) ? input : Buffer.from(input);

  if (algorithm === 'pbkdf2') {
    return crypto.pbkdf2Sync(inputBuffer, salt, iterations, keyLength, 'sha256');
  }

  if (algorithm === 'hkdf') {
    return crypto.hkdfSync('sha256', inputBuffer, salt, Buffer.from(info), keyLength);
  }

  throw new Error(`Unknown algorithm: ${algorithm}`);
}

/**
 * Constant-time buffer comparison
 * @param {Buffer} a - First buffer
 * @param {Buffer} b - Second buffer
 * @returns {boolean} True if buffers are equal
 */
export function constantTimeCompare(a, b) {
  if (!Buffer.isBuffer(a)) a = Buffer.from(a);
  if (!Buffer.isBuffer(b)) b = Buffer.from(b);

  if (a.length !== b.length) {
    // Do dummy comparison to maintain constant time
    crypto.timingSafeEqual(a, a);
    return false;
  }

  return crypto.timingSafeEqual(a, b);
}

/**
 * Generate an asymmetric key pair
 * @param {string} type - Key type (rsa, ec)
 * @param {Object} options - Key generation options
 * @returns {Promise<{publicKey: string, privateKey: string}>} Key pair
 */
export async function generateKeyPair(type, options = {}) {
  return new Promise((resolve, reject) => {
    if (type === 'rsa') {
      const { modulusLength = 2048 } = options;

      if (modulusLength < 2048) {
        reject(new Error('RSA key size must be at least 2048 bits'));
        return;
      }

      crypto.generateKeyPair('rsa', {
        modulusLength,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      }, (err, publicKey, privateKey) => {
        if (err) reject(err);
        else resolve({ publicKey, privateKey });
      });
    } else if (type === 'ec') {
      const { namedCurve = 'P-256' } = options;

      crypto.generateKeyPair('ec', {
        namedCurve,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      }, (err, publicKey, privateKey) => {
        if (err) reject(err);
        else resolve({ publicKey, privateKey });
      });
    } else {
      reject(new Error(`Unknown key type: ${type}`));
    }
  });
}
