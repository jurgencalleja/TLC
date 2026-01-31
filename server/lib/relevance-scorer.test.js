import { describe, it, expect } from 'vitest';
import { scoreRelevance, combineScores } from './relevance-scorer.js';

describe('relevance-scorer', () => {
  describe('scoreRelevance', () => {
    it('scores file-related memory higher', () => {
      const memory = {
        subject: 'auth service',
        files: ['src/auth/'],
      };
      const context = {
        touchedFiles: ['src/auth/login.ts'],
      };

      const score = scoreRelevance(memory, context);
      expect(score).toBeGreaterThan(0.3); // File match contributes 0.3 weight
    });

    it('scores recent memory higher than old', () => {
      const recent = { timestamp: Date.now() - 3600000 }; // 1 hour ago
      const old = { timestamp: Date.now() - 86400000 * 30 }; // 30 days ago

      const recentScore = scoreRelevance(recent, {});
      const oldScore = scoreRelevance(old, {});

      expect(recentScore).toBeGreaterThan(oldScore);
    });

    it('scores branch-related memory higher', () => {
      const memory = { branch: 'feature/auth' };
      const context = { currentBranch: 'feature/auth' };

      const score = scoreRelevance(memory, context);
      expect(score).toBeGreaterThan(0.25); // Branch match contributes 0.25 weight
    });

    it('scores keyword matches', () => {
      const memory = { content: 'payment stripe webhook' };
      const context = { currentTask: 'implement payment webhooks' };

      const score = scoreRelevance(memory, context);
      expect(score).toBeGreaterThan(0.1); // Keyword match contributes 0.2 weight
    });

    it('returns base score for empty context', () => {
      const memory = { title: 'Some decision' };
      const score = scoreRelevance(memory, {});

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('returns 0 for empty memory', () => {
      const score = scoreRelevance({}, { touchedFiles: ['test.js'] });
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('handles undefined inputs', () => {
      expect(scoreRelevance(undefined, undefined)).toBe(0);
      expect(scoreRelevance(null, null)).toBe(0);
    });

    it('combines multiple relevance factors', () => {
      const memory = {
        branch: 'feature/auth',
        files: ['src/auth/'],
        content: 'authentication login',
        timestamp: Date.now() - 3600000,
      };
      const context = {
        currentBranch: 'feature/auth',
        touchedFiles: ['src/auth/login.ts'],
        currentTask: 'fix login bug',
      };

      const score = scoreRelevance(memory, context);
      // Should be high because multiple factors match
      expect(score).toBeGreaterThan(0.6);
    });
  });

  describe('combineScores', () => {
    it('combines weighted scores', () => {
      const scores = [
        { value: 1.0, weight: 0.5 },
        { value: 0.5, weight: 0.5 },
      ];

      const combined = combineScores(scores);
      expect(combined).toBe(0.75);
    });

    it('returns 0 for empty scores', () => {
      expect(combineScores([])).toBe(0);
    });

    it('caps at 1.0', () => {
      const scores = [
        { value: 1.0, weight: 1.0 },
        { value: 1.0, weight: 1.0 },
      ];

      const combined = combineScores(scores);
      expect(combined).toBeLessThanOrEqual(1);
    });
  });
});
