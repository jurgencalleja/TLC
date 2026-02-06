import { describe, it, expect } from 'vitest';
import {
  parseTag,
  compareVersions,
  isValidTag,
  classifyTier,
} from './tag-classifier.js';

describe('tag-classifier', () => {
  describe('parseTag', () => {
    it('parses v1.0.0 as release tier', () => {
      const result = parseTag('v1.0.0');

      expect(result.valid).toBe(true);
      expect(result.version).toBe('1.0.0');
      expect(result.major).toBe(1);
      expect(result.minor).toBe(0);
      expect(result.patch).toBe(0);
      expect(result.prerelease).toBeNull();
      expect(result.tier).toBe('release');
    });

    it('parses v1.0.0-rc.1 as rc tier', () => {
      const result = parseTag('v1.0.0-rc.1');

      expect(result.valid).toBe(true);
      expect(result.version).toBe('1.0.0-rc.1');
      expect(result.major).toBe(1);
      expect(result.minor).toBe(0);
      expect(result.patch).toBe(0);
      expect(result.prerelease).toBe('rc.1');
      expect(result.tier).toBe('rc');
    });

    it('parses v1.0.0-beta.2 as beta tier', () => {
      const result = parseTag('v1.0.0-beta.2');

      expect(result.valid).toBe(true);
      expect(result.version).toBe('1.0.0-beta.2');
      expect(result.major).toBe(1);
      expect(result.minor).toBe(0);
      expect(result.patch).toBe(0);
      expect(result.prerelease).toBe('beta.2');
      expect(result.tier).toBe('beta');
    });

    it('parses v1.0.0-alpha.1 as alpha tier', () => {
      const result = parseTag('v1.0.0-alpha.1');

      expect(result.valid).toBe(true);
      expect(result.version).toBe('1.0.0-alpha.1');
      expect(result.major).toBe(1);
      expect(result.minor).toBe(0);
      expect(result.patch).toBe(0);
      expect(result.prerelease).toBe('alpha.1');
      expect(result.tier).toBe('alpha');
    });

    it('extracts all semver components from complex tag', () => {
      const result = parseTag('v2.13.7-rc.5');

      expect(result.valid).toBe(true);
      expect(result.major).toBe(2);
      expect(result.minor).toBe(13);
      expect(result.patch).toBe(7);
      expect(result.prerelease).toBe('rc.5');
      expect(result.tier).toBe('rc');
    });

    it('returns invalid result for tag without v prefix', () => {
      const result = parseTag('1.0.0');

      expect(result.valid).toBe(false);
      expect(result.tier).toBe('unknown');
    });

    it('returns invalid result for bare word tag', () => {
      const result = parseTag('foo');

      expect(result.valid).toBe(false);
      expect(result.tier).toBe('unknown');
    });

    it('returns invalid result for partial version v1', () => {
      const result = parseTag('v1');

      expect(result.valid).toBe(false);
      expect(result.tier).toBe('unknown');
    });

    it('returns invalid result for two-part version v1.0', () => {
      const result = parseTag('v1.0');

      expect(result.valid).toBe(false);
      expect(result.tier).toBe('unknown');
    });

    it('returns invalid result for empty string', () => {
      const result = parseTag('');

      expect(result.valid).toBe(false);
      expect(result.tier).toBe('unknown');
    });

    it('returns invalid result for null input', () => {
      const result = parseTag(null);

      expect(result.valid).toBe(false);
      expect(result.tier).toBe('unknown');
    });

    it('handles large version numbers', () => {
      const result = parseTag('v100.200.300');

      expect(result.valid).toBe(true);
      expect(result.major).toBe(100);
      expect(result.minor).toBe(200);
      expect(result.patch).toBe(300);
      expect(result.tier).toBe('release');
    });
  });

  describe('isValidTag', () => {
    it('returns true for valid release tag', () => {
      expect(isValidTag('v1.0.0')).toBe(true);
    });

    it('returns true for valid rc tag', () => {
      expect(isValidTag('v1.0.0-rc.1')).toBe(true);
    });

    it('returns true for valid beta tag', () => {
      expect(isValidTag('v2.3.4-beta.10')).toBe(true);
    });

    it('returns true for valid alpha tag', () => {
      expect(isValidTag('v0.1.0-alpha.3')).toBe(true);
    });

    it('returns false for missing v prefix', () => {
      expect(isValidTag('1.0.0')).toBe(false);
    });

    it('returns false for malformed tag', () => {
      expect(isValidTag('foo')).toBe(false);
    });

    it('returns false for partial version', () => {
      expect(isValidTag('v1')).toBe(false);
    });

    it('returns false for null', () => {
      expect(isValidTag(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isValidTag(undefined)).toBe(false);
    });
  });

  describe('classifyTier', () => {
    it('classifies release tag as release', () => {
      expect(classifyTier('v1.0.0')).toBe('release');
    });

    it('classifies rc tag as rc (QA review required)', () => {
      expect(classifyTier('v1.0.0-rc.1')).toBe('rc');
    });

    it('classifies beta tag as beta (internal)', () => {
      expect(classifyTier('v1.0.0-beta.2')).toBe('beta');
    });

    it('classifies alpha tag as alpha', () => {
      expect(classifyTier('v1.0.0-alpha.1')).toBe('alpha');
    });

    it('returns unknown for invalid tag', () => {
      expect(classifyTier('foo')).toBe('unknown');
    });

    it('returns unknown for missing v prefix', () => {
      expect(classifyTier('1.0.0')).toBe('unknown');
    });
  });

  describe('compareVersions', () => {
    it('returns 0 for identical versions', () => {
      expect(compareVersions('v1.0.0', 'v1.0.0')).toBe(0);
    });

    it('orders by major version', () => {
      expect(compareVersions('v2.0.0', 'v1.0.0')).toBe(1);
      expect(compareVersions('v1.0.0', 'v2.0.0')).toBe(-1);
    });

    it('orders by minor version when major is equal', () => {
      expect(compareVersions('v1.2.0', 'v1.1.0')).toBe(1);
      expect(compareVersions('v1.1.0', 'v1.2.0')).toBe(-1);
    });

    it('orders by patch version when major and minor are equal', () => {
      expect(compareVersions('v1.0.2', 'v1.0.1')).toBe(1);
      expect(compareVersions('v1.0.1', 'v1.0.2')).toBe(-1);
    });

    it('ranks release higher than rc with same base version', () => {
      expect(compareVersions('v1.0.0', 'v1.0.0-rc.1')).toBe(1);
      expect(compareVersions('v1.0.0-rc.1', 'v1.0.0')).toBe(-1);
    });

    it('ranks rc higher than beta with same base version', () => {
      expect(compareVersions('v1.0.0-rc.1', 'v1.0.0-beta.1')).toBe(1);
      expect(compareVersions('v1.0.0-beta.1', 'v1.0.0-rc.1')).toBe(-1);
    });

    it('ranks beta higher than alpha with same base version', () => {
      expect(compareVersions('v1.0.0-beta.1', 'v1.0.0-alpha.1')).toBe(1);
      expect(compareVersions('v1.0.0-alpha.1', 'v1.0.0-beta.1')).toBe(-1);
    });

    it('compares prerelease numbers within same tier', () => {
      expect(compareVersions('v1.1.0-rc.2', 'v1.1.0-rc.1')).toBe(1);
      expect(compareVersions('v1.1.0-rc.1', 'v1.1.0-rc.2')).toBe(-1);
    });

    it('returns 0 for identical prerelease versions', () => {
      expect(compareVersions('v1.0.0-beta.3', 'v1.0.0-beta.3')).toBe(0);
    });

    it('returns 0 for two invalid tags', () => {
      expect(compareVersions('foo', 'bar')).toBe(0);
    });

    it('ranks valid tag higher than invalid tag', () => {
      expect(compareVersions('v1.0.0', 'foo')).toBe(1);
      expect(compareVersions('foo', 'v1.0.0')).toBe(-1);
    });
  });
});
