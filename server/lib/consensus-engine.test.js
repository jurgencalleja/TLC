import { describe, it, expect, vi } from 'vitest';
import { ConsensusEngine } from './consensus-engine.js';

// Mock adapters
const createMockAdapter = (name, issues = []) => ({
  name,
  canAfford: vi.fn(() => true),
  review: vi.fn(() => Promise.resolve({
    issues,
    suggestions: [],
    score: 80,
    model: name,
    tokensUsed: 100,
    cost: 0.01,
  })),
});

describe('ConsensusEngine', () => {
  describe('review', () => {
    it('aggregates reviews from multiple models', async () => {
      const adapters = [
        createMockAdapter('claude'),
        createMockAdapter('openai'),
        createMockAdapter('deepseek'),
      ];

      const engine = new ConsensusEngine(adapters);
      const result = await engine.review('const x = 1;');

      expect(result.reviews).toHaveLength(3);
      expect(result.reviews.map(r => r.model)).toEqual(['claude', 'openai', 'deepseek']);
    });

    it('runs reviews in parallel', async () => {
      const delay = ms => new Promise(r => setTimeout(r, ms));
      const adapters = [
        { name: 'a', canAfford: () => true, review: async () => { await delay(50); return { issues: [], suggestions: [], score: 80, model: 'a', tokensUsed: 0, cost: 0 }; } },
        { name: 'b', canAfford: () => true, review: async () => { await delay(50); return { issues: [], suggestions: [], score: 80, model: 'b', tokensUsed: 0, cost: 0 }; } },
        { name: 'c', canAfford: () => true, review: async () => { await delay(50); return { issues: [], suggestions: [], score: 80, model: 'c', tokensUsed: 0, cost: 0 }; } },
      ];

      const engine = new ConsensusEngine(adapters);
      const start = Date.now();
      await engine.review('code');
      const elapsed = Date.now() - start;

      // Should take ~50ms (parallel), not ~150ms (sequential)
      expect(elapsed).toBeLessThan(120);
    });

    it('handles model failures gracefully', async () => {
      const adapters = [
        createMockAdapter('claude'),
        {
          name: 'failing',
          canAfford: () => true,
          review: () => Promise.reject(new Error('API error')),
        },
        createMockAdapter('deepseek'),
      ];

      const engine = new ConsensusEngine(adapters);
      const result = await engine.review('code');

      expect(result.reviews).toHaveLength(2);
      expect(result.warnings).toContain('failing failed: API error');
    });

    it('skips models over budget', async () => {
      const adapters = [
        createMockAdapter('claude'),
        { ...createMockAdapter('openai'), canAfford: () => false },
        createMockAdapter('deepseek'),
      ];

      const engine = new ConsensusEngine(adapters, { budgetAware: true });
      const result = await engine.review('code');

      expect(result.reviews).toHaveLength(2);
      expect(result.reviews.map(r => r.model)).toEqual(['claude', 'deepseek']);
    });

    it('throws if insufficient reviews', async () => {
      const adapters = [
        { ...createMockAdapter('claude'), review: () => Promise.reject(new Error('fail')) },
        { ...createMockAdapter('openai'), review: () => Promise.reject(new Error('fail')) },
      ];

      const engine = new ConsensusEngine(adapters, { requireMinimum: 2 });

      await expect(engine.review('code')).rejects.toThrow('Insufficient reviews');
    });
  });

  describe('calculateConsensus', () => {
    it('calculates majority consensus', () => {
      const reviews = [
        { model: 'claude', issues: [{ id: 'A', severity: 'high' }] },
        { model: 'openai', issues: [{ id: 'A', severity: 'high' }, { id: 'B', severity: 'low' }] },
        { model: 'deepseek', issues: [{ id: 'A', severity: 'medium' }] },
      ];

      const consensus = ConsensusEngine.calculateConsensus(reviews, 'majority');

      // Issue A flagged by all 3 - confidence 1.0
      const issueA = consensus.issues.find(i => i.id === 'A');
      expect(issueA.confidence).toBe(1.0);

      // Issue B flagged by 1 of 3 - confidence 0.33
      const issueB = consensus.issues.find(i => i.id === 'B');
      expect(issueB.confidence).toBeCloseTo(0.33, 1);
    });

    it('uses unanimous consensus when configured', () => {
      const reviews = [
        { model: 'claude', issues: [{ id: 'A' }] },
        { model: 'openai', issues: [{ id: 'A' }, { id: 'B' }] },
        { model: 'deepseek', issues: [{ id: 'A' }] },
      ];

      const consensus = ConsensusEngine.calculateConsensus(reviews, 'unanimous');

      // Only issue A is unanimous
      expect(consensus.issues).toHaveLength(1);
      expect(consensus.issues[0].id).toBe('A');
    });

    it('calculates total cost', () => {
      const reviews = [
        { model: 'claude', cost: 0 },
        { model: 'openai', cost: 0.12 },
        { model: 'deepseek', cost: 0.02 },
      ];

      const result = ConsensusEngine.summarizeCosts(reviews);

      expect(result.total).toBeCloseTo(0.14, 2);
      expect(result.byModel.openai).toBe(0.12);
    });
  });

  describe('single model fallback', () => {
    it('returns single-model consensus type', async () => {
      const adapters = [createMockAdapter('claude')];

      const engine = new ConsensusEngine(adapters, { requireMinimum: 1 });
      const result = await engine.review('code');

      expect(result.consensusType).toBe('single-model');
    });
  });
});
