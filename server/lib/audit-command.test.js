import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('audit-command', () => {
  let AuditCommand;
  let parseArgs;
  let auditCommand;
  let mockStorage;
  let mockQuery;
  let mockExporter;

  beforeEach(async () => {
    // Create mocks
    mockStorage = {
      verifyIntegrity: vi.fn().mockResolvedValue({ valid: true, entryCount: 10 }),
    };

    mockQuery = {
      query: vi.fn().mockResolvedValue({
        entries: [
          {
            timestamp: '2026-01-15T10:00:00.000Z',
            tool: 'Read',
            classification: 'file:read',
            severity: 'info',
            user: 'alice',
            sessionId: 'sess-123',
            params: { file_path: '/path/to/file.js' },
            checksum: 'abc123',
          },
          {
            timestamp: '2026-01-15T11:00:00.000Z',
            tool: 'Write',
            classification: 'file:write',
            severity: 'warning',
            user: 'bob',
            sessionId: 'sess-456',
            params: { file_path: '/path/to/output.js' },
            checksum: 'def456',
          },
        ],
        total: 2,
        hasMore: false,
        page: 1,
      }),
    };

    mockExporter = {
      exportJSON: vi.fn().mockResolvedValue('[]'),
      exportCSV: vi.fn().mockResolvedValue('timestamp,tool\n'),
      exportSplunk: vi.fn().mockResolvedValue('{}'),
      exportCEF: vi.fn().mockResolvedValue('CEF:0|...'),
    };

    // Import module
    const module = await import('./audit-command.js');
    AuditCommand = module.AuditCommand;
    parseArgs = module.parseArgs;

    // Create instance with mocks
    auditCommand = new AuditCommand({
      storage: mockStorage,
      query: mockQuery,
      exporter: mockExporter,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('parseArgs', () => {
    it('parses empty args', () => {
      const result = parseArgs([]);
      expect(result).toEqual({
        user: null,
        type: null,
        since: null,
        export: null,
        verify: false,
        limit: 20,
      });
    });

    it('parses --user flag', () => {
      const result = parseArgs(['--user', 'alice']);
      expect(result.user).toBe('alice');
    });

    it('parses --type flag', () => {
      const result = parseArgs(['--type', 'file:read']);
      expect(result.type).toBe('file:read');
    });

    it('parses --since flag', () => {
      const result = parseArgs(['--since', '2026-01-15']);
      expect(result.since).toBe('2026-01-15');
    });

    it('parses --export flag', () => {
      const result = parseArgs(['--export', 'json']);
      expect(result.export).toBe('json');
    });

    it('parses --verify flag', () => {
      const result = parseArgs(['--verify']);
      expect(result.verify).toBe(true);
    });

    it('parses --limit flag', () => {
      const result = parseArgs(['--limit', '50']);
      expect(result.limit).toBe(50);
    });

    it('parses multiple flags together', () => {
      const result = parseArgs(['--user', 'alice', '--type', 'file:read', '--limit', '10']);
      expect(result).toEqual({
        user: 'alice',
        type: 'file:read',
        since: null,
        export: null,
        verify: false,
        limit: 10,
      });
    });

    it('handles --user= syntax', () => {
      const result = parseArgs(['--user=bob']);
      expect(result.user).toBe('bob');
    });
  });

  describe('execute', () => {
    it('shows recent audit entries', async () => {
      const result = await auditCommand.execute([]);

      expect(result.success).toBe(true);
      expect(mockQuery.query).toHaveBeenCalled();
      expect(result.output).toContain('Read');
      expect(result.output).toContain('Write');
    });

    it('shows entry count in output', async () => {
      const result = await auditCommand.execute([]);

      expect(result.success).toBe(true);
      expect(result.output).toContain('2');
    });

    it('with --user filters by user', async () => {
      await auditCommand.execute(['--user', 'alice']);

      expect(mockQuery.query).toHaveBeenCalledWith(
        expect.objectContaining({ user: 'alice' })
      );
    });

    it('with --type filters by action type', async () => {
      await auditCommand.execute(['--type', 'file:read']);

      expect(mockQuery.query).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'file:read' })
      );
    });

    it('with --since filters by date', async () => {
      await auditCommand.execute(['--since', '2026-01-15']);

      expect(mockQuery.query).toHaveBeenCalledWith(
        expect.objectContaining({
          from: expect.any(Date),
        })
      );
    });

    it('with --export json exports JSON', async () => {
      mockExporter.exportJSON.mockResolvedValue('{"entries":[]}');

      const result = await auditCommand.execute(['--export', 'json']);

      expect(result.success).toBe(true);
      expect(mockExporter.exportJSON).toHaveBeenCalled();
      expect(result.output).toContain('{"entries":[]}');
    });

    it('with --export csv exports CSV', async () => {
      mockExporter.exportCSV.mockResolvedValue('timestamp,tool,user\n2026-01-15,Read,alice');

      const result = await auditCommand.execute(['--export', 'csv']);

      expect(result.success).toBe(true);
      expect(mockExporter.exportCSV).toHaveBeenCalled();
      expect(result.output).toContain('timestamp,tool,user');
    });

    it('with --export splunk exports Splunk format', async () => {
      mockExporter.exportSplunk.mockResolvedValue('{"time":1234567890}');

      const result = await auditCommand.execute(['--export', 'splunk']);

      expect(result.success).toBe(true);
      expect(mockExporter.exportSplunk).toHaveBeenCalled();
    });

    it('with --verify validates checksums', async () => {
      mockStorage.verifyIntegrity.mockResolvedValue({ valid: true, entryCount: 10 });

      const result = await auditCommand.execute(['--verify']);

      expect(result.success).toBe(true);
      expect(mockStorage.verifyIntegrity).toHaveBeenCalled();
      expect(result.output).toContain('valid');
      expect(result.output).toContain('10');
    });

    it('with --verify reports tampering', async () => {
      mockStorage.verifyIntegrity.mockResolvedValue({
        valid: false,
        error: 'Entry 5 has invalid checksum',
        entryCount: 5,
      });

      const result = await auditCommand.execute(['--verify']);

      expect(result.success).toBe(false);
      expect(mockStorage.verifyIntegrity).toHaveBeenCalled();
      expect(result.output).toContain('invalid');
      expect(result.output).toContain('Entry 5');
    });

    it('handles --limit to restrict results', async () => {
      await auditCommand.execute(['--limit', '5']);

      expect(mockQuery.query).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 5 })
      );
    });

    it('handles empty results gracefully', async () => {
      mockQuery.query.mockResolvedValue({
        entries: [],
        total: 0,
        hasMore: false,
        page: 1,
      });

      const result = await auditCommand.execute([]);

      expect(result.success).toBe(true);
      expect(result.output).toContain('No audit entries');
    });

    it('returns error for invalid export format', async () => {
      const result = await auditCommand.execute(['--export', 'invalid']);

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid');
    });

    it('handles query errors gracefully', async () => {
      mockQuery.query.mockRejectedValue(new Error('Query failed'));

      const result = await auditCommand.execute([]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Query failed');
    });
  });

  describe('formatEntry', () => {
    it('formats an entry for display', () => {
      const entry = {
        timestamp: '2026-01-15T10:00:00.000Z',
        tool: 'Read',
        classification: 'file:read',
        severity: 'info',
        user: 'alice',
        sessionId: 'sess-123',
      };

      const formatted = auditCommand.formatEntry(entry);

      expect(formatted).toContain('2026-01-15');
      expect(formatted).toContain('Read');
      expect(formatted).toContain('alice');
    });

    it('handles missing user gracefully', () => {
      const entry = {
        timestamp: '2026-01-15T10:00:00.000Z',
        tool: 'Read',
        classification: 'file:read',
        severity: 'info',
      };

      const formatted = auditCommand.formatEntry(entry);

      expect(formatted).toContain('Read');
      // Should not throw
    });
  });

  describe('formatVerifyResult', () => {
    it('formats valid result', () => {
      const result = { valid: true, entryCount: 10 };

      const formatted = auditCommand.formatVerifyResult(result);

      expect(formatted).toContain('valid');
      expect(formatted).toContain('10');
    });

    it('formats invalid result with error', () => {
      const result = {
        valid: false,
        error: 'Chain broken at entry 5',
        entryCount: 5,
      };

      const formatted = auditCommand.formatVerifyResult(result);

      expect(formatted.toLowerCase()).toContain('invalid');
      expect(formatted).toContain('Chain broken');
    });
  });
});
