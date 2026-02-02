import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getPolicy,
  evaluateRetention,
  loadPolicies,
  mergeWithDefaults,
  DEFAULT_POLICIES,
  SENSITIVITY_LEVELS,
  DATA_TYPES,
} from './retention-policy.js';

describe('retention-policy', () => {
  describe('getPolicy', () => {
    describe('sensitivity level policies', () => {
      it('returns policy for critical sensitivity level', () => {
        const policy = getPolicy({ sensitivityLevel: 'critical' });

        expect(policy).toEqual({
          retention: 'immediate',
          persist: false,
        });
      });

      it('returns policy for high sensitivity level', () => {
        const policy = getPolicy({ sensitivityLevel: 'high' });

        expect(policy).toEqual({
          retention: 'session',
          persist: false,
        });
      });

      it('returns policy for medium sensitivity level', () => {
        const policy = getPolicy({ sensitivityLevel: 'medium' });

        expect(policy).toEqual({
          retention: '24h',
          persist: true,
        });
      });

      it('returns policy for low sensitivity level', () => {
        const policy = getPolicy({ sensitivityLevel: 'low' });

        expect(policy).toEqual({
          retention: '7d',
          persist: true,
        });
      });
    });

    describe('data type policies', () => {
      it('returns policy for secrets data type', () => {
        const policy = getPolicy({ dataType: 'secrets' });

        expect(policy).toEqual({
          retention: 'immediate',
          persist: false,
        });
      });

      it('returns policy for pii data type', () => {
        const policy = getPolicy({ dataType: 'pii' });

        expect(policy).toEqual({
          retention: 'session',
          persist: false,
        });
      });

      it('returns policy for general data type', () => {
        const policy = getPolicy({ dataType: 'general' });

        expect(policy).toEqual({
          retention: '7d',
          persist: true,
        });
      });
    });

    describe('default policy', () => {
      it('returns default when no match for sensitivity level', () => {
        const policy = getPolicy({ sensitivityLevel: 'unknown' });

        expect(policy).toEqual({
          retention: '7d',
          persist: true,
        });
      });

      it('returns default when no match for data type', () => {
        const policy = getPolicy({ dataType: 'unknown' });

        expect(policy).toEqual({
          retention: '7d',
          persist: true,
        });
      });

      it('returns default when empty options', () => {
        const policy = getPolicy({});

        expect(policy).toEqual({
          retention: '7d',
          persist: true,
        });
      });

      it('returns default when no options provided', () => {
        const policy = getPolicy();

        expect(policy).toEqual({
          retention: '7d',
          persist: true,
        });
      });
    });

    describe('priority handling', () => {
      it('prioritizes sensitivity level over data type', () => {
        const policy = getPolicy({
          sensitivityLevel: 'critical',
          dataType: 'general'
        });

        expect(policy.retention).toBe('immediate');
      });

      it('uses custom policies when provided', () => {
        const customPolicies = {
          sensitivityLevels: {
            critical: { retention: '1h', persist: true },
          },
        };

        const policy = getPolicy(
          { sensitivityLevel: 'critical' },
          customPolicies
        );

        expect(policy).toEqual({
          retention: '1h',
          persist: true,
        });
      });
    });
  });

  describe('evaluateRetention', () => {
    let mockDate;

    beforeEach(() => {
      mockDate = new Date('2024-06-15T12:00:00Z');
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe('time-based retention', () => {
      it('returns purge for expired data with hours-based policy', () => {
        const data = {
          createdAt: new Date('2024-06-14T12:00:00Z').toISOString(), // 24h ago
        };
        const policy = { retention: '12h', persist: true };

        const result = evaluateRetention(data, policy);

        expect(result).toBe('purge');
      });

      it('returns keep for valid data with hours-based policy', () => {
        const data = {
          createdAt: new Date('2024-06-15T06:00:00Z').toISOString(), // 6h ago
        };
        const policy = { retention: '12h', persist: true };

        const result = evaluateRetention(data, policy);

        expect(result).toBe('keep');
      });

      it('returns purge for expired data with days-based policy', () => {
        const data = {
          createdAt: new Date('2024-06-01T12:00:00Z').toISOString(), // 14 days ago
        };
        const policy = { retention: '7d', persist: true };

        const result = evaluateRetention(data, policy);

        expect(result).toBe('purge');
      });

      it('returns keep for valid data with days-based policy', () => {
        const data = {
          createdAt: new Date('2024-06-10T12:00:00Z').toISOString(), // 5 days ago
        };
        const policy = { retention: '7d', persist: true };

        const result = evaluateRetention(data, policy);

        expect(result).toBe('keep');
      });
    });

    describe('immediate purge policy', () => {
      it('returns purge for immediate retention policy', () => {
        const data = {
          createdAt: new Date().toISOString(),
        };
        const policy = { retention: 'immediate', persist: false };

        const result = evaluateRetention(data, policy);

        expect(result).toBe('purge');
      });
    });

    describe('session-based policies', () => {
      it('returns keep for data with matching sessionId', () => {
        const data = {
          createdAt: new Date().toISOString(),
          sessionId: 'session-123',
        };
        const policy = { retention: 'session', persist: false };
        const context = { currentSessionId: 'session-123' };

        const result = evaluateRetention(data, policy, context);

        expect(result).toBe('keep');
      });

      it('returns purge for data with different sessionId', () => {
        const data = {
          createdAt: new Date().toISOString(),
          sessionId: 'session-123',
        };
        const policy = { retention: 'session', persist: false };
        const context = { currentSessionId: 'session-456' };

        const result = evaluateRetention(data, policy, context);

        expect(result).toBe('purge');
      });

      it('returns purge for session policy when no session context', () => {
        const data = {
          createdAt: new Date().toISOString(),
          sessionId: 'session-123',
        };
        const policy = { retention: 'session', persist: false };

        const result = evaluateRetention(data, policy);

        expect(result).toBe('purge');
      });

      it('returns keep for session policy when data has no sessionId but context matches', () => {
        const data = {
          createdAt: new Date().toISOString(),
        };
        const policy = { retention: 'session', persist: false };
        const context = { currentSessionId: 'session-123' };

        // Data without sessionId is considered current session
        const result = evaluateRetention(data, policy, context);

        expect(result).toBe('keep');
      });
    });

    describe('edge cases', () => {
      it('returns keep when data has no createdAt for time-based policy', () => {
        const data = {};
        const policy = { retention: '24h', persist: true };

        const result = evaluateRetention(data, policy);

        expect(result).toBe('keep');
      });

      it('returns purge for null data', () => {
        const policy = { retention: '24h', persist: true };

        const result = evaluateRetention(null, policy);

        expect(result).toBe('purge');
      });

      it('returns keep for null policy', () => {
        const data = { createdAt: new Date().toISOString() };

        const result = evaluateRetention(data, null);

        expect(result).toBe('keep');
      });
    });
  });

  describe('loadPolicies', () => {
    let mockFs;

    beforeEach(() => {
      mockFs = {
        existsSync: vi.fn(),
        readFileSync: vi.fn(),
      };
    });

    it('reads policies from config file', () => {
      const configContent = JSON.stringify({
        retention: {
          policies: {
            sensitivityLevels: {
              critical: { retention: '1h', persist: false },
            },
          },
        },
      });

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(configContent);

      const policies = loadPolicies('/project', mockFs);

      expect(mockFs.existsSync).toHaveBeenCalledWith('/project/.tlc.json');
      expect(policies.sensitivityLevels.critical).toEqual({
        retention: '1h',
        persist: false,
      });
    });

    it('uses defaults when no config file exists', () => {
      mockFs.existsSync.mockReturnValue(false);

      const policies = loadPolicies('/project', mockFs);

      expect(policies).toEqual(DEFAULT_POLICIES);
    });

    it('uses defaults when config has no retention section', () => {
      const configContent = JSON.stringify({
        project: 'test',
      });

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(configContent);

      const policies = loadPolicies('/project', mockFs);

      expect(policies).toEqual(DEFAULT_POLICIES);
    });

    it('handles invalid JSON gracefully', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('not valid json');

      const policies = loadPolicies('/project', mockFs);

      expect(policies).toEqual(DEFAULT_POLICIES);
    });

    it('uses real fs when no mock provided', () => {
      // This just tests the function signature accepts undefined fs
      // The actual fs call would fail but we're testing the interface
      const policies = loadPolicies('/nonexistent/path');

      expect(policies).toEqual(DEFAULT_POLICIES);
    });
  });

  describe('mergeWithDefaults', () => {
    it('combines user and default policies for sensitivity levels', () => {
      const userPolicies = {
        sensitivityLevels: {
          critical: { retention: '1h', persist: true },
        },
      };

      const merged = mergeWithDefaults(userPolicies);

      // User override
      expect(merged.sensitivityLevels.critical).toEqual({
        retention: '1h',
        persist: true,
      });
      // Defaults preserved
      expect(merged.sensitivityLevels.high).toEqual(
        DEFAULT_POLICIES.sensitivityLevels.high
      );
      expect(merged.sensitivityLevels.medium).toEqual(
        DEFAULT_POLICIES.sensitivityLevels.medium
      );
      expect(merged.sensitivityLevels.low).toEqual(
        DEFAULT_POLICIES.sensitivityLevels.low
      );
    });

    it('combines user and default policies for data types', () => {
      const userPolicies = {
        dataTypes: {
          secrets: { retention: '1h', persist: true },
        },
      };

      const merged = mergeWithDefaults(userPolicies);

      // User override
      expect(merged.dataTypes.secrets).toEqual({
        retention: '1h',
        persist: true,
      });
      // Defaults preserved
      expect(merged.dataTypes.pii).toEqual(
        DEFAULT_POLICIES.dataTypes.pii
      );
      expect(merged.dataTypes.general).toEqual(
        DEFAULT_POLICIES.dataTypes.general
      );
    });

    it('returns defaults when user policies is null', () => {
      const merged = mergeWithDefaults(null);

      expect(merged).toEqual(DEFAULT_POLICIES);
    });

    it('returns defaults when user policies is empty object', () => {
      const merged = mergeWithDefaults({});

      expect(merged).toEqual(DEFAULT_POLICIES);
    });

    it('preserves both sensitivity levels and data types from user', () => {
      const userPolicies = {
        sensitivityLevels: {
          critical: { retention: '2h', persist: false },
        },
        dataTypes: {
          secrets: { retention: '30m', persist: false },
        },
      };

      const merged = mergeWithDefaults(userPolicies);

      expect(merged.sensitivityLevels.critical.retention).toBe('2h');
      expect(merged.dataTypes.secrets.retention).toBe('30m');
    });
  });

  describe('constants', () => {
    it('exports DEFAULT_POLICIES with correct structure', () => {
      expect(DEFAULT_POLICIES).toHaveProperty('sensitivityLevels');
      expect(DEFAULT_POLICIES).toHaveProperty('dataTypes');
      expect(DEFAULT_POLICIES).toHaveProperty('default');

      expect(DEFAULT_POLICIES.sensitivityLevels).toHaveProperty('critical');
      expect(DEFAULT_POLICIES.sensitivityLevels).toHaveProperty('high');
      expect(DEFAULT_POLICIES.sensitivityLevels).toHaveProperty('medium');
      expect(DEFAULT_POLICIES.sensitivityLevels).toHaveProperty('low');

      expect(DEFAULT_POLICIES.dataTypes).toHaveProperty('secrets');
      expect(DEFAULT_POLICIES.dataTypes).toHaveProperty('pii');
      expect(DEFAULT_POLICIES.dataTypes).toHaveProperty('general');
    });

    it('exports SENSITIVITY_LEVELS constants', () => {
      expect(SENSITIVITY_LEVELS).toEqual({
        CRITICAL: 'critical',
        HIGH: 'high',
        MEDIUM: 'medium',
        LOW: 'low',
      });
    });

    it('exports DATA_TYPES constants', () => {
      expect(DATA_TYPES).toEqual({
        SECRETS: 'secrets',
        PII: 'pii',
        GENERAL: 'general',
      });
    });
  });
});
