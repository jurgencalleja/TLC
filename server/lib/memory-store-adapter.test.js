/**
 * @file memory-store-adapter.test.js
 * @description Tests for the file-based memory store adapter.
 *
 * The adapter reads decisions and gotchas from .tlc/memory/team/ markdown
 * files on disk. Returns empty arrays when directories don't exist.
 */
import { describe, it, beforeEach, expect, vi } from 'vitest';

const { createMemoryStoreAdapter } = await import('./memory-store-adapter.js');

describe('memory-store-adapter', () => {
  let mockFs;

  beforeEach(() => {
    mockFs = {
      existsSync: vi.fn().mockReturnValue(false),
      readdirSync: vi.fn().mockReturnValue([]),
      readFileSync: vi.fn().mockReturnValue(''),
    };
  });

  describe('createMemoryStoreAdapter', () => {
    it('returns an object with listDecisions, listGotchas, getStats', () => {
      const adapter = createMemoryStoreAdapter('/fake/project', { fs: mockFs });
      expect(adapter).toHaveProperty('listDecisions');
      expect(adapter).toHaveProperty('listGotchas');
      expect(adapter).toHaveProperty('getStats');
      expect(typeof adapter.listDecisions).toBe('function');
      expect(typeof adapter.listGotchas).toBe('function');
      expect(typeof adapter.getStats).toBe('function');
    });
  });

  describe('listDecisions', () => {
    it('returns empty array when decisions directory does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);
      const adapter = createMemoryStoreAdapter('/fake/project', { fs: mockFs });
      const result = await adapter.listDecisions();
      expect(result).toEqual([]);
    });

    it('reads markdown files from decisions directory', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['001-use-postgres.md', '002-rest-api.md']);
      mockFs.readFileSync
        .mockReturnValueOnce('# Use Postgres\n\nWe chose Postgres for the database.\n\n**Date:** 2026-01-20\n**Status:** accepted')
        .mockReturnValueOnce('# REST over GraphQL\n\nREST is simpler for our use case.\n\n**Date:** 2026-01-22\n**Status:** accepted');

      const adapter = createMemoryStoreAdapter('/fake/project', { fs: mockFs });
      const result = await adapter.listDecisions();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('title', 'Use Postgres');
      expect(result[0]).toHaveProperty('content');
      expect(result[1]).toHaveProperty('title', 'REST over GraphQL');
    });

    it('handles malformed markdown gracefully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['bad.md']);
      mockFs.readFileSync.mockReturnValue('no heading here just text');

      const adapter = createMemoryStoreAdapter('/fake/project', { fs: mockFs });
      const result = await adapter.listDecisions();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('title');
    });

    it('skips non-markdown files', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['decision.md', 'notes.txt', '.DS_Store']);
      mockFs.readFileSync.mockReturnValue('# A Decision\n\nContent here');

      const adapter = createMemoryStoreAdapter('/fake/project', { fs: mockFs });
      const result = await adapter.listDecisions();

      expect(result).toHaveLength(1);
    });
  });

  describe('listGotchas', () => {
    it('returns empty array when gotchas directory does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);
      const adapter = createMemoryStoreAdapter('/fake/project', { fs: mockFs });
      const result = await adapter.listGotchas();
      expect(result).toEqual([]);
    });

    it('reads markdown files from gotchas directory', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['001-cold-starts.md']);
      mockFs.readFileSync.mockReturnValue('# Cold Start Delay\n\nLambda cold starts cause 2s delay.\n\n**Severity:** high');

      const adapter = createMemoryStoreAdapter('/fake/project', { fs: mockFs });
      const result = await adapter.listGotchas();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('title', 'Cold Start Delay');
      expect(result[0]).toHaveProperty('content');
    });

    it('handles read errors gracefully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['broken.md']);
      mockFs.readFileSync.mockImplementation(() => { throw new Error('EACCES'); });

      const adapter = createMemoryStoreAdapter('/fake/project', { fs: mockFs });
      const result = await adapter.listGotchas();

      expect(result).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('returns zero counts when no directories exist', async () => {
      mockFs.existsSync.mockReturnValue(false);
      const adapter = createMemoryStoreAdapter('/fake/project', { fs: mockFs });
      const stats = await adapter.getStats();

      expect(stats).toHaveProperty('decisions', 0);
      expect(stats).toHaveProperty('gotchas', 0);
      expect(stats).toHaveProperty('total', 0);
    });

    it('returns file counts from both directories', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync
        .mockReturnValueOnce(['d1.md', 'd2.md', 'd3.md'])
        .mockReturnValueOnce(['g1.md']);

      const adapter = createMemoryStoreAdapter('/fake/project', { fs: mockFs });
      const stats = await adapter.getStats();

      expect(stats.decisions).toBe(3);
      expect(stats.gotchas).toBe(1);
      expect(stats.total).toBe(4);
    });
  });
});
