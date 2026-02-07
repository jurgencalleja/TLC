/**
 * Quality Evaluator Tests
 *
 * Tests for evaluating output against thresholds
 */

import { describe, it, beforeEach } from 'vitest';
const assert = require('node:assert');

const {
  createEvaluator,
  evaluate,
  getFailingDimensions,
  suggestImprovements,
  calculateConfidence,
  evaluateWithContext,
  skipDimension,
  aggregateResults,
} = require('./quality-evaluator.js');

describe('Quality Evaluator', () => {
  describe('createEvaluator', () => {
    it('creates evaluator with default options', () => {
      const evaluator = createEvaluator();
      assert.ok(evaluator);
      assert.ok(evaluator.options);
    });

    it('accepts custom scorer', () => {
      const mockScorer = { score: () => 100 };
      const evaluator = createEvaluator({ scorer: mockScorer });
      assert.strictEqual(evaluator.options.scorer, mockScorer);
    });

    it('accepts custom thresholds', () => {
      const thresholds = { default: 90 };
      const evaluator = createEvaluator({ thresholds });
      assert.strictEqual(evaluator.options.thresholds.default, 90);
    });
  });

  describe('evaluate', () => {
    it('runs all scorers', async () => {
      const scorersCalled = [];
      const mockScorer = {
        scoreCodeStyle: async () => {
          scorersCalled.push('style');
          return 80;
        },
        scoreCompleteness: async () => {
          scorersCalled.push('completeness');
          return 90;
        },
        scoreCorrectness: async () => {
          scorersCalled.push('correctness');
          return 85;
        },
      };
      await evaluate('const x = 1;', { scorer: mockScorer });
      assert.ok(scorersCalled.includes('style'));
    });

    it('compares scores to thresholds', async () => {
      const result = await evaluate('const x = 1;', {
        thresholds: { default: 70 },
        scorer: {
          scoreCodeStyle: async () => 80,
          scoreCompleteness: async () => 90,
          scoreCorrectness: async () => 85,
          scoreDocumentation: async () => 75,
        },
      });
      assert.ok(result.scores);
      assert.ok(result.thresholdResult);
    });

    it('returns pass when all dimensions pass', async () => {
      const result = await evaluate('const x = 1;', {
        thresholds: { default: 70 },
        scorer: {
          scoreCodeStyle: async () => 80,
          scoreCompleteness: async () => 90,
          scoreCorrectness: async () => 85,
          scoreDocumentation: async () => 75,
        },
      });
      assert.strictEqual(result.pass, true);
    });

    it('returns fail when any dimension fails', async () => {
      const result = await evaluate('const x = 1;', {
        thresholds: { default: 90 },
        scorer: {
          scoreCodeStyle: async () => 80,
          scoreCompleteness: async () => 70,
          scoreCorrectness: async () => 85,
          scoreDocumentation: async () => 75,
        },
      });
      assert.strictEqual(result.pass, false);
    });

    it('returns scores for each dimension', async () => {
      const result = await evaluate('const x = 1;', {
        scorer: {
          scoreCodeStyle: async () => 80,
          scoreCompleteness: async () => 90,
          scoreCorrectness: async () => 85,
          scoreDocumentation: async () => 75,
        },
      });
      assert.strictEqual(result.scores.style, 80);
      assert.strictEqual(result.scores.completeness, 90);
    });
  });

  describe('getFailingDimensions', () => {
    it('lists dimensions below threshold', () => {
      const scores = { style: 80, completeness: 60, correctness: 90 };
      const thresholds = { default: 70 };
      const failing = getFailingDimensions(scores, thresholds);
      assert.ok(failing.includes('completeness'));
      assert.ok(!failing.includes('style'));
      assert.ok(!failing.includes('correctness'));
    });

    it('returns empty array when all pass', () => {
      const scores = { style: 80, completeness: 90 };
      const thresholds = { default: 70 };
      const failing = getFailingDimensions(scores, thresholds);
      assert.deepStrictEqual(failing, []);
    });

    it('uses per-dimension thresholds', () => {
      const scores = { style: 85, completeness: 85 };
      const thresholds = { default: 70, dimensions: { style: 90 } };
      const failing = getFailingDimensions(scores, thresholds);
      assert.ok(failing.includes('style'));
      assert.ok(!failing.includes('completeness'));
    });

    it('returns margin for each failure', () => {
      const scores = { style: 60, completeness: 50 };
      const thresholds = { default: 70 };
      const failing = getFailingDimensions(scores, thresholds, { margins: true });
      assert.ok(failing.some((f) => f.dimension === 'style' && f.margin === -10));
      assert.ok(failing.some((f) => f.dimension === 'completeness' && f.margin === -20));
    });
  });

  describe('suggestImprovements', () => {
    it('returns tips for failing dimensions', () => {
      const failing = ['style', 'documentation'];
      const suggestions = suggestImprovements(failing);
      assert.ok(suggestions.length >= 2);
    });

    it('returns specific tips for each dimension', () => {
      const suggestions = suggestImprovements(['style']);
      assert.ok(suggestions.some((s) => s.dimension === 'style'));
      assert.ok(suggestions[0].tip);
    });

    it('prioritizes by impact', () => {
      const suggestions = suggestImprovements(['correctness', 'style', 'documentation']);
      const correctnessIdx = suggestions.findIndex((s) => s.dimension === 'correctness');
      const styleIdx = suggestions.findIndex((s) => s.dimension === 'style');
      assert.ok(correctnessIdx < styleIdx);
    });

    it('includes code examples', () => {
      const suggestions = suggestImprovements(['documentation'], { examples: true });
      assert.ok(suggestions.some((s) => s.example));
    });

    it('returns empty for no failures', () => {
      const suggestions = suggestImprovements([]);
      assert.deepStrictEqual(suggestions, []);
    });
  });

  describe('calculateConfidence', () => {
    it('returns confidence from score margins', () => {
      const scores = { style: 90, completeness: 85, correctness: 95 };
      const thresholds = { default: 70 };
      const confidence = calculateConfidence(scores, thresholds);
      assert.ok(confidence >= 0 && confidence <= 1);
    });

    it('returns high confidence when all scores well above threshold', () => {
      const scores = { style: 95, completeness: 95, correctness: 95 };
      const thresholds = { default: 70 };
      const confidence = calculateConfidence(scores, thresholds);
      assert.ok(confidence >= 0.8);
    });

    it('returns low confidence when scores near threshold', () => {
      const scores = { style: 71, completeness: 72, correctness: 70 };
      const thresholds = { default: 70 };
      const confidence = calculateConfidence(scores, thresholds);
      assert.ok(confidence < 0.5);
    });

    it('returns 0 confidence when any score below threshold', () => {
      const scores = { style: 90, completeness: 60 };
      const thresholds = { default: 70 };
      const confidence = calculateConfidence(scores, thresholds);
      assert.strictEqual(confidence, 0);
    });
  });

  describe('evaluateWithContext', () => {
    it('includes metadata in result', async () => {
      const context = { operation: 'code-gen', model: 'gpt-4' };
      const result = await evaluateWithContext('const x = 1;', context, {
        scorer: {
          scoreCodeStyle: async () => 80,
          scoreCompleteness: async () => 90,
          scoreCorrectness: async () => 85,
          scoreDocumentation: async () => 75,
        },
      });
      assert.strictEqual(result.context.operation, 'code-gen');
      assert.strictEqual(result.context.model, 'gpt-4');
    });

    it('uses operation-specific thresholds', async () => {
      const context = { operation: 'review' };
      const options = {
        thresholds: {
          default: 70,
          operations: { review: 90 },
        },
        scorer: {
          scoreCodeStyle: async () => 85,
          scoreCompleteness: async () => 85,
          scoreCorrectness: async () => 85,
          scoreDocumentation: async () => 85,
        },
      };
      const result = await evaluateWithContext('const x = 1;', context, options);
      assert.strictEqual(result.pass, false);
    });

    it('records timestamp', async () => {
      const result = await evaluateWithContext('const x = 1;', {}, {
        scorer: {
          scoreCodeStyle: async () => 80,
        },
      });
      assert.ok(result.timestamp);
    });
  });

  describe('skipDimension', () => {
    it('excludes dimension from evaluation', async () => {
      const result = await evaluate('const x = 1;', {
        skip: ['documentation'],
        scorer: {
          scoreCodeStyle: async () => 80,
          scoreCompleteness: async () => 90,
          scoreCorrectness: async () => 85,
          scoreDocumentation: async () => 0,
        },
      });
      assert.ok(!result.scores.documentation);
    });

    it('does not affect pass/fail for skipped dimensions', async () => {
      const result = await evaluate('const x = 1;', {
        thresholds: { default: 70 },
        skip: ['documentation'],
        scorer: {
          scoreCodeStyle: async () => 80,
          scoreCompleteness: async () => 90,
          scoreCorrectness: async () => 85,
          scoreDocumentation: async () => 0,
        },
      });
      assert.strictEqual(result.pass, true);
    });

    it('marks skipped dimensions in result', async () => {
      const result = await evaluate('const x = 1;', {
        skip: ['style'],
        scorer: {
          scoreCodeStyle: async () => 80,
        },
      });
      assert.ok(result.skipped);
      assert.ok(result.skipped.includes('style'));
    });
  });

  describe('aggregateResults', () => {
    it('combines results from multiple files', () => {
      const results = [
        { pass: true, scores: { style: 80, correctness: 90 } },
        { pass: true, scores: { style: 70, correctness: 85 } },
      ];
      const aggregate = aggregateResults(results);
      assert.ok(aggregate.scores);
      assert.strictEqual(aggregate.scores.style, 75);
      assert.strictEqual(aggregate.scores.correctness, 87.5);
    });

    it('fails if any file fails', () => {
      const results = [
        { pass: true, scores: { style: 80 } },
        { pass: false, scores: { style: 50 } },
      ];
      const aggregate = aggregateResults(results);
      assert.strictEqual(aggregate.pass, false);
    });

    it('lists all failing files', () => {
      const results = [
        { pass: true, file: 'a.js', scores: { style: 80 } },
        { pass: false, file: 'b.js', scores: { style: 50 } },
        { pass: false, file: 'c.js', scores: { style: 40 } },
      ];
      const aggregate = aggregateResults(results);
      assert.ok(aggregate.failingFiles);
      assert.ok(aggregate.failingFiles.includes('b.js'));
      assert.ok(aggregate.failingFiles.includes('c.js'));
    });

    it('calculates overall composite', () => {
      const results = [
        { scores: { style: 80, correctness: 90 }, composite: 85 },
        { scores: { style: 70, correctness: 80 }, composite: 75 },
      ];
      const aggregate = aggregateResults(results);
      assert.strictEqual(aggregate.composite, 80);
    });
  });
});
