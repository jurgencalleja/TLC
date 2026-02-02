import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { EphemeralStorage } from './ephemeral-storage.js';

describe('EphemeralStorage', () => {
  let storage;
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-ephemeral-test-'));
    storage = new EphemeralStorage();
    vi.useFakeTimers();
  });

  afterEach(() => {
    storage.clear();
    vi.useRealTimers();
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('set', () => {
    it('stores value in memory', () => {
      storage.set('key1', 'value1');

      expect(storage.get('key1')).toBe('value1');
    });

    it('stores objects in memory', () => {
      const data = { name: 'test', count: 42 };
      storage.set('obj', data);

      expect(storage.get('obj')).toEqual(data);
    });
  });

  describe('get', () => {
    it('retrieves stored value', () => {
      storage.set('myKey', 'myValue');

      const result = storage.get('myKey');

      expect(result).toBe('myValue');
    });

    it('returns null for missing key', () => {
      const result = storage.get('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('TTL expiration', () => {
    it('set with TTL expires after time', () => {
      storage.set('expiring', 'value', { ttl: 1000 }); // 1 second TTL

      // Before expiry
      expect(storage.get('expiring')).toBe('value');

      // After expiry
      vi.advanceTimersByTime(1001);
      expect(storage.get('expiring')).toBeNull();
    });

    it('TTL does not affect other keys', () => {
      storage.set('short', 'expires', { ttl: 500 });
      storage.set('long', 'stays', { ttl: 5000 });

      vi.advanceTimersByTime(600);

      expect(storage.get('short')).toBeNull();
      expect(storage.get('long')).toBe('stays');
    });
  });

  describe('clear', () => {
    it('removes all data', () => {
      storage.set('a', 1);
      storage.set('b', 2);
      storage.set('c', 3);

      storage.clear();

      expect(storage.get('a')).toBeNull();
      expect(storage.get('b')).toBeNull();
      expect(storage.get('c')).toBeNull();
    });
  });

  describe('delete', () => {
    it('removes specific key', () => {
      storage.set('keep', 'value1');
      storage.set('remove', 'value2');

      storage.delete('remove');

      expect(storage.get('keep')).toBe('value1');
      expect(storage.get('remove')).toBeNull();
    });

    it('does nothing for non-existent key', () => {
      storage.set('exists', 'value');

      // Should not throw
      storage.delete('nonexistent');

      expect(storage.get('exists')).toBe('value');
    });
  });

  describe('data not persisted to disk', () => {
    it('does not write to disk', () => {
      const filePath = path.join(testDir, 'should-not-exist.json');
      const diskStorage = new EphemeralStorage({ basePath: testDir });

      diskStorage.set('key', 'value');
      diskStorage.set('data', { complex: true, nested: { value: 123 } });

      // Verify no files were created
      const files = fs.readdirSync(testDir);
      expect(files.length).toBe(0);
    });
  });

  describe('onExit handler', () => {
    it('clears all data on exit', () => {
      storage.set('session', 'data');
      storage.set('user', { id: 1 });

      // Simulate process exit
      storage.handleExit();

      expect(storage.get('session')).toBeNull();
      expect(storage.get('user')).toBeNull();
    });

    it('registerExitHandler registers cleanup on process exit', () => {
      const processSpy = vi.spyOn(process, 'on');

      const newStorage = new EphemeralStorage({ registerExitHandler: true });

      // Should have registered at least one exit handler
      expect(processSpy).toHaveBeenCalledWith('exit', expect.any(Function));

      processSpy.mockRestore();
      newStorage.clear();
    });
  });

  describe('encrypt option', () => {
    it('encrypts values in memory', () => {
      const encryptedStorage = new EphemeralStorage({ encrypt: true });
      const sensitiveData = 'my-secret-token';

      encryptedStorage.set('secret', sensitiveData);

      // Get should return decrypted value
      expect(encryptedStorage.get('secret')).toBe(sensitiveData);

      // Internal storage should be encrypted (not plain text)
      const rawValue = encryptedStorage.getRaw('secret');
      expect(rawValue).not.toBe(sensitiveData);
      // Encrypted value is stored as an object with iv, data, tag properties
      expect(typeof rawValue).toBe('object');
      expect(rawValue).toHaveProperty('iv');
      expect(rawValue).toHaveProperty('data');
      expect(rawValue).toHaveProperty('tag');

      encryptedStorage.clear();
    });

    it('encrypts object values', () => {
      const encryptedStorage = new EphemeralStorage({ encrypt: true });
      const data = { apiKey: 'secret123', user: 'admin' };

      encryptedStorage.set('config', data);

      expect(encryptedStorage.get('config')).toEqual(data);

      const rawValue = encryptedStorage.getRaw('config');
      expect(rawValue).not.toEqual(data);

      encryptedStorage.clear();
    });
  });

  describe('getStats', () => {
    it('returns memory usage info', () => {
      storage.set('a', 'short');
      storage.set('b', 'a'.repeat(1000));
      storage.set('c', { nested: { deep: 'value' } });

      const stats = storage.getStats();

      expect(stats).toHaveProperty('keyCount', 3);
      expect(stats).toHaveProperty('approximateBytes');
      expect(typeof stats.approximateBytes).toBe('number');
      expect(stats.approximateBytes).toBeGreaterThan(0);
    });

    it('returns zero stats for empty storage', () => {
      const stats = storage.getStats();

      expect(stats.keyCount).toBe(0);
      expect(stats.approximateBytes).toBe(0);
    });

    it('includes expired key tracking', () => {
      storage.set('temp', 'value', { ttl: 100 });

      const statsBefore = storage.getStats();
      expect(statsBefore.expiringKeys).toBe(1);

      vi.advanceTimersByTime(101);

      // Trigger cleanup by accessing
      storage.get('temp');

      const statsAfter = storage.getStats();
      expect(statsAfter.expiringKeys).toBe(0);
    });
  });

  describe('API compatibility', () => {
    it('provides same API as persistent storage (get, set, delete, clear)', () => {
      // All methods should exist
      expect(typeof storage.get).toBe('function');
      expect(typeof storage.set).toBe('function');
      expect(typeof storage.delete).toBe('function');
      expect(typeof storage.clear).toBe('function');
    });

    it('has method returns boolean for key existence', () => {
      storage.set('exists', 'value');

      expect(storage.has('exists')).toBe(true);
      expect(storage.has('missing')).toBe(false);
    });

    it('keys method returns all keys', () => {
      storage.set('a', 1);
      storage.set('b', 2);
      storage.set('c', 3);

      const keys = storage.keys();

      expect(keys).toContain('a');
      expect(keys).toContain('b');
      expect(keys).toContain('c');
      expect(keys.length).toBe(3);
    });
  });
});
