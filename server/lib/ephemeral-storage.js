/**
 * Ephemeral Storage - In-memory storage that never touches disk
 *
 * Provides a key-value store that:
 * - Stores data in memory only (no disk persistence)
 * - Auto-expires based on TTL
 * - Provides same API as persistent storage (get, set, delete, clear)
 * - Clears all data on process exit
 * - Supports optional encryption in memory
 */

const crypto = require('crypto');

/**
 * Simple encryption utilities for in-memory data
 */
class MemoryEncryption {
  constructor() {
    // Generate a random key for this session (not persisted)
    this.key = crypto.randomBytes(32);
    this.algorithm = 'aes-256-gcm';
  }

  encrypt(data) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    const serialized = typeof data === 'string' ? data : JSON.stringify(data);
    let encrypted = cipher.update(serialized, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString('hex'),
      data: encrypted,
      tag: authTag.toString('hex'),
      isObject: typeof data !== 'string'
    };
  }

  decrypt(encrypted) {
    const iv = Buffer.from(encrypted.iv, 'hex');
    const authTag = Buffer.from(encrypted.tag, 'hex');

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return encrypted.isObject ? JSON.parse(decrypted) : decrypted;
  }
}

/**
 * Storage entry with optional TTL
 */
class StorageEntry {
  constructor(value, options = {}) {
    this.value = value;
    this.createdAt = Date.now();
    this.expiresAt = options.ttl ? this.createdAt + options.ttl : null;
  }

  isExpired() {
    if (!this.expiresAt) return false;
    return Date.now() > this.expiresAt;
  }
}

/**
 * EphemeralStorage - In-memory key-value store
 */
class EphemeralStorage {
  /**
   * Create an ephemeral storage instance
   * @param {Object} options - Configuration options
   * @param {boolean} options.encrypt - Enable encryption for stored values
   * @param {boolean} options.registerExitHandler - Register cleanup on process exit
   * @param {string} options.basePath - Ignored, for API compatibility only
   */
  constructor(options = {}) {
    this.store = new Map();
    this.encryption = options.encrypt ? new MemoryEncryption() : null;
    this.options = options;

    if (options.registerExitHandler) {
      this._registerExitHandlers();
    }
  }

  /**
   * Store a value in memory
   * @param {string} key - The key to store under
   * @param {*} value - The value to store
   * @param {Object} options - Storage options
   * @param {number} options.ttl - Time to live in milliseconds
   */
  set(key, value, options = {}) {
    const storedValue = this.encryption
      ? this.encryption.encrypt(value)
      : value;

    const entry = new StorageEntry(storedValue, options);
    this.store.set(key, entry);
  }

  /**
   * Retrieve a value from memory
   * @param {string} key - The key to retrieve
   * @returns {*} The stored value, or null if not found/expired
   */
  get(key) {
    const entry = this.store.get(key);

    if (!entry) return null;

    if (entry.isExpired()) {
      this.store.delete(key);
      return null;
    }

    if (this.encryption) {
      return this.encryption.decrypt(entry.value);
    }

    return entry.value;
  }

  /**
   * Get raw stored value (for testing encryption)
   * @param {string} key - The key to retrieve
   * @returns {*} The raw stored value
   */
  getRaw(key) {
    const entry = this.store.get(key);
    if (!entry || entry.isExpired()) return null;
    return entry.value;
  }

  /**
   * Check if a key exists and is not expired
   * @param {string} key - The key to check
   * @returns {boolean} True if key exists and is valid
   */
  has(key) {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (entry.isExpired()) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Delete a specific key
   * @param {string} key - The key to delete
   */
  delete(key) {
    this.store.delete(key);
  }

  /**
   * Clear all stored data
   */
  clear() {
    this.store.clear();
  }

  /**
   * Get all keys
   * @returns {string[]} Array of all keys (excluding expired)
   */
  keys() {
    const validKeys = [];
    for (const [key, entry] of this.store) {
      if (!entry.isExpired()) {
        validKeys.push(key);
      } else {
        this.store.delete(key);
      }
    }
    return validKeys;
  }

  /**
   * Get memory usage statistics
   * @returns {Object} Stats including keyCount, approximateBytes, expiringKeys
   */
  getStats() {
    let approximateBytes = 0;
    let expiringKeys = 0;
    let validKeys = 0;

    for (const [key, entry] of this.store) {
      if (entry.isExpired()) {
        this.store.delete(key);
        continue;
      }

      validKeys++;

      // Approximate size calculation
      approximateBytes += key.length * 2; // UTF-16 string
      const value = entry.value;
      if (typeof value === 'string') {
        approximateBytes += value.length * 2;
      } else if (typeof value === 'object') {
        approximateBytes += JSON.stringify(value).length * 2;
      }

      if (entry.expiresAt) {
        expiringKeys++;
      }
    }

    return {
      keyCount: validKeys,
      approximateBytes,
      expiringKeys
    };
  }

  /**
   * Handle process exit - clear all data
   */
  handleExit() {
    this.clear();
  }

  /**
   * Register exit handlers for process cleanup
   * @private
   */
  _registerExitHandlers() {
    const exitHandler = () => this.handleExit();

    process.on('exit', exitHandler);
    process.on('SIGINT', exitHandler);
    process.on('SIGTERM', exitHandler);
    process.on('uncaughtException', exitHandler);
  }
}

module.exports = {
  EphemeralStorage
};
