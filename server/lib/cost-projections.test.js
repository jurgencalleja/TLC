/**
 * Cost Projections Tests
 *
 * Estimate costs before execution
 */

import { describe, it, beforeEach } from 'vitest';
const assert = require('node:assert');

const {
  estimateInputTokens,
  estimateOutputTokens,
  projectCost,
  compareModels,
  cheapestModel,
  trackAccuracy,
  getAccuracyHistory,
  adjustEstimates,
  projectMultiModel,
} = require('./cost-projections.js');

describe('Cost Projections', () => {
  describe('estimateInputTokens', () => {
    it('counts from prompt length', () => {
      const prompt = 'This is a test prompt with some words in it.';
      const tokens = estimateInputTokens(prompt);

      // Roughly 4 chars per token
      assert.ok(tokens > 0);
      assert.ok(tokens < prompt.length); // Should be fewer tokens than chars
    });

    it('handles empty prompt', () => {
      const tokens = estimateInputTokens('');
      assert.strictEqual(tokens, 0);
    });

    it('handles code in prompt', () => {
      const prompt = `
        function hello() {
          console.log('Hello, world!');
        }
      `;
      const tokens = estimateInputTokens(prompt);
      assert.ok(tokens > 10);
    });
  });

  describe('estimateOutputTokens', () => {
    it('uses task patterns for code generation', () => {
      const tokens = estimateOutputTokens({
        taskType: 'code-generation',
        complexity: 'medium',
      });

      // Code gen typically produces more output
      assert.ok(tokens >= 500);
    });

    it('uses task patterns for review', () => {
      const tokens = estimateOutputTokens({
        taskType: 'code-review',
        complexity: 'medium',
      });

      // Reviews produce less output than code gen
      assert.ok(tokens >= 200);
    });

    it('adjusts for complexity', () => {
      const simple = estimateOutputTokens({ taskType: 'code-generation', complexity: 'simple' });
      const complex = estimateOutputTokens({ taskType: 'code-generation', complexity: 'complex' });

      assert.ok(complex > simple);
    });
  });

  describe('projectCost', () => {
    it('combines input and output estimates', () => {
      const projection = projectCost({
        prompt: 'Write a function to sort an array',
        model: 'claude-3-opus',
        taskType: 'code-generation',
      });

      assert.ok(projection.estimatedCost > 0);
      assert.ok(projection.inputTokens > 0);
      assert.ok(projection.outputTokens > 0);
    });

    it('uses model pricing', () => {
      const opusProjection = projectCost({
        prompt: 'Write a hello world',
        model: 'claude-3-opus',
        taskType: 'code-generation',
      });

      const haikuProjection = projectCost({
        prompt: 'Write a hello world',
        model: 'claude-3-haiku',
        taskType: 'code-generation',
      });

      // Opus should be more expensive
      assert.ok(opusProjection.estimatedCost > haikuProjection.estimatedCost);
    });
  });

  describe('compareModels', () => {
    it('returns cost ranking', () => {
      const comparison = compareModels({
        prompt: 'Write a sorting function',
        taskType: 'code-generation',
        models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
      });

      assert.ok(Array.isArray(comparison));
      assert.strictEqual(comparison.length, 3);

      // Should be sorted by cost
      assert.ok(comparison[0].estimatedCost <= comparison[1].estimatedCost);
      assert.ok(comparison[1].estimatedCost <= comparison[2].estimatedCost);
    });
  });

  describe('cheapestModel', () => {
    it('returns lowest cost option', () => {
      const result = cheapestModel({
        prompt: 'Write a function',
        taskType: 'code-generation',
        models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
      });

      assert.ok(result.model);
      assert.ok(result.estimatedCost > 0);
      // Haiku should generally be cheapest
      assert.strictEqual(result.model, 'claude-3-haiku');
    });
  });

  describe('trackAccuracy', () => {
    it('compares estimate vs actual', () => {
      const accuracy = trackAccuracy({
        estimatedCost: 0.10,
        actualCost: 0.12,
        model: 'claude-3-opus',
        taskType: 'code-generation',
      });

      assert.ok(accuracy.percentageError !== undefined);
      assert.ok(accuracy.overEstimate !== undefined || accuracy.underEstimate !== undefined);
    });

    it('tracks underestimate', () => {
      const accuracy = trackAccuracy({
        estimatedCost: 0.10,
        actualCost: 0.15,
        model: 'claude-3-opus',
        taskType: 'code-generation',
      });

      assert.strictEqual(accuracy.underEstimate, true);
    });

    it('tracks overestimate', () => {
      const accuracy = trackAccuracy({
        estimatedCost: 0.15,
        actualCost: 0.10,
        model: 'claude-3-opus',
        taskType: 'code-generation',
      });

      assert.strictEqual(accuracy.overEstimate, true);
    });
  });

  describe('getAccuracyHistory', () => {
    it('returns metrics', () => {
      // Track some accuracy data first
      trackAccuracy({ estimatedCost: 0.10, actualCost: 0.12, model: 'claude-3-opus', taskType: 'code-generation' });
      trackAccuracy({ estimatedCost: 0.10, actualCost: 0.09, model: 'claude-3-opus', taskType: 'code-generation' });

      const history = getAccuracyHistory({ model: 'claude-3-opus' });

      assert.ok(history.averageError !== undefined);
      assert.ok(history.sampleCount >= 0);
    });
  });

  describe('adjustEstimates', () => {
    it('learns from history', () => {
      // Record at least 3 underestimates (required by implementation)
      trackAccuracy({ estimatedCost: 0.10, actualCost: 0.15, model: 'gpt-4', taskType: 'code-generation' });
      trackAccuracy({ estimatedCost: 0.10, actualCost: 0.14, model: 'gpt-4', taskType: 'code-generation' });
      trackAccuracy({ estimatedCost: 0.10, actualCost: 0.16, model: 'gpt-4', taskType: 'code-generation' });

      const adjustment = adjustEstimates({ model: 'gpt-4', taskType: 'code-generation' });

      // Should suggest increasing estimates
      assert.ok(adjustment.multiplier > 1.0);
    });
  });

  describe('projectMultiModel', () => {
    it('sums costs across providers', () => {
      const projection = projectMultiModel({
        prompt: 'Review this code for bugs',
        taskType: 'code-review',
        models: ['claude-3-opus', 'gpt-4', 'deepseek-r1'],
      });

      assert.ok(projection.totalEstimatedCost > 0);
      assert.ok(projection.breakdown);
      assert.strictEqual(Object.keys(projection.breakdown).length, 3);
    });
  });
});
