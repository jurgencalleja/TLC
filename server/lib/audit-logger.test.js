import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock dependencies before importing
vi.mock('./audit-storage.js', () => {
  class MockAuditStorage {
    constructor() {
      this.entries = [];
    }
    async appendEntry(entry) {
      this.entries.push(entry);
      return { ...entry, checksum: 'mock-checksum' };
    }
    async getEntries() {
      return this.entries;
    }
    async verifyIntegrity() {
      return { valid: true };
    }
  }
  return {
    AuditStorage: MockAuditStorage,
  };
});

vi.mock('./audit-classifier.js', () => ({
  classifyAction: vi.fn().mockReturnValue('file:read'),
  detectSensitive: vi.fn().mockReturnValue({ isSensitive: false, reason: null }),
  getSeverity: vi.fn().mockReturnValue('info'),
}));

vi.mock('./audit-attribution.js', () => ({
  getAttribution: vi.fn().mockResolvedValue({
    user: { name: 'testuser', email: 'test@example.com' },
    source: 'git',
    timestamp: '2026-01-15T10:00:00.000Z',
  }),
  identifySource: vi.fn().mockReturnValue('agent'),
  createSessionId: vi.fn().mockReturnValue('test-session-123'),
}));

import { AuditLogger, sanitizeParams } from './audit-logger.js';
import { classifyAction, detectSensitive, getSeverity } from './audit-classifier.js';
import { getAttribution, identifySource, createSessionId } from './audit-attribution.js';

describe('AuditLogger', () => {
  let logger;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T10:00:00.000Z'));

    logger = new AuditLogger();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('logAction creates complete audit entry', () => {
    it('creates entry with tool name, params, and result', async () => {
      const entry = await logger.logAction('Read', { file_path: '/test/file.js' }, { content: 'file content' });

      expect(entry).toBeDefined();
      expect(entry.tool).toBe('Read');
      expect(entry.params).toBeDefined();
      expect(entry.result).toEqual({ content: 'file content' });
    });

    it('stores complete context for replay', async () => {
      const params = { file_path: '/test/file.js', offset: 0, limit: 100 };
      const result = { content: 'file content', lines: 100 };

      const entry = await logger.logAction('Read', params, result);

      expect(entry.tool).toBe('Read');
      expect(entry.result).toEqual(result);
      expect(entry.context).toBeDefined();
    });
  });

  describe('logAction includes classification', () => {
    it('includes classification from classifier module', async () => {
      classifyAction.mockReturnValueOnce('file:write');
      getSeverity.mockReturnValueOnce('warning');
      detectSensitive.mockReturnValueOnce({ isSensitive: false, reason: null });

      const entry = await logger.logAction('Write', { file_path: '/test/file.js', content: 'new content' }, { success: true });

      expect(classifyAction).toHaveBeenCalledWith({ tool: 'Write', params: expect.any(Object) });
      expect(entry.classification).toBe('file:write');
      expect(entry.severity).toBe('warning');
    });

    it('includes sensitive flag from classifier', async () => {
      detectSensitive.mockReturnValueOnce({ isSensitive: true, reason: 'Accessing .env file' });

      const entry = await logger.logAction('Read', { file_path: '.env' }, { content: 'secrets' });

      expect(detectSensitive).toHaveBeenCalled();
      expect(entry.sensitive).toEqual({ isSensitive: true, reason: 'Accessing .env file' });
    });
  });

  describe('logAction includes attribution', () => {
    it('includes user attribution from attribution module', async () => {
      getAttribution.mockResolvedValueOnce({
        user: { name: 'alice', email: 'alice@example.com' },
        source: 'git',
        timestamp: '2026-01-15T10:00:00.000Z',
      });

      const entry = await logger.logAction('Read', { file_path: '/test/file.js' }, { content: 'data' });

      expect(getAttribution).toHaveBeenCalled();
      expect(entry.attribution.user.name).toBe('alice');
      expect(entry.attribution.source).toBe('git');
    });

    it('includes source identification', async () => {
      identifySource.mockReturnValueOnce('human');

      const entry = await logger.logAction('Bash', { command: 'ls -la' }, { output: 'files' });

      expect(identifySource).toHaveBeenCalled();
      expect(entry.sourceType).toBe('human');
    });

    it('includes session ID for correlating actions', async () => {
      createSessionId.mockReturnValueOnce('session-abc-123');

      const loggerWithSession = new AuditLogger();
      const entry = await loggerWithSession.logAction('Read', { file_path: '/test/file.js' }, { content: 'data' });

      expect(entry.sessionId).toBeDefined();
    });
  });

  describe('logAction includes timestamp', () => {
    it('adds timestamp in ISO 8601 format', async () => {
      const entry = await logger.logAction('Read', { file_path: '/test/file.js' }, { content: 'data' });

      expect(entry.timestamp).toBe('2026-01-15T10:00:00.000Z');
    });

    it('uses current time for timestamp', async () => {
      vi.setSystemTime(new Date('2026-02-20T15:30:45.123Z'));

      const loggerNew = new AuditLogger();
      const entry = await loggerNew.logAction('Read', { file_path: '/test/file.js' }, { content: 'data' });

      expect(entry.timestamp).toBe('2026-02-20T15:30:45.123Z');
    });
  });

  describe('logAction stores tool parameters (sanitized)', () => {
    it('stores sanitized parameters', async () => {
      const params = {
        file_path: '/test/file.js',
        content: 'API_KEY=sk-secret123\nPASSWORD=mypassword',
      };

      const entry = await logger.logAction('Write', params, { success: true });

      // Params should be sanitized
      expect(entry.params.content).not.toContain('sk-secret123');
      expect(entry.params.content).not.toContain('mypassword');
    });

    it('preserves non-sensitive parameters', async () => {
      const params = {
        file_path: '/test/file.js',
        offset: 10,
        limit: 100,
      };

      const entry = await logger.logAction('Read', params, { content: 'data' });

      expect(entry.params.file_path).toBe('/test/file.js');
      expect(entry.params.offset).toBe(10);
      expect(entry.params.limit).toBe(100);
    });
  });

  describe('logAction handles async batch mode', () => {
    it('batches entries when batch mode is enabled', async () => {
      const batchLogger = new AuditLogger({ batchMode: true, batchSize: 3 });

      await batchLogger.logAction('Read', { file_path: '/file1.js' }, { content: 'a' });
      await batchLogger.logAction('Read', { file_path: '/file2.js' }, { content: 'b' });

      // Should not have written yet (batch size is 3)
      expect(batchLogger.getPendingCount()).toBe(2);
    });

    it('flushes when batch size is reached', async () => {
      const batchLogger = new AuditLogger({ batchMode: true, batchSize: 2 });

      await batchLogger.logAction('Read', { file_path: '/file1.js' }, { content: 'a' });
      await batchLogger.logAction('Read', { file_path: '/file2.js' }, { content: 'b' });

      // Should have flushed after reaching batch size
      expect(batchLogger.getPendingCount()).toBe(0);
    });
  });

  describe('flushBatch writes pending entries', () => {
    it('writes all pending entries to storage', async () => {
      const batchLogger = new AuditLogger({ batchMode: true, batchSize: 10 });

      await batchLogger.logAction('Read', { file_path: '/file1.js' }, { content: 'a' });
      await batchLogger.logAction('Read', { file_path: '/file2.js' }, { content: 'b' });
      await batchLogger.logAction('Read', { file_path: '/file3.js' }, { content: 'c' });

      expect(batchLogger.getPendingCount()).toBe(3);

      await batchLogger.flushBatch();

      expect(batchLogger.getPendingCount()).toBe(0);
    });

    it('handles empty batch gracefully', async () => {
      const batchLogger = new AuditLogger({ batchMode: true, batchSize: 10 });

      // Should not throw
      await expect(batchLogger.flushBatch()).resolves.not.toThrow();
    });
  });
});

describe('sanitizeParams', () => {
  describe('sanitizeParams removes sensitive values', () => {
    it('removes API keys', () => {
      const params = {
        content: 'API_KEY=sk-secret123abcdef',
      };

      const sanitized = sanitizeParams(params);

      expect(sanitized.content).not.toContain('sk-secret123abcdef');
      expect(sanitized.content).toContain('[REDACTED]');
    });

    it('removes passwords', () => {
      const params = {
        content: 'password=supersecret123',
      };

      const sanitized = sanitizeParams(params);

      expect(sanitized.content).not.toContain('supersecret123');
      expect(sanitized.content).toContain('[REDACTED]');
    });

    it('removes tokens', () => {
      const params = {
        content: 'token=ghp_1234567890abcdef',
      };

      const sanitized = sanitizeParams(params);

      expect(sanitized.content).not.toContain('ghp_1234567890abcdef');
      expect(sanitized.content).toContain('[REDACTED]');
    });

    it('removes secrets from command', () => {
      const params = {
        command: 'export SECRET=mysecretvalue && npm run build',
      };

      const sanitized = sanitizeParams(params);

      expect(sanitized.command).not.toContain('mysecretvalue');
      expect(sanitized.command).toContain('[REDACTED]');
    });

    it('removes Bearer tokens', () => {
      const params = {
        content: 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      };

      const sanitized = sanitizeParams(params);

      expect(sanitized.content).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(sanitized.content).toContain('[REDACTED]');
    });
  });

  describe('sanitizeParams preserves structure', () => {
    it('preserves object structure', () => {
      const params = {
        file_path: '/test/file.js',
        offset: 10,
        limit: 100,
        nested: {
          value: 'safe',
          deep: {
            key: 'value',
          },
        },
      };

      const sanitized = sanitizeParams(params);

      expect(sanitized.file_path).toBe('/test/file.js');
      expect(sanitized.offset).toBe(10);
      expect(sanitized.limit).toBe(100);
      expect(sanitized.nested.value).toBe('safe');
      expect(sanitized.nested.deep.key).toBe('value');
    });

    it('preserves arrays', () => {
      const params = {
        files: ['/file1.js', '/file2.js'],
        numbers: [1, 2, 3],
      };

      const sanitized = sanitizeParams(params);

      expect(sanitized.files).toEqual(['/file1.js', '/file2.js']);
      expect(sanitized.numbers).toEqual([1, 2, 3]);
    });

    it('handles null and undefined values', () => {
      const params = {
        nullValue: null,
        undefinedValue: undefined,
        validValue: 'test',
      };

      const sanitized = sanitizeParams(params);

      expect(sanitized.nullValue).toBeNull();
      expect(sanitized.undefinedValue).toBeUndefined();
      expect(sanitized.validValue).toBe('test');
    });

    it('sanitizes sensitive values in nested objects', () => {
      const params = {
        config: {
          api_key: 'sk-secret123',
          endpoint: 'https://api.example.com',
        },
      };

      const sanitized = sanitizeParams(params);

      expect(sanitized.config.api_key).toBe('[REDACTED]');
      expect(sanitized.config.endpoint).toBe('https://api.example.com');
    });

    it('sanitizes sensitive values in arrays', () => {
      const params = {
        items: ['password=secret1', 'normal value', 'token=abc123'],
      };

      const sanitized = sanitizeParams(params);

      expect(sanitized.items[0]).toContain('[REDACTED]');
      expect(sanitized.items[1]).toBe('normal value');
      expect(sanitized.items[2]).toContain('[REDACTED]');
    });
  });
});
