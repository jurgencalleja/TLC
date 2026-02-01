import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { AuditStorage, AUDIT_PATH } from './audit-storage.js';

describe('AuditStorage', () => {
  let testDir;
  let auditStorage;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-audit-test-'));
    auditStorage = new AuditStorage(testDir);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    vi.useRealTimers();
  });

  describe('storage creates directory if missing', () => {
    it('creates audit directory on first append', async () => {
      const auditDir = path.join(testDir, '.tlc', 'audit');
      expect(fs.existsSync(auditDir)).toBe(false);

      await auditStorage.appendEntry({
        action: 'test',
        user: 'testuser',
        timestamp: Date.now(),
      });

      expect(fs.existsSync(auditDir)).toBe(true);
    });
  });

  describe('appendEntry adds entry with checksum', () => {
    it('adds entry with SHA-256 checksum', async () => {
      const entry = {
        action: 'user.login',
        user: 'alice',
        timestamp: Date.now(),
      };

      await auditStorage.appendEntry(entry);

      const entries = await auditStorage.getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].checksum).toBeDefined();
      expect(entries[0].checksum).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
      expect(entries[0].action).toBe('user.login');
      expect(entries[0].user).toBe('alice');
    });

    it('writes in append-only mode', async () => {
      await auditStorage.appendEntry({ action: 'first', timestamp: Date.now() });
      await auditStorage.appendEntry({ action: 'second', timestamp: Date.now() });

      const entries = await auditStorage.getEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0].action).toBe('first');
      expect(entries[1].action).toBe('second');
    });
  });

  describe('appendEntry chains checksum to previous entry', () => {
    it('chains checksum to previous entry (blockchain-style)', async () => {
      await auditStorage.appendEntry({ action: 'first', timestamp: 1000 });
      await auditStorage.appendEntry({ action: 'second', timestamp: 2000 });

      const entries = await auditStorage.getEntries();
      expect(entries).toHaveLength(2);

      // First entry has no previous checksum
      expect(entries[0].previousChecksum).toBeNull();

      // Second entry chains to first
      expect(entries[1].previousChecksum).toBe(entries[0].checksum);
    });

    it('chains multiple entries correctly', async () => {
      await auditStorage.appendEntry({ action: 'a', timestamp: 1000 });
      await auditStorage.appendEntry({ action: 'b', timestamp: 2000 });
      await auditStorage.appendEntry({ action: 'c', timestamp: 3000 });

      const entries = await auditStorage.getEntries();
      expect(entries[0].previousChecksum).toBeNull();
      expect(entries[1].previousChecksum).toBe(entries[0].checksum);
      expect(entries[2].previousChecksum).toBe(entries[1].checksum);
    });
  });

  describe('verifyIntegrity detects tampered entries', () => {
    it('detects modified entry content', async () => {
      await auditStorage.appendEntry({ action: 'original', timestamp: 1000 });
      await auditStorage.appendEntry({ action: 'second', timestamp: 2000 });

      // Tamper with the log file directly
      const logFile = auditStorage.getCurrentLogFile();
      const content = fs.readFileSync(logFile, 'utf-8');
      const lines = content.trim().split('\n');
      const entry = JSON.parse(lines[0]);
      entry.action = 'tampered';
      lines[0] = JSON.stringify(entry);
      fs.writeFileSync(logFile, lines.join('\n') + '\n');

      const result = await auditStorage.verifyIntegrity();
      expect(result.valid).toBe(false);
      expect(result.error).toContain('checksum');
    });

    it('detects broken chain (modified previousChecksum)', async () => {
      await auditStorage.appendEntry({ action: 'first', timestamp: 1000 });
      await auditStorage.appendEntry({ action: 'second', timestamp: 2000 });

      // Tamper with chain
      const logFile = auditStorage.getCurrentLogFile();
      const content = fs.readFileSync(logFile, 'utf-8');
      const lines = content.trim().split('\n');
      const entry = JSON.parse(lines[1]);
      entry.previousChecksum = 'fakechecksum';
      // Recalculate checksum to hide modification (but chain will still break)
      const { checksum, ...entryData } = entry;
      entry.checksum = crypto.createHash('sha256').update(JSON.stringify(entryData)).digest('hex');
      lines[1] = JSON.stringify(entry);
      fs.writeFileSync(logFile, lines.join('\n') + '\n');

      const result = await auditStorage.verifyIntegrity();
      expect(result.valid).toBe(false);
      expect(result.error).toContain('chain');
    });

    it('detects deleted entries', async () => {
      await auditStorage.appendEntry({ action: 'first', timestamp: 1000 });
      await auditStorage.appendEntry({ action: 'second', timestamp: 2000 });
      await auditStorage.appendEntry({ action: 'third', timestamp: 3000 });

      // Delete middle entry
      const logFile = auditStorage.getCurrentLogFile();
      const content = fs.readFileSync(logFile, 'utf-8');
      const lines = content.trim().split('\n');
      lines.splice(1, 1); // Remove second entry
      fs.writeFileSync(logFile, lines.join('\n') + '\n');

      const result = await auditStorage.verifyIntegrity();
      expect(result.valid).toBe(false);
    });
  });

  describe('verifyIntegrity passes for valid chain', () => {
    it('passes for single entry', async () => {
      await auditStorage.appendEntry({ action: 'single', timestamp: 1000 });

      const result = await auditStorage.verifyIntegrity();
      expect(result.valid).toBe(true);
      expect(result.entryCount).toBe(1);
    });

    it('passes for multiple valid entries', async () => {
      await auditStorage.appendEntry({ action: 'first', timestamp: 1000 });
      await auditStorage.appendEntry({ action: 'second', timestamp: 2000 });
      await auditStorage.appendEntry({ action: 'third', timestamp: 3000 });

      const result = await auditStorage.verifyIntegrity();
      expect(result.valid).toBe(true);
      expect(result.entryCount).toBe(3);
    });

    it('passes for empty log', async () => {
      const result = await auditStorage.verifyIntegrity();
      expect(result.valid).toBe(true);
      expect(result.entryCount).toBe(0);
    });
  });

  describe('rotateLog creates new log file daily', () => {
    it('creates new log file when date changes', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-15T10:00:00Z'));

      await auditStorage.appendEntry({ action: 'day1', timestamp: Date.now() });
      const file1 = auditStorage.getCurrentLogFile();

      // Move to next day
      vi.setSystemTime(new Date('2026-01-16T10:00:00Z'));
      await auditStorage.appendEntry({ action: 'day2', timestamp: Date.now() });
      const file2 = auditStorage.getCurrentLogFile();

      expect(file1).not.toBe(file2);
      expect(file1).toContain('2026-01-15');
      expect(file2).toContain('2026-01-16');
    });

    it('rotateLog archives old logs with retention policy', async () => {
      vi.useFakeTimers();

      // Create logs for 10 days
      for (let day = 1; day <= 10; day++) {
        vi.setSystemTime(new Date(`2026-01-${String(day).padStart(2, '0')}T10:00:00Z`));
        await auditStorage.appendEntry({ action: `day${day}`, timestamp: Date.now() });
      }

      // Set retention to 7 days and rotate
      vi.setSystemTime(new Date('2026-01-11T10:00:00Z'));
      await auditStorage.rotateLog({ retentionDays: 7 });

      // Check that only last 7 days remain
      const auditDir = path.join(testDir, '.tlc', 'audit');
      const files = fs.readdirSync(auditDir).filter(f => f.endsWith('.jsonl'));

      // Days 4-10 should exist (7 days before Jan 11)
      expect(files.length).toBe(7);
      expect(files.some(f => f.includes('2026-01-03'))).toBe(false);
      expect(files.some(f => f.includes('2026-01-04'))).toBe(true);
    });
  });

  describe('getEntries returns entries in time order', () => {
    it('returns entries sorted by timestamp ascending', async () => {
      // Add entries out of order
      await auditStorage.appendEntry({ action: 'c', timestamp: 3000 });
      await auditStorage.appendEntry({ action: 'a', timestamp: 1000 });
      await auditStorage.appendEntry({ action: 'b', timestamp: 2000 });

      const entries = await auditStorage.getEntries();
      expect(entries[0].timestamp).toBe(1000);
      expect(entries[1].timestamp).toBe(2000);
      expect(entries[2].timestamp).toBe(3000);
    });

    it('returns entries across multiple log files', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-15T10:00:00Z'));
      await auditStorage.appendEntry({ action: 'day1', timestamp: Date.now() });

      vi.setSystemTime(new Date('2026-01-16T10:00:00Z'));
      await auditStorage.appendEntry({ action: 'day2', timestamp: Date.now() });

      const entries = await auditStorage.getEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0].action).toBe('day1');
      expect(entries[1].action).toBe('day2');
    });

    it('supports date range filtering', async () => {
      vi.useFakeTimers();

      vi.setSystemTime(new Date('2026-01-15T10:00:00Z'));
      await auditStorage.appendEntry({ action: 'day1', timestamp: Date.now() });

      vi.setSystemTime(new Date('2026-01-16T10:00:00Z'));
      await auditStorage.appendEntry({ action: 'day2', timestamp: Date.now() });

      vi.setSystemTime(new Date('2026-01-17T10:00:00Z'));
      await auditStorage.appendEntry({ action: 'day3', timestamp: Date.now() });

      const entries = await auditStorage.getEntries({
        from: new Date('2026-01-16T00:00:00Z'),
        to: new Date('2026-01-16T23:59:59Z'),
      });

      expect(entries).toHaveLength(1);
      expect(entries[0].action).toBe('day2');
    });
  });

  describe('AUDIT_PATH', () => {
    it('exports correct path constant', () => {
      expect(AUDIT_PATH).toBe('.tlc/audit');
    });
  });
});
