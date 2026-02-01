/**
 * Impact Scorer Tests
 */

import { describe, it, expect, vi } from 'vitest';

describe('ImpactScorer', () => {
  describe('complexity reduction scoring', () => {
    it('high complexity reduction gives high score', async () => {
      const { ImpactScorer } = await import('./impact-scorer.js');
      const scorer = new ImpactScorer();

      const result = scorer.score({
        complexity: 25,
        targetComplexity: 5,
      });

      expect(result.breakdown.complexityReduction).toBeGreaterThan(70);
    });

    it('low complexity reduction gives low score', async () => {
      const { ImpactScorer } = await import('./impact-scorer.js');
      const scorer = new ImpactScorer();

      const result = scorer.score({
        complexity: 3,
        targetComplexity: 2,
      });

      expect(result.breakdown.complexityReduction).toBeLessThan(50);
    });
  });

  describe('blast radius scoring', () => {
    it('many files affected gives higher score', async () => {
      const { ImpactScorer } = await import('./impact-scorer.js');
      const scorer = new ImpactScorer();

      const result = scorer.score({
        filesAffected: 15,
      });

      expect(result.breakdown.blastRadius).toBeGreaterThan(80);
    });

    it('single file gives lower score', async () => {
      const { ImpactScorer } = await import('./impact-scorer.js');
      const scorer = new ImpactScorer();

      const result = scorer.score({
        filesAffected: 1,
      });

      expect(result.breakdown.blastRadius).toBeLessThan(60);
    });
  });

  describe('change frequency scoring', () => {
    it('frequently changed files get higher score', async () => {
      const { ImpactScorer } = await import('./impact-scorer.js');
      const scorer = new ImpactScorer();

      const result = scorer.score({
        changeCount: 100,
      });

      expect(result.breakdown.changeFrequency).toBeGreaterThan(80);
    });

    it('rarely changed files get lower score', async () => {
      const { ImpactScorer } = await import('./impact-scorer.js');
      const scorer = new ImpactScorer();

      const result = scorer.score({
        changeCount: 2,
      });

      expect(result.breakdown.changeFrequency).toBeLessThan(60);
    });
  });

  describe('risk scoring', () => {
    it('low test coverage gives higher risk score', async () => {
      const { ImpactScorer } = await import('./impact-scorer.js');
      const scorer = new ImpactScorer();

      const result = scorer.score({
        testCoverage: 10,
      });

      expect(result.breakdown.risk).toBeGreaterThan(80);
    });

    it('high test coverage gives lower risk score', async () => {
      const { ImpactScorer } = await import('./impact-scorer.js');
      const scorer = new ImpactScorer();

      const result = scorer.score({
        testCoverage: 90,
      });

      expect(result.breakdown.risk).toBeLessThan(50);
    });

    it('critical paths get boosted score', async () => {
      const { ImpactScorer } = await import('./impact-scorer.js');
      const scorer = new ImpactScorer();

      const regular = scorer.score({ testCoverage: 50 });
      const critical = scorer.score({ testCoverage: 50, isCritical: true });

      expect(critical.breakdown.risk).toBeGreaterThan(regular.breakdown.risk);
    });
  });

  describe('combined scoring', () => {
    it('combines factors into single 0-100 score', async () => {
      const { ImpactScorer } = await import('./impact-scorer.js');
      const scorer = new ImpactScorer();

      const result = scorer.score({
        complexity: 20,
        filesAffected: 5,
        changeCount: 30,
        testCoverage: 40,
      });

      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.total).toBeLessThanOrEqual(100);
      expect(typeof result.total).toBe('number');
    });

    it('returns breakdown of individual scores', async () => {
      const { ImpactScorer } = await import('./impact-scorer.js');
      const scorer = new ImpactScorer();

      const result = scorer.score({
        complexity: 10,
        filesAffected: 3,
      });

      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.complexityReduction).toBeDefined();
      expect(result.breakdown.blastRadius).toBeDefined();
      expect(result.breakdown.changeFrequency).toBeDefined();
      expect(result.breakdown.risk).toBeDefined();
    });
  });

  describe('git history', () => {
    it('handles missing git history gracefully', async () => {
      const { ImpactScorer } = await import('./impact-scorer.js');

      const execMock = vi.fn().mockReturnValue('');
      const scorer = new ImpactScorer({ exec: execMock });

      const result = scorer.score({
        filePath: 'nonexistent.js',
      });

      expect(result.total).toBeGreaterThanOrEqual(0);
      // Empty git output returns 0 commits = score 30
      expect(result.breakdown.changeFrequency).toBe(30);
    });

    it('uses git log for file history when available', async () => {
      const { ImpactScorer } = await import('./impact-scorer.js');

      const execMock = vi.fn().mockReturnValue('25\n');
      const scorer = new ImpactScorer({ exec: execMock });

      const result = scorer.score({
        filePath: 'src/api/users.js',
      });

      expect(execMock).toHaveBeenCalledWith(expect.stringContaining('git log'));
      expect(result.breakdown.changeFrequency).toBeGreaterThan(60);
    });
  });

  describe('scoreAll', () => {
    it('scores and sorts multiple opportunities', async () => {
      const { ImpactScorer } = await import('./impact-scorer.js');
      const scorer = new ImpactScorer();

      const opportunities = [
        { complexity: 5, filesAffected: 1 },
        { complexity: 30, filesAffected: 10, changeCount: 50 },
        { complexity: 10, filesAffected: 3 },
      ];

      const scored = scorer.scoreAll(opportunities);

      expect(scored).toHaveLength(3);
      expect(scored[0].impact.total).toBeGreaterThanOrEqual(scored[1].impact.total);
      expect(scored[1].impact.total).toBeGreaterThanOrEqual(scored[2].impact.total);
    });
  });

  describe('getTier', () => {
    it('returns correct priority tier', async () => {
      const { ImpactScorer } = await import('./impact-scorer.js');

      expect(ImpactScorer.getTier(90)).toBe('high');
      expect(ImpactScorer.getTier(80)).toBe('high');
      expect(ImpactScorer.getTier(65)).toBe('medium');
      expect(ImpactScorer.getTier(50)).toBe('medium');
      expect(ImpactScorer.getTier(30)).toBe('low');
    });
  });
});
