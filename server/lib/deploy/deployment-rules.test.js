/**
 * Deployment Rules Tests
 */
import { describe, it, expect } from 'vitest';
import {
  loadDeploymentRules,
  validateRules,
  getRulesForTier,
  mergeWithDefaults,
  DEFAULT_RULES,
  createDeploymentRules,
} from './deployment-rules.js';

describe('deployment-rules', () => {
  describe('DEFAULT_RULES', () => {
    it('defines rules for all tiers', () => {
      expect(DEFAULT_RULES.feature).toBeDefined();
      expect(DEFAULT_RULES.dev).toBeDefined();
      expect(DEFAULT_RULES.stable).toBeDefined();
    });

    it('feature tier auto-deploys with basic checks', () => {
      expect(DEFAULT_RULES.feature.autoDeploy).toBe(true);
      expect(DEFAULT_RULES.feature.securityGates).toContain('sast');
      expect(DEFAULT_RULES.feature.securityGates).toContain('dependencies');
    });

    it('dev tier auto-deploys with full checks', () => {
      expect(DEFAULT_RULES.dev.autoDeploy).toBe(true);
      expect(DEFAULT_RULES.dev.securityGates).toContain('sast');
      expect(DEFAULT_RULES.dev.securityGates).toContain('dast');
      expect(DEFAULT_RULES.dev.securityGates).toContain('container');
    });

    it('stable tier requires approval', () => {
      expect(DEFAULT_RULES.stable.autoDeploy).toBe(false);
      expect(DEFAULT_RULES.stable.requiresApproval).toBe(true);
      expect(DEFAULT_RULES.stable.requires2FA).toBe(true);
    });
  });

  describe('loadDeploymentRules', () => {
    it('loads rules from config object', () => {
      const config = {
        deployment: {
          rules: {
            feature: { autoDeploy: false },
          },
        },
      };
      const rules = loadDeploymentRules(config);
      expect(rules.feature.autoDeploy).toBe(false);
    });

    it('returns defaults when no config', () => {
      const rules = loadDeploymentRules({});
      expect(rules).toEqual(DEFAULT_RULES);
    });

    it('returns defaults for null config', () => {
      const rules = loadDeploymentRules(null);
      expect(rules).toEqual(DEFAULT_RULES);
    });
  });

  describe('validateRules', () => {
    it('validates correct rule structure', () => {
      const rules = {
        feature: {
          autoDeploy: true,
          securityGates: ['sast'],
          deploymentStrategy: 'rolling',
        },
      };
      const result = validateRules(rules);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects invalid autoDeploy type', () => {
      const rules = {
        feature: { autoDeploy: 'yes' },
      };
      const result = validateRules(rules);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('autoDeploy'))).toBe(true);
    });

    it('rejects invalid security gates', () => {
      const rules = {
        feature: { securityGates: 'sast' },
      };
      const result = validateRules(rules);
      expect(result.valid).toBe(false);
    });

    it('rejects unknown deployment strategy', () => {
      const rules = {
        feature: { deploymentStrategy: 'teleport' },
      };
      const result = validateRules(rules);
      expect(result.valid).toBe(false);
    });

    it('allows valid deployment strategies', () => {
      const strategies = ['rolling', 'blue-green', 'canary', 'recreate'];
      for (const strategy of strategies) {
        const rules = { feature: { deploymentStrategy: strategy } };
        const result = validateRules(rules);
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('getRulesForTier', () => {
    it('returns rules for specified tier', () => {
      const rules = getRulesForTier('stable');
      expect(rules.requiresApproval).toBe(true);
    });

    it('returns feature rules for unknown tier', () => {
      const rules = getRulesForTier('unknown');
      expect(rules).toEqual(DEFAULT_RULES.feature);
    });

    it('accepts custom rules', () => {
      const customRules = {
        dev: { autoDeploy: false },
      };
      const rules = getRulesForTier('dev', customRules);
      expect(rules.autoDeploy).toBe(false);
    });
  });

  describe('mergeWithDefaults', () => {
    it('merges custom rules with defaults', () => {
      const custom = {
        feature: { autoDeploy: false },
      };
      const merged = mergeWithDefaults(custom);
      expect(merged.feature.autoDeploy).toBe(false);
      expect(merged.feature.securityGates).toEqual(DEFAULT_RULES.feature.securityGates);
      expect(merged.dev).toEqual(DEFAULT_RULES.dev);
    });

    it('preserves nested arrays', () => {
      const custom = {
        dev: { securityGates: ['sast'] },
      };
      const merged = mergeWithDefaults(custom);
      expect(merged.dev.securityGates).toEqual(['sast']);
    });

    it('handles empty custom rules', () => {
      const merged = mergeWithDefaults({});
      expect(merged).toEqual(DEFAULT_RULES);
    });
  });

  describe('createDeploymentRules', () => {
    it('creates rules manager', () => {
      const manager = createDeploymentRules();
      expect(manager.getRules).toBeDefined();
      expect(manager.validate).toBeDefined();
      expect(manager.getForTier).toBeDefined();
    });

    it('loads rules on creation', () => {
      const config = {
        deployment: {
          rules: {
            feature: { autoDeploy: false },
          },
        },
      };
      const manager = createDeploymentRules(config);
      expect(manager.getForTier('feature').autoDeploy).toBe(false);
    });

    it('exposes all rules', () => {
      const manager = createDeploymentRules();
      const rules = manager.getRules();
      expect(rules.feature).toBeDefined();
      expect(rules.dev).toBeDefined();
      expect(rules.stable).toBeDefined();
    });
  });
});
