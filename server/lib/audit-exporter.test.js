import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { AuditExporter } from './audit-exporter.js';

// Mock the AuditQuery class (dependency being built in parallel)
const mockQuery = vi.fn().mockResolvedValue([]);
vi.mock('./audit-query.js', () => ({
  AuditQuery: class MockAuditQuery {
    constructor() {
      this.query = mockQuery;
    }
  },
}));

describe('AuditExporter', () => {
  let testDir;
  let exporter;

  const sampleEntries = [
    {
      timestamp: '2026-01-15T10:00:00.000Z',
      tool: 'Read',
      params: { file_path: '/test/file1.js' },
      classification: 'file:read',
      severity: 'info',
      attribution: { user: 'alice', source: 'claude' },
      sessionId: 'session-123',
      checksum: 'abc123',
    },
    {
      timestamp: '2026-01-15T10:05:00.000Z',
      tool: 'Write',
      params: { file_path: '/test/file2.js', content: 'test content' },
      classification: 'file:write',
      severity: 'warning',
      attribution: { user: 'bob', source: 'human' },
      sessionId: 'session-456',
      checksum: 'def456',
    },
    {
      timestamp: '2026-01-15T10:10:00.000Z',
      tool: 'Bash',
      params: { command: 'rm -rf /tmp/test' },
      classification: 'shell:execute',
      severity: 'critical',
      attribution: { user: 'charlie', source: 'claude' },
      sessionId: 'session-789',
      checksum: 'ghi789',
    },
  ];

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-export-test-'));
    exporter = new AuditExporter(testDir);
    mockQuery.mockResolvedValue([...sampleEntries]);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  describe('exportJSON returns valid JSON array', () => {
    it('returns a valid JSON array of entries', async () => {
      const result = await exporter.exportJSON();

      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(3);
      expect(parsed[0].tool).toBe('Read');
      expect(parsed[1].tool).toBe('Write');
      expect(parsed[2].tool).toBe('Bash');
    });

    it('includes all entry fields in JSON output', async () => {
      const result = await exporter.exportJSON();
      const parsed = JSON.parse(result);

      expect(parsed[0]).toHaveProperty('timestamp');
      expect(parsed[0]).toHaveProperty('tool');
      expect(parsed[0]).toHaveProperty('params');
      expect(parsed[0]).toHaveProperty('classification');
      expect(parsed[0]).toHaveProperty('severity');
      expect(parsed[0]).toHaveProperty('attribution');
    });

    it('returns empty array when no entries', async () => {
      mockQuery.mockResolvedValue([]);

      const result = await exporter.exportJSON();
      const parsed = JSON.parse(result);

      expect(parsed).toEqual([]);
    });
  });

  describe('exportCSV returns valid CSV with headers', () => {
    it('returns CSV with header row', async () => {
      const result = await exporter.exportCSV();
      const lines = result.trim().split('\n');

      expect(lines[0]).toContain('timestamp');
      expect(lines[0]).toContain('tool');
      expect(lines[0]).toContain('classification');
      expect(lines[0]).toContain('severity');
    });

    it('returns CSV with data rows', async () => {
      const result = await exporter.exportCSV();
      const lines = result.trim().split('\n');

      // Header + 3 data rows
      expect(lines.length).toBe(4);
      expect(lines[1]).toContain('Read');
      expect(lines[2]).toContain('Write');
      expect(lines[3]).toContain('Bash');
    });

    it('properly escapes CSV fields with commas', async () => {
      mockQuery.mockResolvedValue([
        {
          timestamp: '2026-01-15T10:00:00.000Z',
          tool: 'Write',
          params: { file_path: '/test/file.js', content: 'hello, world' },
          classification: 'file:write',
          severity: 'warning',
          attribution: { user: 'alice', source: 'claude' },
          sessionId: 'session-123',
          checksum: 'abc123',
        },
      ]);

      const result = await exporter.exportCSV();
      // Fields with commas should be quoted
      expect(result).toMatch(/"[^"]*,[^"]*"/);
    });

    it('returns only header when no entries', async () => {
      mockQuery.mockResolvedValue([]);

      const result = await exporter.exportCSV();
      const lines = result.trim().split('\n');

      expect(lines.length).toBe(1);
      expect(lines[0]).toContain('timestamp');
    });
  });

  describe('exportSplunk returns HEC-compatible events', () => {
    it('returns newline-delimited JSON events', async () => {
      const result = await exporter.exportSplunk();
      const lines = result.trim().split('\n');

      expect(lines.length).toBe(3);
      lines.forEach((line) => {
        const event = JSON.parse(line);
        expect(event).toBeDefined();
      });
    });

    it('includes required HEC fields', async () => {
      const result = await exporter.exportSplunk();
      const lines = result.trim().split('\n');
      const event = JSON.parse(lines[0]);

      expect(event).toHaveProperty('time');
      expect(event).toHaveProperty('event');
      expect(event).toHaveProperty('source', 'tlc');
      expect(event).toHaveProperty('sourcetype', 'tlc:audit');
    });

    it('converts timestamp to epoch seconds', async () => {
      const result = await exporter.exportSplunk();
      const lines = result.trim().split('\n');
      const event = JSON.parse(lines[0]);

      // 2026-01-15T10:00:00.000Z in epoch seconds
      const expectedEpoch = new Date('2026-01-15T10:00:00.000Z').getTime() / 1000;
      expect(event.time).toBe(expectedEpoch);
    });

    it('embeds original entry in event field', async () => {
      const result = await exporter.exportSplunk();
      const lines = result.trim().split('\n');
      const event = JSON.parse(lines[0]);

      expect(event.event.tool).toBe('Read');
      expect(event.event.classification).toBe('file:read');
    });
  });

  describe('exportCEF returns CEF-formatted lines', () => {
    it('returns CEF formatted lines', async () => {
      const result = await exporter.exportCEF();
      const lines = result.trim().split('\n');

      expect(lines.length).toBe(3);
      lines.forEach((line) => {
        expect(line.startsWith('CEF:')).toBe(true);
      });
    });

    it('follows CEF spec format', async () => {
      const result = await exporter.exportCEF();
      const lines = result.trim().split('\n');

      // CEF:Version|Device Vendor|Device Product|Device Version|Signature ID|Name|Severity|Extension
      const parts = lines[0].split('|');
      expect(parts.length).toBe(8);
      expect(parts[0]).toMatch(/^CEF:\d+$/);
      expect(parts[1]).toBe('TLC'); // Device Vendor
      expect(parts[2]).toBe('AuditLogger'); // Device Product
    });

    it('maps severity correctly', async () => {
      const result = await exporter.exportCEF();
      const lines = result.trim().split('\n');

      // CEF severity is 0-10 scale
      // info -> 1-3, warning -> 4-6, critical -> 7-10
      const parts0 = lines[0].split('|'); // severity: info
      const parts1 = lines[1].split('|'); // severity: warning
      const parts2 = lines[2].split('|'); // severity: critical

      expect(parseInt(parts0[6])).toBeLessThanOrEqual(3); // info
      expect(parseInt(parts1[6])).toBeGreaterThanOrEqual(4); // warning
      expect(parseInt(parts1[6])).toBeLessThanOrEqual(6);
      expect(parseInt(parts2[6])).toBeGreaterThanOrEqual(7); // critical
    });

    it('includes extension fields', async () => {
      const result = await exporter.exportCEF();
      const lines = result.trim().split('\n');

      // Extension is the last part
      const extension = lines[0].split('|')[7];
      expect(extension).toContain('rt='); // receipt time
      expect(extension).toContain('src='); // source or suser
    });
  });

  describe('export filters by date range', () => {
    it('passes date range to query', async () => {
      const from = new Date('2026-01-15T00:00:00Z');
      const to = new Date('2026-01-15T23:59:59Z');

      await exporter.exportJSON({ from, to });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          from,
          to,
        })
      );
    });

    it('filters entries by from date', async () => {
      mockQuery.mockImplementation(async ({ from }) => {
        return sampleEntries.filter((e) =>
          !from || new Date(e.timestamp) >= from
        );
      });

      const from = new Date('2026-01-15T10:05:00Z');
      const result = await exporter.exportJSON({ from });
      const parsed = JSON.parse(result);

      expect(parsed.length).toBe(2);
      expect(parsed[0].tool).toBe('Write');
    });

    it('filters entries by to date', async () => {
      mockQuery.mockImplementation(async ({ to }) => {
        return sampleEntries.filter((e) =>
          !to || new Date(e.timestamp) <= to
        );
      });

      const to = new Date('2026-01-15T10:05:00Z');
      const result = await exporter.exportJSON({ to });
      const parsed = JSON.parse(result);

      expect(parsed.length).toBe(2);
      expect(parsed[1].tool).toBe('Write');
    });
  });

  describe('export supports incremental mode', () => {
    it('uses lastExportPosition for incremental export', async () => {
      // First export
      await exporter.exportJSON({ incremental: true });

      // Should have saved last position
      expect(exporter.getLastExportPosition()).toBeDefined();
    });

    it('incremental export only returns new entries', async () => {
      // Set up mock to track calls
      const allEntries = [...sampleEntries];

      mockQuery.mockImplementation(async ({ afterChecksum }) => {
        if (afterChecksum) {
          const idx = allEntries.findIndex((e) => e.checksum === afterChecksum);
          return allEntries.slice(idx + 1);
        }
        return allEntries;
      });

      // First incremental export gets all
      const result1 = await exporter.exportJSON({ incremental: true });
      const parsed1 = JSON.parse(result1);
      expect(parsed1.length).toBe(3);

      // Second incremental export gets none (no new entries)
      const result2 = await exporter.exportJSON({ incremental: true });
      const parsed2 = JSON.parse(result2);
      expect(parsed2.length).toBe(0);
    });
  });

  describe('exportIncremental tracks last export position', () => {
    it('saves last checksum after export', async () => {
      await exporter.exportJSON({ incremental: true });

      const position = exporter.getLastExportPosition();
      expect(position).toBe('ghi789'); // Last entry's checksum
    });

    it('loads saved position on new exporter instance', async () => {
      await exporter.exportJSON({ incremental: true });

      // Create new exporter instance
      const exporter2 = new AuditExporter(testDir);
      const position = exporter2.getLastExportPosition();

      expect(position).toBe('ghi789');
    });

    it('resets position when reset=true', async () => {
      await exporter.exportJSON({ incremental: true });
      expect(exporter.getLastExportPosition()).toBe('ghi789');

      exporter.resetExportPosition();
      expect(exporter.getLastExportPosition()).toBeNull();
    });
  });

  describe('formatForSplunk includes required fields', () => {
    it('formats single entry correctly', () => {
      const entry = sampleEntries[0];
      const formatted = exporter.formatForSplunk(entry);

      expect(formatted.time).toBe(new Date(entry.timestamp).getTime() / 1000);
      expect(formatted.source).toBe('tlc');
      expect(formatted.sourcetype).toBe('tlc:audit');
      expect(formatted.event).toMatchObject({
        tool: 'Read',
        classification: 'file:read',
      });
    });

    it('includes host field when configured', () => {
      const exporterWithHost = new AuditExporter(testDir, { host: 'prod-server-01' });
      const formatted = exporterWithHost.formatForSplunk(sampleEntries[0]);

      expect(formatted.host).toBe('prod-server-01');
    });

    it('includes index field when configured', () => {
      const exporterWithIndex = new AuditExporter(testDir, { splunkIndex: 'main' });
      const formatted = exporterWithIndex.formatForSplunk(sampleEntries[0]);

      expect(formatted.index).toBe('main');
    });
  });

  describe('formatForCEF follows CEF spec', () => {
    it('formats single entry to CEF', () => {
      const entry = sampleEntries[0];
      const formatted = exporter.formatForCEF(entry);

      expect(formatted.startsWith('CEF:')).toBe(true);
      const parts = formatted.split('|');
      expect(parts.length).toBe(8);
    });

    it('escapes pipe characters in fields', () => {
      const entryWithPipe = {
        ...sampleEntries[0],
        tool: 'Read|Write',
      };
      const formatted = exporter.formatForCEF(entryWithPipe);

      // Pipe should be escaped in CEF
      expect(formatted).toContain('Read\\|Write');
    });

    it('escapes backslash and equals in extension', () => {
      const entryWithSpecial = {
        ...sampleEntries[0],
        params: { file_path: 'C:\\test\\file=test.js' },
      };
      const formatted = exporter.formatForCEF(entryWithSpecial);

      // Extension values should have special chars escaped
      const extension = formatted.split('|')[7];
      expect(extension).toMatch(/\\\\/); // escaped backslash
    });

    it('uses correct CEF version', () => {
      const formatted = exporter.formatForCEF(sampleEntries[0]);
      expect(formatted.startsWith('CEF:0')).toBe(true);
    });

    it('maps classification to signature ID', () => {
      const formatted = exporter.formatForCEF(sampleEntries[0]);
      const parts = formatted.split('|');
      // Signature ID is part 4
      expect(parts[4]).toBe('file:read');
    });
  });

  describe('export to file', () => {
    it('writes JSON export to file', async () => {
      const filePath = path.join(testDir, 'export.json');
      await exporter.exportToFile(filePath, 'json');

      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toHaveLength(3);
    });

    it('writes CSV export to file', async () => {
      const filePath = path.join(testDir, 'export.csv');
      await exporter.exportToFile(filePath, 'csv');

      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('timestamp,tool');
    });

    it('writes Splunk export to file', async () => {
      const filePath = path.join(testDir, 'export.splunk');
      await exporter.exportToFile(filePath, 'splunk');

      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.trim().split('\n');
      expect(JSON.parse(lines[0]).sourcetype).toBe('tlc:audit');
    });

    it('writes CEF export to file', async () => {
      const filePath = path.join(testDir, 'export.cef');
      await exporter.exportToFile(filePath, 'cef');

      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('CEF:0');
    });
  });
});
