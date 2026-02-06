import { describe, it, expect } from 'vitest';
import {
  loadReleaseConfig,
  getGatesForTier,
  getPreviewUrl,
  validateReleaseConfig,
  DEFAULT_RELEASE_CONFIG,
} from './release-config.js';

describe('Release Config', () => {
  describe('loadReleaseConfig', () => {
    it('loads valid release config from object', () => {
      const input = {
        release: {
          tagPattern: 'v*',
          previewUrlTemplate: 'qa-{tag}.example.com',
          tiers: {
            rc: {
              gates: ['tests', 'security', 'coverage', 'qa-approval'],
              coverageThreshold: 80,
              autoPromote: false,
            },
          },
          notifications: {
            onDeploy: ['slack'],
          },
        },
      };
      const config = loadReleaseConfig(input);
      expect(config.tagPattern).toBe('v*');
      expect(config.previewUrlTemplate).toBe('qa-{tag}.example.com');
      expect(config.tiers.rc.gates).toEqual(['tests', 'security', 'coverage', 'qa-approval']);
      expect(config.notifications.onDeploy).toEqual(['slack']);
    });

    it('applies defaults for missing fields', () => {
      const config = loadReleaseConfig({});
      expect(config.tagPattern).toBe('v*');
      expect(config.previewUrlTemplate).toBe('qa-{tag}.{domain}');
      expect(config.tiers).toBeDefined();
      expect(config.tiers.rc).toBeDefined();
      expect(config.tiers.beta).toBeDefined();
      expect(config.tiers.release).toBeDefined();
      expect(config.notifications).toBeDefined();
    });

    it('handles empty/missing release section gracefully', () => {
      expect(() => loadReleaseConfig({})).not.toThrow();
      expect(() => loadReleaseConfig(null)).not.toThrow();
      expect(() => loadReleaseConfig(undefined)).not.toThrow();
      expect(() => loadReleaseConfig({ release: null })).not.toThrow();

      const config = loadReleaseConfig(null);
      expect(config.tagPattern).toBe('v*');
      expect(config.tiers.rc.gates).toBeDefined();
    });

    it('merges release config with existing config without clobbering other fields', () => {
      const input = {
        project: 'TLC',
        version: '1.0.0',
        release: {
          tagPattern: 'release-*',
        },
      };
      const config = loadReleaseConfig(input);
      // loadReleaseConfig returns only the release section
      expect(config.tagPattern).toBe('release-*');
      // defaults still applied for missing tiers
      expect(config.tiers.rc).toBeDefined();
      expect(config.tiers.beta).toBeDefined();
    });

    it('config is immutable (returns copy, not reference)', () => {
      const input = {
        release: {
          tagPattern: 'v*',
          tiers: {
            rc: {
              gates: ['tests', 'security'],
              coverageThreshold: 90,
            },
          },
        },
      };
      const config1 = loadReleaseConfig(input);
      const config2 = loadReleaseConfig(input);
      config1.tiers.rc.gates.push('qa-approval');
      config1.tiers.rc.coverageThreshold = 50;
      // config2 should be unaffected
      expect(config2.tiers.rc.gates).not.toContain('qa-approval');
      expect(config2.tiers.rc.coverageThreshold).toBe(90);
    });
  });

  describe('validateReleaseConfig', () => {
    it('rejects unknown gate names (only: tests, security, coverage, qa-approval)', () => {
      const config = loadReleaseConfig({
        release: {
          tiers: {
            rc: { gates: ['tests', 'unknown-gate'] },
          },
        },
      });
      const result = validateReleaseConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('unknown-gate'))).toBe(true);
    });

    it('validates URL templates contain {tag} placeholder', () => {
      const config = loadReleaseConfig({
        release: {
          previewUrlTemplate: 'qa.example.com',
        },
      });
      const result = validateReleaseConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('{tag}'))).toBe(true);
    });

    it('validates notification channel names', () => {
      const config = loadReleaseConfig({
        release: {
          notifications: {
            onDeploy: [''],
            onAccept: [123],
          },
        },
      });
      const result = validateReleaseConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('notification'))).toBe(true);
    });

    it('validates tagPattern is valid glob', () => {
      const config = loadReleaseConfig({
        release: {
          tagPattern: '',
        },
      });
      const result = validateReleaseConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('tagPattern'))).toBe(true);
    });

    it('returns valid for correct default config', () => {
      const config = loadReleaseConfig({});
      const result = validateReleaseConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('getGatesForTier', () => {
    it('returns tier-specific gate list', () => {
      const config = loadReleaseConfig({});
      const rcGates = getGatesForTier(config, 'rc');
      expect(rcGates).toEqual(['tests', 'security', 'coverage', 'qa-approval']);
    });

    it('default gates: rc requires all 4 gates', () => {
      const config = loadReleaseConfig({});
      const gates = getGatesForTier(config, 'rc');
      expect(gates).toContain('tests');
      expect(gates).toContain('security');
      expect(gates).toContain('coverage');
      expect(gates).toContain('qa-approval');
      expect(gates).toHaveLength(4);
    });

    it('default gates: beta requires tests+security', () => {
      const config = loadReleaseConfig({});
      const gates = getGatesForTier(config, 'beta');
      expect(gates).toEqual(['tests', 'security']);
    });

    it('default gates: release requires tests+security+coverage', () => {
      const config = loadReleaseConfig({});
      const gates = getGatesForTier(config, 'release');
      expect(gates).toEqual(['tests', 'security', 'coverage']);
    });

    it('returns empty array for unknown tier', () => {
      const config = loadReleaseConfig({});
      const gates = getGatesForTier(config, 'nonexistent');
      expect(gates).toEqual([]);
    });
  });

  describe('getPreviewUrl', () => {
    it('returns preview URL template with defaults', () => {
      const config = loadReleaseConfig({});
      const url = getPreviewUrl(config, 'v1.0.0', 'example.com');
      expect(url).toBe('qa-v1.0.0.example.com');
    });

    it('uses custom template', () => {
      const config = loadReleaseConfig({
        release: { previewUrlTemplate: 'preview-{tag}.{domain}/app' },
      });
      const url = getPreviewUrl(config, 'v2.0.0-rc.1', 'myapp.io');
      expect(url).toBe('preview-v2.0.0-rc.1.myapp.io/app');
    });
  });

  describe('DEFAULT_RELEASE_CONFIG', () => {
    it('default coverage threshold: 80 for rc', () => {
      expect(DEFAULT_RELEASE_CONFIG.tiers.rc.coverageThreshold).toBe(80);
    });

    it('default coverage threshold: 70 for beta', () => {
      expect(DEFAULT_RELEASE_CONFIG.tiers.beta.coverageThreshold).toBe(70);
    });

    it('default coverage threshold: 80 for release', () => {
      expect(DEFAULT_RELEASE_CONFIG.tiers.release.coverageThreshold).toBe(80);
    });

    it('has expected structure', () => {
      expect(DEFAULT_RELEASE_CONFIG.tagPattern).toBe('v*');
      expect(DEFAULT_RELEASE_CONFIG.previewUrlTemplate).toBe('qa-{tag}.{domain}');
      expect(DEFAULT_RELEASE_CONFIG.tiers).toBeDefined();
      expect(DEFAULT_RELEASE_CONFIG.notifications).toBeDefined();
    });
  });
});
