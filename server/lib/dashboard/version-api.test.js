/**
 * Version Check API Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCurrentVersion, getLatestVersion, checkForUpdate, createVersionApi, clearVersionCache } from './version-api.js';

// Clear cache before each test to ensure test isolation
beforeEach(() => {
  clearVersionCache();
});

describe('version-api', () => {
  describe('getCurrentVersion', () => {
    it('returns current version from package.json', async () => {
      const mockFs = {
        readFile: vi.fn().mockResolvedValue('{"version": "1.2.3"}')
      };
      const version = await getCurrentVersion({ fs: mockFs, basePath: '/test' });
      expect(version).toBe('1.2.3');
    });

    it('handles missing package.json', async () => {
      const mockFs = {
        readFile: vi.fn().mockRejectedValue(new Error('ENOENT'))
      };
      const version = await getCurrentVersion({ fs: mockFs, basePath: '/test' });
      expect(version).toBe('0.0.0');
    });
  });

  describe('getLatestVersion', () => {
    it('fetches latest version from npm', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ 'dist-tags': { latest: '2.0.0' } })
      });
      const version = await getLatestVersion({ fetch: mockFetch, package: 'tlc' });
      expect(version).toBe('2.0.0');
    });

    it('handles network errors', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      const version = await getLatestVersion({ fetch: mockFetch, package: 'tlc' });
      expect(version).toBeNull();
    });

    it('caches result', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ 'dist-tags': { latest: '2.0.0' } })
      });
      // Use unique cache key for this test
      const testCacheKey = 'cache-test-' + Date.now();
      await getLatestVersion({ fetch: mockFetch, package: 'tlc', cache: true, cacheKey: testCacheKey });
      await getLatestVersion({ fetch: mockFetch, package: 'tlc', cache: true, cacheKey: testCacheKey });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkForUpdate', () => {
    it('detects available update', async () => {
      const result = await checkForUpdate({
        current: '1.0.0',
        getLatest: vi.fn().mockResolvedValue('2.0.0')
      });
      expect(result.updateAvailable).toBe(true);
      expect(result.currentVersion).toBe('1.0.0');
      expect(result.latestVersion).toBe('2.0.0');
    });

    it('reports no update when current', async () => {
      const result = await checkForUpdate({
        current: '2.0.0',
        getLatest: vi.fn().mockResolvedValue('2.0.0')
      });
      expect(result.updateAvailable).toBe(false);
    });

    it('handles pre-release versions', async () => {
      const result = await checkForUpdate({
        current: '2.0.0-beta.1',
        getLatest: vi.fn().mockResolvedValue('1.5.0')
      });
      // Pre-release is considered newer
      expect(result.updateAvailable).toBe(false);
    });

    it('handles fetch failures gracefully', async () => {
      const result = await checkForUpdate({
        current: '1.0.0',
        getLatest: vi.fn().mockResolvedValue(null)
      });
      expect(result.updateAvailable).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('createVersionApi', () => {
    it('creates API handler', () => {
      const api = createVersionApi({ basePath: '/test' });
      expect(api.get).toBeDefined();
      expect(api.check).toBeDefined();
    });

    it('returns version info', async () => {
      const mockFs = {
        readFile: vi.fn().mockResolvedValue('{"version": "1.0.0"}')
      };
      const api = createVersionApi({ basePath: '/test', fs: mockFs });
      const info = await api.get();
      expect(info.version).toBe('1.0.0');
    });
  });
});
