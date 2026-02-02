/**
 * Session Purge Manager Tests
 *
 * Tests for automatic purge of data when sessions end
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SessionPurgeManager,
  createPurgeManager,
} from './session-purge.js';
import { EphemeralStorage } from './ephemeral-storage.js';
import { getPolicy, evaluateRetention, DEFAULT_POLICIES } from './retention-policy.js';

describe('SessionPurgeManager', () => {
  let storage;
  let purgeManager;

  beforeEach(() => {
    vi.useFakeTimers();
    storage = new EphemeralStorage();
    purgeManager = new SessionPurgeManager({
      storage,
      sessionId: 'test-session-123',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('onSessionEnd', () => {
    it('purges session data', () => {
      // Store some session data
      storage.set('key1', { value: 'data1', sessionId: 'test-session-123' });
      storage.set('key2', { value: 'data2', sessionId: 'test-session-123' });
      storage.set('key3', { value: 'data3', sessionId: 'other-session' });

      // Trigger session end
      purgeManager.onSessionEnd();

      // Session-specific data should be purged
      expect(storage.has('key1')).toBe(false);
      expect(storage.has('key2')).toBe(false);
      // Other session data should remain
      expect(storage.has('key3')).toBe(true);
    });

    it('respects retention policies', () => {
      // Store data with different retention requirements
      storage.set('secret', {
        value: 'sensitive',
        sessionId: 'test-session-123',
        sensitivityLevel: 'critical',
      });
      storage.set('general', {
        value: 'normal',
        sessionId: 'test-session-123',
        sensitivityLevel: 'low',
        createdAt: new Date().toISOString(),
      });

      // Trigger session end with policy evaluation
      purgeManager.onSessionEnd({ respectPolicies: true });

      // Critical data should always be purged
      expect(storage.has('secret')).toBe(false);
      // Low sensitivity with valid retention may be kept based on policy
      // (depends on implementation - session end typically purges all session data)
      expect(storage.has('general')).toBe(false);
    });

    it('logs actions when audit enabled', () => {
      const auditLog = [];
      const auditManager = new SessionPurgeManager({
        storage,
        sessionId: 'test-session-123',
        auditEnabled: true,
        onAuditLog: (entry) => auditLog.push(entry),
      });

      storage.set('key1', { value: 'data1', sessionId: 'test-session-123' });

      auditManager.onSessionEnd();

      expect(auditLog.length).toBeGreaterThan(0);
      expect(auditLog[0]).toMatchObject({
        action: 'purge',
        sessionId: 'test-session-123',
      });
    });
  });

  describe('onProcessExit', () => {
    it('triggers purge', () => {
      storage.set('key1', { value: 'data1', sessionId: 'test-session-123' });
      storage.set('key2', { value: 'data2' });

      const result = purgeManager.onProcessExit();

      // All session data should be purged on process exit
      expect(storage.has('key1')).toBe(false);
      expect(result.purgedCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('onTimeout', () => {
    it('triggers purge after idle', () => {
      storage.set('key1', { value: 'data1', sessionId: 'test-session-123' });

      // Set up idle timeout
      purgeManager.startIdleTimer(1000); // 1 second

      // Data still present before timeout
      expect(storage.has('key1')).toBe(true);

      // Advance time past timeout
      vi.advanceTimersByTime(1500);

      // Data should be purged after idle timeout
      expect(storage.has('key1')).toBe(false);
    });

    it('resets timer on activity', () => {
      storage.set('key1', { value: 'data1', sessionId: 'test-session-123' });

      purgeManager.startIdleTimer(1000);

      // Advance time partially
      vi.advanceTimersByTime(800);

      // Activity resets the timer
      purgeManager.resetIdleTimer();

      // Advance time again but not past the reset timer
      vi.advanceTimersByTime(800);

      // Data should still be present (timer was reset)
      expect(storage.has('key1')).toBe(true);

      // Advance past the timeout from last reset
      vi.advanceTimersByTime(300);

      // Now data should be purged
      expect(storage.has('key1')).toBe(false);
    });
  });

  describe('purgeByPolicy', () => {
    it('removes only matching data', () => {
      // Store data with different sensitivity levels
      storage.set('critical1', {
        value: 'secret1',
        sessionId: 'test-session-123',
        sensitivityLevel: 'critical',
      });
      storage.set('low1', {
        value: 'normal1',
        sessionId: 'test-session-123',
        sensitivityLevel: 'low',
        createdAt: new Date().toISOString(),
      });
      storage.set('high1', {
        value: 'high1',
        sessionId: 'test-session-123',
        sensitivityLevel: 'high',
      });

      // Purge only critical sensitivity data
      const result = purgeManager.purgeByPolicy({
        sensitivityLevel: 'critical',
      });

      expect(storage.has('critical1')).toBe(false);
      expect(storage.has('low1')).toBe(true);
      expect(storage.has('high1')).toBe(true);
      expect(result.purgedCount).toBe(1);
    });

    it('purges by data type', () => {
      storage.set('pii1', {
        value: 'personal',
        sessionId: 'test-session-123',
        dataType: 'pii',
      });
      storage.set('general1', {
        value: 'general',
        sessionId: 'test-session-123',
        dataType: 'general',
        createdAt: new Date().toISOString(),
      });

      const result = purgeManager.purgeByPolicy({
        dataType: 'pii',
      });

      expect(storage.has('pii1')).toBe(false);
      expect(storage.has('general1')).toBe(true);
      expect(result.purgedCount).toBe(1);
    });
  });

  describe('forcePurge', () => {
    it('removes all data immediately', () => {
      storage.set('key1', { value: 'data1', sessionId: 'test-session-123' });
      storage.set('key2', { value: 'data2', sessionId: 'other-session' });
      storage.set('key3', { value: 'data3' });

      const result = purgeManager.forcePurge();

      expect(storage.keys().length).toBe(0);
      expect(result.purgedCount).toBe(3);
      expect(result.forced).toBe(true);
    });

    it('clears storage completely', () => {
      storage.set('a', 1);
      storage.set('b', 2);
      storage.set('c', 3);

      purgeManager.forcePurge();

      expect(storage.has('a')).toBe(false);
      expect(storage.has('b')).toBe(false);
      expect(storage.has('c')).toBe(false);
    });
  });

  describe('getPurgeReport', () => {
    it('returns what was purged', () => {
      storage.set('key1', { value: 'data1', sessionId: 'test-session-123' });
      storage.set('key2', { value: 'data2', sessionId: 'test-session-123' });

      purgeManager.onSessionEnd();

      const report = purgeManager.getPurgeReport();

      expect(report).toBeDefined();
      expect(report.purgedKeys).toContain('key1');
      expect(report.purgedKeys).toContain('key2');
      expect(report.purgedCount).toBe(2);
      expect(report.timestamp).toBeDefined();
      expect(report.sessionId).toBe('test-session-123');
    });

    it('returns empty report when nothing purged', () => {
      const report = purgeManager.getPurgeReport();

      expect(report.purgedKeys).toEqual([]);
      expect(report.purgedCount).toBe(0);
    });

    it('tracks multiple purge operations', () => {
      storage.set('key1', { value: 'data1', sessionId: 'test-session-123' });
      purgeManager.onSessionEnd();

      storage.set('key2', { value: 'data2', sessionId: 'test-session-123' });
      purgeManager.onSessionEnd();

      const report = purgeManager.getPurgeReport();

      // Should have records of both purge operations
      expect(report.totalPurged).toBeGreaterThanOrEqual(2);
    });
  });

  describe('createPurgeManager factory', () => {
    it('creates manager with storage', () => {
      const manager = createPurgeManager({
        storage: new EphemeralStorage(),
        sessionId: 'factory-session',
      });

      expect(manager).toBeInstanceOf(SessionPurgeManager);
    });

    it('creates manager with default options', () => {
      const manager = createPurgeManager({
        storage: new EphemeralStorage(),
      });

      expect(manager).toBeDefined();
    });
  });

  describe('graceful shutdown', () => {
    it('supports graceful shutdown', async () => {
      storage.set('key1', { value: 'data1', sessionId: 'test-session-123' });

      const result = await purgeManager.gracefulShutdown();

      expect(storage.has('key1')).toBe(false);
      expect(result.graceful).toBe(true);
    });

    it('times out graceful shutdown and force purges', async () => {
      storage.set('key1', { value: 'data1', sessionId: 'test-session-123' });

      // Start graceful shutdown with very short timeout
      const shutdownPromise = purgeManager.gracefulShutdown({ timeout: 100 });

      // Advance timers to trigger timeout
      vi.advanceTimersByTime(150);

      const result = await shutdownPromise;

      expect(storage.has('key1')).toBe(false);
      expect(result.timedOut || result.graceful).toBe(true);
    });
  });
});
