/**
 * Uptime Monitor Tests
 */
import { describe, it, expect, vi } from 'vitest';
import {
  pingEndpoint,
  calculateUptime,
  createUptimeMonitor,
  generateUptimeReport,
  UPTIME_STATUS,
} from './uptime-monitor.js';

describe('uptime-monitor', () => {
  describe('UPTIME_STATUS', () => {
    it('defines status constants', () => {
      expect(UPTIME_STATUS.UP).toBe('up');
      expect(UPTIME_STATUS.DOWN).toBe('down');
      expect(UPTIME_STATUS.DEGRADED).toBe('degraded');
    });
  });

  describe('pingEndpoint', () => {
    it('returns up for successful response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
      const result = await pingEndpoint('https://example.com', { fetch: mockFetch });
      expect(result.status).toBe('up');
    });

    it('returns down for failed response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
      const result = await pingEndpoint('https://example.com', { fetch: mockFetch });
      expect(result.status).toBe('down');
    });

    it('measures response time', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      const result = await pingEndpoint('https://example.com', { fetch: mockFetch });
      expect(result.responseTime).toBeDefined();
    });

    it('handles timeout', async () => {
      const mockFetch = vi.fn().mockImplementation(() => new Promise((r) => setTimeout(r, 5000)));
      const result = await pingEndpoint('https://example.com', { fetch: mockFetch, timeout: 100 });
      expect(result.status).toBe('down');
      expect(result.error).toContain('timeout');
    });
  });

  describe('calculateUptime', () => {
    it('calculates 100% uptime', () => {
      const checks = [{ status: 'up' }, { status: 'up' }, { status: 'up' }];
      expect(calculateUptime(checks)).toBe(100);
    });

    it('calculates partial uptime', () => {
      const checks = [{ status: 'up' }, { status: 'down' }, { status: 'up' }];
      expect(calculateUptime(checks)).toBeCloseTo(66.67, 1);
    });

    it('handles empty checks', () => {
      expect(calculateUptime([])).toBe(100);
    });
  });

  describe('generateUptimeReport', () => {
    it('generates daily report', () => {
      const report = generateUptimeReport({
        endpoint: 'https://example.com',
        period: 'day',
        checks: Array(24).fill({ status: 'up', responseTime: 100 }),
      });
      expect(report.uptime).toBe(100);
      expect(report.period).toBe('day');
    });

    it('includes average response time', () => {
      const report = generateUptimeReport({
        endpoint: 'https://example.com',
        checks: [{ responseTime: 100 }, { responseTime: 200 }],
      });
      expect(report.avgResponseTime).toBe(150);
    });
  });

  describe('createUptimeMonitor', () => {
    it('creates monitor with methods', () => {
      const monitor = createUptimeMonitor();
      expect(monitor.addEndpoint).toBeDefined();
      expect(monitor.check).toBeDefined();
      expect(monitor.getStatus).toBeDefined();
      expect(monitor.getReport).toBeDefined();
    });

    it('monitors multiple endpoints', async () => {
      const monitor = createUptimeMonitor();
      monitor.addEndpoint('https://api.example.com');
      monitor.addEndpoint('https://web.example.com');
      expect(monitor.getEndpoints().length).toBe(2);
    });

    it('detects downtime within interval', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: false });
      const monitor = createUptimeMonitor({ fetch: mockFetch, interval: 100 });
      monitor.addEndpoint('https://example.com');
      await monitor.check();
      expect(monitor.getStatus('https://example.com')).toBe('down');
    });
  });
});
