/**
 * Log Aggregator Tests
 */
import { describe, it, expect, vi } from 'vitest';
import {
  aggregateLogs,
  structureLog,
  filterSensitiveData,
  rotateLogs,
  exportLogs,
  LOG_LEVELS,
  createLogAggregator,
} from './log-aggregator.js';

describe('log-aggregator', () => {
  describe('LOG_LEVELS', () => {
    it('defines level constants', () => {
      expect(LOG_LEVELS.ERROR).toBe('error');
      expect(LOG_LEVELS.WARN).toBe('warn');
      expect(LOG_LEVELS.INFO).toBe('info');
      expect(LOG_LEVELS.DEBUG).toBe('debug');
    });
  });

  describe('structureLog', () => {
    it('structures log as JSON', () => {
      const log = structureLog({ message: 'Test', level: 'info' });
      expect(log.message).toBe('Test');
      expect(log.level).toBe('info');
      expect(log.timestamp).toBeDefined();
    });
  });

  describe('filterSensitiveData', () => {
    it('redacts passwords', () => {
      const log = filterSensitiveData({ message: 'password=secret123' });
      expect(log.message).not.toContain('secret123');
      expect(log.message).toContain('[REDACTED]');
    });

    it('redacts API keys', () => {
      const log = filterSensitiveData({ message: 'api_key: sk-abc123' });
      expect(log.message).not.toContain('sk-abc123');
    });
  });

  describe('aggregateLogs', () => {
    it('aggregates from multiple sources', () => {
      const logs = aggregateLogs([
        { source: 'app', logs: [{ message: 'a' }] },
        { source: 'db', logs: [{ message: 'b' }] },
      ]);
      expect(logs.length).toBe(2);
    });
  });

  describe('rotateLogs', () => {
    it('rotates by size', () => {
      const result = rotateLogs({ maxSize: 1000, currentSize: 1500 });
      expect(result.rotated).toBe(true);
    });

    it('rotates by time', () => {
      const result = rotateLogs({ maxAge: 86400000, age: 90000000 });
      expect(result.rotated).toBe(true);
    });
  });

  describe('exportLogs', () => {
    it('exports to JSON', () => {
      const output = exportLogs([{ message: 'test' }], 'json');
      expect(JSON.parse(output)).toHaveLength(1);
    });

    it('exports to NDJSON', () => {
      const output = exportLogs([{ message: 'a' }, { message: 'b' }], 'ndjson');
      expect(output.split('\n').filter(Boolean)).toHaveLength(2);
    });
  });

  describe('createLogAggregator', () => {
    it('creates aggregator with methods', () => {
      const aggregator = createLogAggregator();
      expect(aggregator.addSource).toBeDefined();
      expect(aggregator.collect).toBeDefined();
      expect(aggregator.export).toBeDefined();
    });
  });
});
