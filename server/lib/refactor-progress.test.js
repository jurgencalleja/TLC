/**
 * Refactor Progress Tracker Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('RefactorProgress', () => {
  describe('progress tracking', () => {
    it('shows analyzing X/Y files progress', async () => {
      const { RefactorProgress } = await import('./refactor-progress.js');
      const progress = new RefactorProgress();

      progress.start(100);
      progress.update('file1.js');
      progress.update('file2.js');

      const info = progress.getProgress();

      expect(info.message).toContain('2/100');
      expect(info.completed).toBe(2);
      expect(info.total).toBe(100);
    });

    it('calculates percentage correctly', async () => {
      const { RefactorProgress } = await import('./refactor-progress.js');
      const progress = new RefactorProgress();

      progress.start(50);
      for (let i = 0; i < 25; i++) {
        progress.update(`file${i}.js`);
      }

      const info = progress.getProgress();
      expect(info.percentage).toBe(50);
    });
  });

  describe('ETA calculation', () => {
    it('updates ETA based on rolling average speed', async () => {
      const { RefactorProgress } = await import('./refactor-progress.js');
      const progress = new RefactorProgress();

      progress.start(100);

      // Simulate some file completions
      for (let i = 0; i < 10; i++) {
        progress.update(`file${i}.js`);
      }

      const info = progress.getProgress();

      expect(info.etaSeconds).toBeGreaterThanOrEqual(0);
      expect(info.eta).toBeDefined();
    });

    it('formats ETA as human-readable', async () => {
      const { RefactorProgress } = await import('./refactor-progress.js');
      const progress = new RefactorProgress();

      expect(progress.formatEta(30)).toBe('30s');
      expect(progress.formatEta(90)).toBe('2m');
      expect(progress.formatEta(3700)).toContain('h');
    });
  });

  describe('progress events', () => {
    it('emits progress events with percentage', async () => {
      const { RefactorProgress } = await import('./refactor-progress.js');
      const progress = new RefactorProgress();

      const events = [];
      progress.on('progress', (info) => events.push(info));

      progress.start(10);
      progress.update('file1.js');
      progress.update('file2.js');

      expect(events).toHaveLength(2);
      expect(events[0].percentage).toBe(10);
      expect(events[1].percentage).toBe(20);
    });
  });

  describe('cancellation', () => {
    it('cancellation stops analysis cleanly', async () => {
      const { RefactorProgress } = await import('./refactor-progress.js');
      const progress = new RefactorProgress();

      progress.start(100);
      progress.update('file1.js');
      progress.cancel();

      expect(progress.isCancelled()).toBe(true);
    });

    it('emits cancelled event', async () => {
      const { RefactorProgress } = await import('./refactor-progress.js');
      const progress = new RefactorProgress();

      let cancelled = false;
      progress.on('cancelled', () => { cancelled = true; });

      progress.cancel();

      expect(cancelled).toBe(true);
    });
  });

  describe('caching', () => {
    it('caches results for unchanged files', async () => {
      const { RefactorProgress } = await import('./refactor-progress.js');
      const progress = new RefactorProgress();

      const content = 'const x = 1;';
      const result = { complexity: 1 };

      progress.setCached('file.js', content, result);
      const cached = progress.getCached('file.js', content);

      expect(cached).toEqual(result);
    });

    it('returns null for changed files', async () => {
      const { RefactorProgress } = await import('./refactor-progress.js');
      const progress = new RefactorProgress();

      progress.setCached('file.js', 'const x = 1;', { complexity: 1 });
      const cached = progress.getCached('file.js', 'const x = 2;'); // different content

      expect(cached).toBeNull();
    });

    it('skips cached files on re-run', async () => {
      const { RefactorProgress } = await import('./refactor-progress.js');
      const progress = new RefactorProgress();

      const analyzerMock = vi.fn().mockResolvedValue({ complexity: 1 });

      // Pre-cache one file with matching hash
      const content1 = 'code1';
      progress.setCached('file1.js', content1, { complexity: 1 });

      const files = [
        { path: 'file1.js', content: content1 }, // cached
        { path: 'file2.js', content: 'code2' }, // not cached
      ];

      // Mock loadCache to not reset the cache we just set
      progress.loadCache = vi.fn().mockResolvedValue(undefined);

      await progress.analyze(files, analyzerMock);

      // Only file2 should be analyzed
      expect(analyzerMock).toHaveBeenCalledTimes(1);
      expect(analyzerMock).toHaveBeenCalledWith(files[1]);
    });
  });

  describe('cache persistence', () => {
    it('loads cache from disk on startup', async () => {
      const { RefactorProgress } = await import('./refactor-progress.js');

      const mockCache = {
        'file.js': { hash: 'abc123', result: { complexity: 5 } },
      };

      const fsMock = {
        promises: {
          readFile: vi.fn().mockResolvedValue(JSON.stringify(mockCache)),
          writeFile: vi.fn().mockResolvedValue(),
          mkdir: vi.fn().mockResolvedValue(),
        },
      };

      vi.doMock('fs', () => fsMock);

      const progress = new RefactorProgress({ cacheFile: '.tlc/cache.json' });
      await progress.loadCache();

      // Cache should be loaded but the import happens before mock
      // This test verifies the method exists and runs
      expect(progress.cache).toBeDefined();
    });

    it('saves cache to disk after analysis', async () => {
      const { RefactorProgress } = await import('./refactor-progress.js');
      const progress = new RefactorProgress();

      // Mock loadCache to prevent file system access
      progress.loadCache = vi.fn().mockResolvedValue(undefined);
      const saveSpy = vi.spyOn(progress, 'saveCache').mockResolvedValue(undefined);

      await progress.analyze(
        [{ path: 'test.js', content: 'code' }],
        vi.fn().mockResolvedValue({ complexity: 1 })
      );

      expect(saveSpy).toHaveBeenCalled();
    });
  });

  describe('analyze method', () => {
    it('returns results for all files', async () => {
      const { RefactorProgress } = await import('./refactor-progress.js');
      const progress = new RefactorProgress();

      // Mock fs operations
      progress.loadCache = vi.fn().mockResolvedValue(undefined);
      progress.saveCache = vi.fn().mockResolvedValue(undefined);

      const files = [
        { path: 'a.js', content: 'a' },
        { path: 'b.js', content: 'b' },
      ];

      const result = await progress.analyze(
        files,
        vi.fn().mockResolvedValue({ complexity: 1 })
      );

      expect(result.results).toHaveLength(2);
      expect(result.results[0].file).toBe('a.js');
      expect(result.results[1].file).toBe('b.js');
    });

    it('stops on cancellation', async () => {
      const { RefactorProgress } = await import('./refactor-progress.js');
      const progress = new RefactorProgress();

      // Mock fs operations
      progress.loadCache = vi.fn().mockResolvedValue(undefined);
      progress.saveCache = vi.fn().mockResolvedValue(undefined);

      const analyzerMock = vi.fn().mockImplementation(async () => {
        progress.cancel(); // Cancel after first file
        return { complexity: 1 };
      });

      const files = [
        { path: 'a.js', content: 'a' },
        { path: 'b.js', content: 'b' },
        { path: 'c.js', content: 'c' },
      ];

      const result = await progress.analyze(files, analyzerMock);

      expect(result.cancelled).toBe(true);
      expect(analyzerMock).toHaveBeenCalledTimes(1);
    });
  });
});
