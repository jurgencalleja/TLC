import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { AuditQuery } from './audit-query.js';
import { AuditStorage } from './audit-storage.js';

describe('AuditQuery', () => {
  let testDir;
  let auditStorage;
  let auditQuery;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-audit-query-test-'));
    auditStorage = new AuditStorage(testDir);
    auditQuery = new AuditQuery(auditStorage);

    // Seed test data
    await auditStorage.appendEntry({
      action: 'user.login',
      user: 'alice',
      severity: 'info',
      timestamp: new Date('2026-01-15T10:00:00Z').getTime(),
      parameters: { ip: '192.168.1.1', browser: 'Chrome' },
    });
    await auditStorage.appendEntry({
      action: 'user.logout',
      user: 'alice',
      severity: 'info',
      timestamp: new Date('2026-01-15T11:00:00Z').getTime(),
      parameters: { duration: '1h' },
    });
    await auditStorage.appendEntry({
      action: 'config.update',
      user: 'bob',
      severity: 'warning',
      timestamp: new Date('2026-01-16T09:00:00Z').getTime(),
      parameters: { setting: 'timeout', oldValue: 30, newValue: 60 },
    });
    await auditStorage.appendEntry({
      action: 'security.alert',
      user: 'system',
      severity: 'error',
      timestamp: new Date('2026-01-16T14:00:00Z').getTime(),
      parameters: { reason: 'brute force detected', ip: '10.0.0.1' },
    });
    await auditStorage.appendEntry({
      action: 'user.login',
      user: 'charlie',
      severity: 'info',
      timestamp: new Date('2026-01-17T08:00:00Z').getTime(),
      parameters: { ip: '192.168.1.50', browser: 'Firefox' },
    });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    vi.useRealTimers();
  });

  describe('query filters by date range', () => {
    it('filters entries within date range', async () => {
      const result = await auditQuery.query({
        from: new Date('2026-01-16T00:00:00Z'),
        to: new Date('2026-01-16T23:59:59Z'),
        sort: 'asc',
      });

      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].user).toBe('bob');
      expect(result.entries[1].user).toBe('system');
    });

    it('filters by from date only', async () => {
      const result = await auditQuery.query({
        from: new Date('2026-01-16T00:00:00Z'),
      });

      expect(result.entries).toHaveLength(3);
    });

    it('filters by to date only', async () => {
      const result = await auditQuery.query({
        to: new Date('2026-01-15T23:59:59Z'),
      });

      expect(result.entries).toHaveLength(2);
    });
  });

  describe('query filters by action type', () => {
    it('filters by exact action', async () => {
      const result = await auditQuery.query({
        action: 'user.login',
        sort: 'asc',
      });

      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].user).toBe('alice');
      expect(result.entries[1].user).toBe('charlie');
    });

    it('filters by action prefix', async () => {
      const result = await auditQuery.query({
        action: 'user.*',
      });

      expect(result.entries).toHaveLength(3);
    });

    it('returns empty for non-existent action', async () => {
      const result = await auditQuery.query({
        action: 'nonexistent.action',
      });

      expect(result.entries).toHaveLength(0);
    });
  });

  describe('query filters by user', () => {
    it('filters by single user', async () => {
      const result = await auditQuery.query({
        user: 'alice',
      });

      expect(result.entries).toHaveLength(2);
      expect(result.entries.every((e) => e.user === 'alice')).toBe(true);
    });

    it('filters by multiple users', async () => {
      const result = await auditQuery.query({
        user: ['alice', 'bob'],
      });

      expect(result.entries).toHaveLength(3);
    });
  });

  describe('query filters by severity', () => {
    it('filters by single severity', async () => {
      const result = await auditQuery.query({
        severity: 'warning',
      });

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].action).toBe('config.update');
    });

    it('filters by multiple severities', async () => {
      const result = await auditQuery.query({
        severity: ['warning', 'error'],
      });

      expect(result.entries).toHaveLength(2);
    });

    it('filters by severity level (minimum)', async () => {
      const result = await auditQuery.query({
        minSeverity: 'warning',
        sort: 'asc',
      });

      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].severity).toBe('warning');
      expect(result.entries[1].severity).toBe('error');
    });
  });

  describe('query supports multiple filters combined', () => {
    it('combines date range and action filter', async () => {
      const result = await auditQuery.query({
        from: new Date('2026-01-15T00:00:00Z'),
        to: new Date('2026-01-15T23:59:59Z'),
        action: 'user.login',
      });

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].user).toBe('alice');
    });

    it('combines user, severity, and action filters', async () => {
      const result = await auditQuery.query({
        user: 'alice',
        severity: 'info',
        action: 'user.*',
      });

      expect(result.entries).toHaveLength(2);
    });

    it('combines all filters', async () => {
      const result = await auditQuery.query({
        from: new Date('2026-01-15T00:00:00Z'),
        to: new Date('2026-01-16T23:59:59Z'),
        user: ['bob', 'system'],
        severity: ['warning', 'error'],
      });

      expect(result.entries).toHaveLength(2);
    });
  });

  describe('query returns paginated results', () => {
    it('returns first page with limit', async () => {
      const result = await auditQuery.query({
        limit: 2,
      });

      expect(result.entries).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(result.hasMore).toBe(true);
      expect(result.page).toBe(1);
    });

    it('returns second page with offset', async () => {
      const result = await auditQuery.query({
        limit: 2,
        offset: 2,
      });

      expect(result.entries).toHaveLength(2);
      expect(result.page).toBe(2);
    });

    it('returns last page correctly', async () => {
      const result = await auditQuery.query({
        limit: 2,
        offset: 4,
      });

      expect(result.entries).toHaveLength(1);
      expect(result.hasMore).toBe(false);
      expect(result.page).toBe(3);
    });

    it('supports page parameter instead of offset', async () => {
      const result = await auditQuery.query({
        limit: 2,
        page: 2,
      });

      expect(result.entries).toHaveLength(2);
      expect(result.page).toBe(2);
      expect(result.entries[0].user).toBe('bob');
    });
  });

  describe('query searches parameter content', () => {
    it('searches in parameter values', async () => {
      const result = await auditQuery.query({
        search: 'Chrome',
      });

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].user).toBe('alice');
      expect(result.entries[0].action).toBe('user.login');
    });

    it('searches in nested parameter values', async () => {
      const result = await auditQuery.query({
        search: 'brute force',
      });

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].action).toBe('security.alert');
    });

    it('searches case-insensitively', async () => {
      const result = await auditQuery.query({
        search: 'firefox',
      });

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].user).toBe('charlie');
    });

    it('searches across action and user fields too', async () => {
      const result = await auditQuery.query({
        search: 'config',
      });

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].user).toBe('bob');
    });
  });

  describe('query returns count without results', () => {
    it('returns only count when countOnly is true', async () => {
      const result = await auditQuery.query({
        countOnly: true,
      });

      expect(result.total).toBe(5);
      expect(result.entries).toBeUndefined();
    });

    it('returns filtered count', async () => {
      const result = await auditQuery.query({
        user: 'alice',
        countOnly: true,
      });

      expect(result.total).toBe(2);
      expect(result.entries).toBeUndefined();
    });
  });

  describe('query handles empty results', () => {
    it('returns empty array for no matches', async () => {
      const result = await auditQuery.query({
        user: 'nonexistent',
      });

      expect(result.entries).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('handles empty storage gracefully', async () => {
      const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-audit-empty-'));
      const emptyStorage = new AuditStorage(emptyDir);
      const emptyQuery = new AuditQuery(emptyStorage);

      const result = await emptyQuery.query({});

      expect(result.entries).toHaveLength(0);
      expect(result.total).toBe(0);

      fs.rmSync(emptyDir, { recursive: true, force: true });
    });
  });

  describe('query sorting', () => {
    it('sorts by timestamp descending by default', async () => {
      const result = await auditQuery.query({});

      // Most recent first
      expect(result.entries[0].user).toBe('charlie');
      expect(result.entries[4].user).toBe('alice');
    });

    it('sorts by timestamp ascending when specified', async () => {
      const result = await auditQuery.query({
        sort: 'asc',
      });

      // Oldest first
      expect(result.entries[0].user).toBe('alice');
      expect(result.entries[0].action).toBe('user.login');
    });
  });
});
