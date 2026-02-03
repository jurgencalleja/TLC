import { describe, it, expect } from 'vitest';
import {
  detectEnvironment,
  getEnvironmentConfig,
  isLocalMode,
  isVpsMode,
  getApiBaseUrl,
  getWebSocketUrl,
} from './environment';

describe('environment', () => {
  // Note: Tests run in local mode by default (localhost in test environment)

  describe('detectEnvironment', () => {
    it('defaults to local in test environment', () => {
      // In test environment, hostname is localhost
      expect(detectEnvironment()).toBe('local');
    });

    it('returns a valid mode', () => {
      const mode = detectEnvironment();
      expect(['local', 'vps', 'staging', 'production']).toContain(mode);
    });
  });

  describe('getEnvironmentConfig', () => {
    it('returns config object with required properties', () => {
      const config = getEnvironmentConfig();

      expect(config).toHaveProperty('mode');
      expect(config).toHaveProperty('apiBaseUrl');
      expect(config).toHaveProperty('wsUrl');
      expect(config).toHaveProperty('features');
    });

    it('returns features object with all flags', () => {
      const config = getEnvironmentConfig();

      expect(config.features).toHaveProperty('teamPresence');
      expect(config.features).toHaveProperty('activityFeed');
      expect(config.features).toHaveProperty('realTimeUpdates');
      expect(config.features).toHaveProperty('notifications');
      expect(config.features).toHaveProperty('deployments');
    });

    it('disables team features in local mode', () => {
      // In test environment, mode is local
      const config = getEnvironmentConfig();

      if (config.mode === 'local') {
        expect(config.features.teamPresence).toBe(false);
        expect(config.features.activityFeed).toBe(false);
      }
    });
  });

  describe('isLocalMode', () => {
    it('returns boolean', () => {
      expect(typeof isLocalMode()).toBe('boolean');
    });

    it('returns true in test environment', () => {
      // Test environment runs on localhost
      expect(isLocalMode()).toBe(true);
    });
  });

  describe('isVpsMode', () => {
    it('returns boolean', () => {
      expect(typeof isVpsMode()).toBe('boolean');
    });

    it('returns false in test environment', () => {
      // Test environment runs on localhost (local mode)
      expect(isVpsMode()).toBe(false);
    });
  });

  describe('getApiBaseUrl', () => {
    it('returns a string', () => {
      expect(typeof getApiBaseUrl()).toBe('string');
    });

    it('returns localhost URL in local mode', () => {
      const url = getApiBaseUrl();
      // In local mode, should contain localhost
      expect(url).toContain('localhost');
    });

    it('includes /api path', () => {
      const url = getApiBaseUrl();
      expect(url).toContain('api');
    });
  });

  describe('getWebSocketUrl', () => {
    it('returns a string', () => {
      expect(typeof getWebSocketUrl()).toBe('string');
    });

    it('returns ws:// URL in local mode', () => {
      const url = getWebSocketUrl();
      // In local mode, should use ws:// protocol
      expect(url).toMatch(/^ws:\/\//);
    });

    it('includes localhost in local mode', () => {
      const url = getWebSocketUrl();
      expect(url).toContain('localhost');
    });
  });
});
