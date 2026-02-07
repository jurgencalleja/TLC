/**
 * Cost Optimizer Tests
 *
 * Recommend cheaper alternatives
 */

import { describe, it, beforeEach } from 'vitest';
const assert = require('node:assert');

const {
  createOptimizer,
  analyzeUsage,
  suggestCheaperModel,
  suggestBatching,
  suggestCaching,
  getQualityScore,
  getCostScore,
  rankByValue,
  applyPreferences,
  learnPreferences,
  formatSuggestions,
} = require('./cost-optimizer.js');

describe('Cost Optimizer', () => {
  let optimizer;

  beforeEach(() => {
    optimizer = createOptimizer();
  });

  describe('analyzeUsage', () => {
    it('finds expensive operations', () => {
      const usage = [
        { operation: 'code-review', model: 'claude-3-opus', cost: 5.00 },
        { operation: 'code-gen', model: 'gpt-4', cost: 10.00 },
        { operation: 'chat', model: 'claude-3-haiku', cost: 0.50 },
      ];

      const analysis = analyzeUsage(optimizer, usage);

      assert.ok(analysis.expensiveOperations);
      assert.ok(analysis.expensiveOperations.length > 0);
      // Most expensive should be first
      assert.strictEqual(analysis.expensiveOperations[0].operation, 'code-gen');
    });

    it('identifies high-cost models', () => {
      const usage = [
        { operation: 'task-1', model: 'claude-3-opus', cost: 5.00 },
        { operation: 'task-2', model: 'claude-3-opus', cost: 3.00 },
        { operation: 'task-3', model: 'claude-3-haiku', cost: 0.10 },
      ];

      const analysis = analyzeUsage(optimizer, usage);

      assert.ok(analysis.modelBreakdown);
      assert.ok(analysis.modelBreakdown['claude-3-opus'] > analysis.modelBreakdown['claude-3-haiku']);
    });
  });

  describe('suggestCheaperModel', () => {
    it('returns alternative for expensive model', () => {
      const suggestion = suggestCheaperModel(optimizer, {
        currentModel: 'claude-3-opus',
        taskType: 'simple-chat',
      });

      assert.ok(suggestion.alternativeModel);
      assert.ok(suggestion.estimatedSavings > 0);
    });

    it('returns null when already using cheapest', () => {
      const suggestion = suggestCheaperModel(optimizer, {
        currentModel: 'claude-3-haiku',
        taskType: 'simple-chat',
      });

      // May return null or suggestion with minimal savings
      if (suggestion) {
        assert.ok(suggestion.estimatedSavings <= 0 || suggestion.alternativeModel === 'claude-3-haiku');
      }
    });
  });

  describe('suggestBatching', () => {
    it('identifies patterns for batching', () => {
      const usage = [
        { operation: 'translate', model: 'gpt-4', inputTokens: 100 },
        { operation: 'translate', model: 'gpt-4', inputTokens: 150 },
        { operation: 'translate', model: 'gpt-4', inputTokens: 120 },
        { operation: 'translate', model: 'gpt-4', inputTokens: 80 },
      ];

      const suggestion = suggestBatching(optimizer, usage);

      assert.ok(suggestion.batchable);
      assert.ok(suggestion.estimatedSavings > 0);
      assert.strictEqual(suggestion.operation, 'translate');
    });

    it('returns null for varied operations', () => {
      const usage = [
        { operation: 'code-gen', model: 'gpt-4', inputTokens: 100 },
        { operation: 'review', model: 'claude-3-opus', inputTokens: 150 },
        { operation: 'chat', model: 'claude-3-haiku', inputTokens: 50 },
      ];

      const suggestion = suggestBatching(optimizer, usage);

      assert.strictEqual(suggestion.batchable, false);
    });
  });

  describe('suggestCaching', () => {
    it('finds repeated prompts', () => {
      const usage = [
        { prompt: 'Explain this code', hash: 'abc123' },
        { prompt: 'Explain this code', hash: 'abc123' },
        { prompt: 'Explain this code', hash: 'abc123' },
        { prompt: 'Different prompt', hash: 'def456' },
      ];

      const suggestion = suggestCaching(optimizer, usage);

      assert.ok(suggestion.cacheable);
      assert.ok(suggestion.repeatedPrompts > 0);
    });

    it('returns false for unique prompts', () => {
      const usage = [
        { prompt: 'Prompt 1', hash: 'hash1' },
        { prompt: 'Prompt 2', hash: 'hash2' },
        { prompt: 'Prompt 3', hash: 'hash3' },
      ];

      const suggestion = suggestCaching(optimizer, usage);

      assert.strictEqual(suggestion.cacheable, false);
    });
  });

  describe('getQualityScore', () => {
    it('rates model quality', () => {
      const opusScore = getQualityScore('claude-3-opus');
      const haikuScore = getQualityScore('claude-3-haiku');

      assert.ok(opusScore > 0 && opusScore <= 100);
      assert.ok(haikuScore > 0 && haikuScore <= 100);
      // Opus should have higher quality score
      assert.ok(opusScore > haikuScore);
    });
  });

  describe('getCostScore', () => {
    it('rates model cost efficiency', () => {
      const opusScore = getCostScore('claude-3-opus');
      const haikuScore = getCostScore('claude-3-haiku');

      assert.ok(opusScore > 0 && opusScore <= 100);
      assert.ok(haikuScore > 0 && haikuScore <= 100);
      // Haiku should have better cost score (lower cost = higher score)
      assert.ok(haikuScore > opusScore);
    });
  });

  describe('rankByValue', () => {
    it('combines quality/cost for ranking', () => {
      const models = ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku', 'gpt-4'];

      const ranked = rankByValue(optimizer, models);

      assert.ok(Array.isArray(ranked));
      assert.strictEqual(ranked.length, 4);
      // Each should have quality, cost, and value scores
      ranked.forEach(r => {
        assert.ok(r.model);
        assert.ok(r.qualityScore !== undefined);
        assert.ok(r.costScore !== undefined);
        assert.ok(r.valueScore !== undefined);
      });
    });
  });

  describe('applyPreferences', () => {
    it('filters suggestions based on user preferences', () => {
      const suggestions = [
        { model: 'claude-3-haiku', reason: 'Cheapest' },
        { model: 'claude-3-sonnet', reason: 'Balanced' },
        { model: 'gpt-4', reason: 'Alternative provider' },
      ];

      const preferences = {
        preferredProviders: ['anthropic'],
        minQuality: 50,
      };

      const filtered = applyPreferences(optimizer, suggestions, preferences);

      // Should filter out non-anthropic models
      filtered.forEach(s => {
        assert.ok(s.model.includes('claude'));
      });
    });
  });

  describe('learnPreferences', () => {
    it('updates from user choices', () => {
      // User consistently chooses quality over cost
      learnPreferences(optimizer, { chosen: 'claude-3-opus', alternatives: ['claude-3-haiku'] });
      learnPreferences(optimizer, { chosen: 'gpt-4', alternatives: ['gpt-3.5-turbo'] });

      // Preferences should shift towards quality
      const preferences = optimizer.getLearnedPreferences();
      assert.ok(preferences.qualityWeight >= 0.5);
    });
  });

  describe('formatSuggestions', () => {
    it('creates readable output', () => {
      const suggestions = [
        { type: 'model', current: 'claude-3-opus', suggested: 'claude-3-sonnet', savings: 2.50 },
        { type: 'caching', savings: 1.00 },
      ];

      const formatted = formatSuggestions(suggestions);

      assert.ok(typeof formatted === 'string');
      assert.ok(formatted.includes('claude-3-sonnet'));
      assert.ok(formatted.includes('$'));
    });
  });
});
