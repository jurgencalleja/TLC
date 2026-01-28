import { describe, it, expect } from 'vitest';
import {
  formatLogEntry,
  filterLogs,
  aggregateLogs,
  createLogBuffer,
} from './log-streamer.js';

describe('log-streamer', () => {
  describe('formatLogEntry', () => {
    it('formats log entry with service name and timestamp', () => {
      const entry = {
        service: 'api',
        timestamp: '2024-01-15T10:30:00.000Z',
        message: 'Server started',
        level: 'info',
      };

      const formatted = formatLogEntry(entry);

      expect(formatted).toContain('api');
      expect(formatted).toContain('10:30:00');
      expect(formatted).toContain('Server started');
    });

    it('adds color coding for error level', () => {
      const entry = {
        service: 'api',
        message: 'Connection failed',
        level: 'error',
      };

      const formatted = formatLogEntry(entry, { colors: true });

      expect(formatted).toContain('ERROR');
      expect(formatted).toContain('Connection failed');
    });

    it('handles missing timestamp', () => {
      const entry = {
        service: 'worker',
        message: 'Processing job',
      };

      const formatted = formatLogEntry(entry);

      expect(formatted).toContain('worker');
      expect(formatted).toContain('Processing job');
    });
  });

  describe('filterLogs', () => {
    it('filters by service name', () => {
      const logs = [
        { service: 'api', message: 'API log 1' },
        { service: 'web', message: 'Web log 1' },
        { service: 'api', message: 'API log 2' },
      ];

      const filtered = filterLogs(logs, { service: 'api' });

      expect(filtered).toHaveLength(2);
      expect(filtered.every(l => l.service === 'api')).toBe(true);
    });

    it('filters by log level', () => {
      const logs = [
        { service: 'api', message: 'Info', level: 'info' },
        { service: 'api', message: 'Error', level: 'error' },
        { service: 'api', message: 'Debug', level: 'debug' },
      ];

      const filtered = filterLogs(logs, { level: 'error' });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].level).toBe('error');
    });

    it('filters by search term', () => {
      const logs = [
        { service: 'api', message: 'User logged in' },
        { service: 'api', message: 'Database connected' },
        { service: 'api', message: 'User logged out' },
      ];

      const filtered = filterLogs(logs, { search: 'User' });

      expect(filtered).toHaveLength(2);
    });

    it('combines multiple filters', () => {
      const logs = [
        { service: 'api', message: 'Error: User not found', level: 'error' },
        { service: 'api', message: 'User logged in', level: 'info' },
        { service: 'web', message: 'Error: Page not found', level: 'error' },
      ];

      const filtered = filterLogs(logs, { service: 'api', level: 'error' });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].message).toContain('User not found');
    });
  });

  describe('aggregateLogs', () => {
    it('merges logs from multiple services by timestamp', () => {
      const apiLogs = [
        { service: 'api', timestamp: '2024-01-15T10:30:00Z', message: 'A1' },
        { service: 'api', timestamp: '2024-01-15T10:30:02Z', message: 'A2' },
      ];
      const webLogs = [
        { service: 'web', timestamp: '2024-01-15T10:30:01Z', message: 'W1' },
      ];

      const aggregated = aggregateLogs([apiLogs, webLogs]);

      expect(aggregated).toHaveLength(3);
      expect(aggregated[0].message).toBe('A1');
      expect(aggregated[1].message).toBe('W1');
      expect(aggregated[2].message).toBe('A2');
    });

    it('handles empty log arrays', () => {
      const aggregated = aggregateLogs([[], []]);

      expect(aggregated).toHaveLength(0);
    });

    it('handles logs without timestamps', () => {
      const logs1 = [{ service: 'api', message: 'A1' }];
      const logs2 = [{ service: 'web', message: 'W1' }];

      const aggregated = aggregateLogs([logs1, logs2]);

      expect(aggregated).toHaveLength(2);
    });
  });

  describe('createLogBuffer', () => {
    it('creates buffer with max size', () => {
      const buffer = createLogBuffer({ maxSize: 100 });

      expect(buffer.maxSize).toBe(100);
      expect(buffer.logs).toHaveLength(0);
    });

    it('adds entries to buffer', () => {
      const buffer = createLogBuffer({ maxSize: 100 });

      buffer.add({ service: 'api', message: 'Log 1' });
      buffer.add({ service: 'api', message: 'Log 2' });

      expect(buffer.logs).toHaveLength(2);
    });

    it('evicts oldest entries when full', () => {
      const buffer = createLogBuffer({ maxSize: 3 });

      buffer.add({ message: '1' });
      buffer.add({ message: '2' });
      buffer.add({ message: '3' });
      buffer.add({ message: '4' });

      expect(buffer.logs).toHaveLength(3);
      expect(buffer.logs[0].message).toBe('2');
      expect(buffer.logs[2].message).toBe('4');
    });

    it('returns recent entries', () => {
      const buffer = createLogBuffer({ maxSize: 100 });

      buffer.add({ message: '1' });
      buffer.add({ message: '2' });
      buffer.add({ message: '3' });

      const recent = buffer.getRecent(2);

      expect(recent).toHaveLength(2);
      expect(recent[0].message).toBe('2');
      expect(recent[1].message).toBe('3');
    });

    it('clears buffer', () => {
      const buffer = createLogBuffer({ maxSize: 100 });

      buffer.add({ message: '1' });
      buffer.add({ message: '2' });
      buffer.clear();

      expect(buffer.logs).toHaveLength(0);
    });
  });
});
