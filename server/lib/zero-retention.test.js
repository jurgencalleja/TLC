/**
 * Zero-Retention Mode Tests
 *
 * Tests for the master switch that configures all subsystems for zero-data-retention.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  enable,
  disable,
  isEnabled,
  getConfig,
  validate,
  ZeroRetentionMode,
  _resetGlobalInstance,
} from './zero-retention.js';

// Mock dependencies
vi.mock('./sensitive-detector.js', () => ({
  detectSensitive: vi.fn(() => []),
  getSensitivityLevel: vi.fn(() => 'low'),
}));

vi.mock('./retention-policy.js', () => ({
  getPolicy: vi.fn(() => ({ retention: 'immediate', persist: false })),
  evaluateRetention: vi.fn(() => 'purge'),
  loadPolicies: vi.fn(() => ({})),
}));

vi.mock('./ephemeral-storage.js', () => ({
  EphemeralStorage: vi.fn().mockImplementation(() => ({
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
    keys: vi.fn(() => []),
  })),
}));

vi.mock('./session-purge.js', () => ({
  SessionPurgeManager: vi.fn().mockImplementation(() => ({
    onSessionEnd: vi.fn(),
    onProcessExit: vi.fn(),
    startIdleTimer: vi.fn(),
    stopIdleTimer: vi.fn(),
    forcePurge: vi.fn(),
  })),
  createPurgeManager: vi.fn((options) => ({
    onSessionEnd: vi.fn(),
    onProcessExit: vi.fn(),
    startIdleTimer: vi.fn(),
    stopIdleTimer: vi.fn(),
    forcePurge: vi.fn(),
    ...options,
  })),
}));

vi.mock('./memory-exclusion.js', () => ({
  shouldExclude: vi.fn(() => true),
  loadPatterns: vi.fn(() => ({
    mode: 'blacklist',
    filePatterns: ['*'],
    contentPatterns: ['*'],
  })),
}));

describe('Zero-Retention Mode', () => {
  let zeroRetention;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset global instance to prevent state leakage
    _resetGlobalInstance();
    // Create a fresh instance for each test
    zeroRetention = new ZeroRetentionMode();
  });

  afterEach(() => {
    // Ensure mode is disabled after each test
    if (zeroRetention && zeroRetention.isEnabled()) {
      zeroRetention.disable();
    }
  });

  describe('enable', () => {
    it('activates zero-retention mode', () => {
      const result = zeroRetention.enable();

      expect(result.success).toBe(true);
      expect(result.enabled).toBe(true);
      expect(zeroRetention.isEnabled()).toBe(true);
    });

    it('configures ephemeral storage', () => {
      const result = zeroRetention.enable();

      expect(result.success).toBe(true);
      expect(result.subsystems.ephemeralStorage).toBe(true);
      expect(result.config.ephemeralStorage).toBeDefined();
      expect(result.config.ephemeralStorage.encrypt).toBe(true);
    });

    it('configures session purge', () => {
      const result = zeroRetention.enable();

      expect(result.success).toBe(true);
      expect(result.subsystems.sessionPurge).toBe(true);
      expect(result.config.sessionPurge).toBeDefined();
      expect(result.config.sessionPurge.aggressive).toBe(true);
    });

    it('configures memory exclusions', () => {
      const result = zeroRetention.enable();

      expect(result.success).toBe(true);
      expect(result.subsystems.memoryExclusion).toBe(true);
      expect(result.config.memoryExclusion).toBeDefined();
      expect(result.config.memoryExclusion.excludeAll).toBe(true);
    });
  });

  describe('disable', () => {
    it('returns to normal mode', () => {
      // First enable
      zeroRetention.enable();
      expect(zeroRetention.isEnabled()).toBe(true);

      // Then disable
      const result = zeroRetention.disable();

      expect(result.success).toBe(true);
      expect(result.enabled).toBe(false);
      expect(zeroRetention.isEnabled()).toBe(false);
    });
  });

  describe('isEnabled', () => {
    it('returns current state', () => {
      expect(zeroRetention.isEnabled()).toBe(false);

      zeroRetention.enable();
      expect(zeroRetention.isEnabled()).toBe(true);

      zeroRetention.disable();
      expect(zeroRetention.isEnabled()).toBe(false);
    });
  });

  describe('getConfig', () => {
    it('returns active configuration', () => {
      zeroRetention.enable();

      const config = zeroRetention.getConfig();

      expect(config).toBeDefined();
      expect(config.enabled).toBe(true);
      expect(config.ephemeralStorage).toBeDefined();
      expect(config.sessionPurge).toBeDefined();
      expect(config.memoryExclusion).toBeDefined();
      expect(config.retentionPolicy).toBeDefined();
    });

    it('returns default configuration when disabled', () => {
      const config = zeroRetention.getConfig();

      expect(config).toBeDefined();
      expect(config.enabled).toBe(false);
    });
  });

  describe('validate', () => {
    it('checks for conflicts', () => {
      const result = zeroRetention.validate();

      expect(result).toBeDefined();
      expect(result.valid).toBeDefined();
      expect(result.conflicts).toBeDefined();
      expect(Array.isArray(result.conflicts)).toBe(true);
    });

    it('warns about audit logging conflict', () => {
      // Enable with audit logging (which conflicts with zero-retention)
      zeroRetention.enable({ auditLogging: true });

      const result = zeroRetention.validate();

      expect(result.warnings).toBeDefined();
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(
        result.warnings.some((w) => w.toLowerCase().includes('audit'))
      ).toBe(true);
    });

    it('returns valid when no conflicts', () => {
      zeroRetention.enable();

      const result = zeroRetention.validate();

      expect(result.valid).toBe(true);
      expect(result.conflicts.length).toBe(0);
    });
  });

  describe('module-level functions', () => {
    it('enable function works', () => {
      const result = enable();
      expect(result.success).toBe(true);
      expect(isEnabled()).toBe(true);
      disable(); // cleanup
    });

    it('disable function works', () => {
      enable();
      const result = disable();
      expect(result.success).toBe(true);
      expect(isEnabled()).toBe(false);
    });

    it('isEnabled function works', () => {
      expect(isEnabled()).toBe(false);
      enable();
      expect(isEnabled()).toBe(true);
      disable();
    });

    it('getConfig function works', () => {
      enable();
      const config = getConfig();
      expect(config).toBeDefined();
      expect(config.enabled).toBe(true);
      disable();
    });

    it('validate function works', () => {
      const result = validate();
      expect(result).toBeDefined();
      expect(result.valid).toBeDefined();
    });
  });

  describe('integration with subsystems', () => {
    it('sets immediate retention policy on enable', () => {
      zeroRetention.enable();

      const config = zeroRetention.getConfig();
      expect(config.retentionPolicy.retention).toBe('immediate');
      expect(config.retentionPolicy.persist).toBe(false);
    });

    it('restores normal retention policy on disable', () => {
      zeroRetention.enable();
      zeroRetention.disable();

      const config = zeroRetention.getConfig();
      expect(config.retentionPolicy).toBeNull();
    });
  });
});
