/**
 * Branch Classifier Tests
 */
import { describe, it, expect } from 'vitest';
import {
  classifyBranch,
  getBranchTier,
  isProtectedBranch,
  parsePatterns,
  createBranchClassifier,
  BRANCH_TIERS,
} from './branch-classifier.js';

describe('branch-classifier', () => {
  describe('BRANCH_TIERS', () => {
    it('defines all tier constants', () => {
      expect(BRANCH_TIERS.FEATURE).toBe('feature');
      expect(BRANCH_TIERS.DEV).toBe('dev');
      expect(BRANCH_TIERS.STABLE).toBe('stable');
      expect(BRANCH_TIERS.UNKNOWN).toBe('unknown');
    });
  });

  describe('classifyBranch', () => {
    it('classifies feature branches', () => {
      expect(classifyBranch('feature/add-login')).toBe('feature');
      expect(classifyBranch('feature/JIRA-123-fix')).toBe('feature');
      expect(classifyBranch('feat/new-api')).toBe('feature');
    });

    it('classifies dev branches', () => {
      expect(classifyBranch('dev')).toBe('dev');
      expect(classifyBranch('develop')).toBe('dev');
      expect(classifyBranch('development')).toBe('dev');
    });

    it('classifies stable branches', () => {
      expect(classifyBranch('main')).toBe('stable');
      expect(classifyBranch('master')).toBe('stable');
      expect(classifyBranch('stable')).toBe('stable');
      expect(classifyBranch('production')).toBe('stable');
      expect(classifyBranch('prod')).toBe('stable');
    });

    it('classifies release branches as stable', () => {
      expect(classifyBranch('release/1.0.0')).toBe('stable');
      expect(classifyBranch('release/v2.1.0')).toBe('stable');
    });

    it('classifies hotfix branches as stable', () => {
      expect(classifyBranch('hotfix/critical-bug')).toBe('stable');
      expect(classifyBranch('hotfix/security-patch')).toBe('stable');
    });

    it('classifies bugfix branches as feature', () => {
      expect(classifyBranch('bugfix/fix-login')).toBe('feature');
      expect(classifyBranch('fix/typo')).toBe('feature');
    });

    it('returns unknown for unrecognized patterns', () => {
      expect(classifyBranch('random-branch')).toBe('unknown');
      expect(classifyBranch('experiment')).toBe('unknown');
    });

    it('handles branches with slashes', () => {
      expect(classifyBranch('feature/user/settings')).toBe('feature');
      expect(classifyBranch('release/2024/q1')).toBe('stable');
    });
  });

  describe('getBranchTier with custom patterns', () => {
    const customPatterns = {
      feature: ['^feat/', '^feature/', '^task/'],
      dev: ['^dev$', '^staging$'],
      stable: ['^main$', '^production$'],
    };

    it('uses custom patterns when provided', () => {
      expect(getBranchTier('task/implement-auth', customPatterns)).toBe('feature');
      expect(getBranchTier('staging', customPatterns)).toBe('dev');
    });

    it('falls back to default for unmatched', () => {
      expect(getBranchTier('random', customPatterns)).toBe('unknown');
    });
  });

  describe('isProtectedBranch', () => {
    it('considers stable branches protected', () => {
      expect(isProtectedBranch('main')).toBe(true);
      expect(isProtectedBranch('master')).toBe(true);
      expect(isProtectedBranch('production')).toBe(true);
    });

    it('considers release branches protected', () => {
      expect(isProtectedBranch('release/1.0.0')).toBe(true);
    });

    it('does not protect feature branches', () => {
      expect(isProtectedBranch('feature/add-login')).toBe(false);
    });

    it('does not protect dev branches', () => {
      expect(isProtectedBranch('dev')).toBe(false);
      expect(isProtectedBranch('develop')).toBe(false);
    });

    it('accepts custom protected list', () => {
      const protectedBranches = ['main', 'staging'];
      expect(isProtectedBranch('staging', protectedBranches)).toBe(true);
      expect(isProtectedBranch('dev', protectedBranches)).toBe(false);
    });
  });

  describe('parsePatterns', () => {
    it('compiles string patterns to regex', () => {
      const patterns = parsePatterns(['^feature/', '^feat/']);
      expect(patterns[0].test('feature/test')).toBe(true);
      expect(patterns[1].test('feat/test')).toBe(true);
    });

    it('handles invalid regex gracefully', () => {
      const patterns = parsePatterns(['^valid', '[invalid']);
      expect(patterns.length).toBe(1);
    });

    it('returns empty array for empty input', () => {
      expect(parsePatterns([])).toEqual([]);
      expect(parsePatterns(null)).toEqual([]);
    });
  });

  describe('createBranchClassifier', () => {
    it('creates classifier with default config', () => {
      const classifier = createBranchClassifier();
      expect(classifier.classify('feature/test')).toBe('feature');
      expect(classifier.classify('main')).toBe('stable');
    });

    it('creates classifier with custom config', () => {
      const classifier = createBranchClassifier({
        patterns: {
          feature: ['^task/'],
          dev: ['^integration$'],
          stable: ['^live$'],
        },
      });
      expect(classifier.classify('task/new-feature')).toBe('feature');
      expect(classifier.classify('integration')).toBe('dev');
      expect(classifier.classify('live')).toBe('stable');
    });

    it('exposes isProtected method', () => {
      const classifier = createBranchClassifier();
      expect(classifier.isProtected('main')).toBe(true);
      expect(classifier.isProtected('feature/x')).toBe(false);
    });

    it('exposes getTier method', () => {
      const classifier = createBranchClassifier();
      expect(classifier.getTier('dev')).toBe('dev');
    });
  });
});
