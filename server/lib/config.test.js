import { describe, it, expect } from 'vitest';
import {
  parseConfig,
  getDefaultConfig,
  validateConfig,
  mergeWithDefaults,
} from './config.js';

describe('config', () => {
  describe('getDefaultConfig', () => {
    it('returns default config structure', () => {
      const config = getDefaultConfig();

      expect(config).toHaveProperty('testFrameworks');
      expect(config).toHaveProperty('quality');
      expect(config).toHaveProperty('autofix');
      expect(config).toHaveProperty('edgeCases');
    });

    it('has quality defaults', () => {
      const config = getDefaultConfig();

      expect(config.quality.coverageThreshold).toBe(80);
      expect(config.quality.runMutationTests).toBe(false);
    });

    it('has autofix defaults', () => {
      const config = getDefaultConfig();

      expect(config.autofix.maxAttempts).toBe(5);
      expect(config.autofix.strategies).toContain('null-check');
    });

    it('has edge case defaults', () => {
      const config = getDefaultConfig();

      expect(config.edgeCases.patterns).toContain('null-check');
      expect(config.edgeCases.patterns).toContain('security');
      expect(config.edgeCases.maxPerFunction).toBe(20);
    });
  });

  describe('parseConfig', () => {
    it('parses valid JSON config', () => {
      const json = JSON.stringify({
        testFrameworks: { primary: 'vitest' },
        quality: { coverageThreshold: 90 },
      });

      const config = parseConfig(json);

      expect(config.testFrameworks.primary).toBe('vitest');
      expect(config.quality.coverageThreshold).toBe(90);
    });

    it('returns null for invalid JSON', () => {
      const invalid = 'not valid json {';

      const config = parseConfig(invalid);

      expect(config).toBeNull();
    });

    it('returns null for empty string', () => {
      const config = parseConfig('');

      expect(config).toBeNull();
    });
  });

  describe('validateConfig', () => {
    it('accepts valid config', () => {
      const config = {
        testFrameworks: { primary: 'mocha' },
        quality: { coverageThreshold: 80 },
        autofix: { maxAttempts: 5 },
      };

      const result = validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects invalid coverage threshold', () => {
      const config = {
        quality: { coverageThreshold: 150 },
      };

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('coverageThreshold'))).toBe(true);
    });

    it('rejects negative maxAttempts', () => {
      const config = {
        autofix: { maxAttempts: -1 },
      };

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('maxAttempts'))).toBe(true);
    });

    it('accepts empty config (uses defaults)', () => {
      const config = {};

      const result = validateConfig(config);

      expect(result.valid).toBe(true);
    });
  });

  describe('mergeWithDefaults', () => {
    it('fills in missing values with defaults', () => {
      const partial = {
        quality: { coverageThreshold: 90 },
      };

      const merged = mergeWithDefaults(partial);

      expect(merged.quality.coverageThreshold).toBe(90);  // Overridden
      expect(merged.quality.runMutationTests).toBe(false);  // Default
      expect(merged.autofix.maxAttempts).toBe(5);  // Default
    });

    it('preserves all user-specified values', () => {
      const userConfig = {
        testFrameworks: { primary: 'jest' },
        quality: { coverageThreshold: 70, runMutationTests: true },
        autofix: { maxAttempts: 10, strategies: ['null-check'] },
        edgeCases: { patterns: ['security'], maxPerFunction: 10 },
      };

      const merged = mergeWithDefaults(userConfig);

      expect(merged.testFrameworks.primary).toBe('jest');
      expect(merged.quality.coverageThreshold).toBe(70);
      expect(merged.quality.runMutationTests).toBe(true);
      expect(merged.autofix.maxAttempts).toBe(10);
      expect(merged.autofix.strategies).toEqual(['null-check']);
      expect(merged.edgeCases.patterns).toEqual(['security']);
      expect(merged.edgeCases.maxPerFunction).toBe(10);
    });

    it('handles null input by returning defaults', () => {
      const merged = mergeWithDefaults(null);

      expect(merged).toEqual(getDefaultConfig());
    });
  });
});
