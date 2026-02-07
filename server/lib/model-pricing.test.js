/**
 * Model Pricing Tests
 *
 * Pricing database for all supported models
 */

import { describe, it, beforeEach } from 'vitest';
const assert = require('node:assert');

const {
  getPricing,
  calculateCost,
  loadPricing,
  updatePricing,
  getDefaultPricing,
  estimateCost,
  formatCost,
} = require('./model-pricing.js');

describe('Model Pricing', () => {
  describe('getPricing', () => {
    it('returns model pricing', () => {
      const pricing = getPricing('claude-3-opus');

      assert.ok(pricing);
      assert.ok(pricing.inputPer1kTokens !== undefined);
      assert.ok(pricing.outputPer1kTokens !== undefined);
    });

    it('returns null for unknown model', () => {
      const pricing = getPricing('unknown-model-xyz');

      assert.strictEqual(pricing, null);
    });
  });

  describe('calculateCost', () => {
    it('uses input/output rates', () => {
      const cost = calculateCost({
        model: 'claude-3-opus',
        inputTokens: 1000,
        outputTokens: 500,
      });

      assert.ok(cost > 0);
      assert.ok(typeof cost === 'number');
    });

    it('handles tiered pricing', () => {
      // Some models have tiered pricing based on volume
      const cost1 = calculateCost({
        model: 'gpt-4',
        inputTokens: 1000,
        outputTokens: 500,
      });

      const cost2 = calculateCost({
        model: 'gpt-4',
        inputTokens: 100000,
        outputTokens: 50000,
      });

      // Larger volume should have proportionally different cost
      assert.ok(cost2 > cost1);
    });

    it('returns 0 for local CLI', () => {
      const cost = calculateCost({
        model: 'local-llama',
        inputTokens: 1000,
        outputTokens: 500,
        isLocal: true,
      });

      assert.strictEqual(cost, 0);
    });

    it('returns 0 for unknown model with no fallback', () => {
      const cost = calculateCost({
        model: 'unknown-model',
        inputTokens: 1000,
        outputTokens: 500,
        useFallback: false,
      });

      assert.strictEqual(cost, 0);
    });
  });

  describe('loadPricing', () => {
    it('reads from config', () => {
      const customPricing = {
        'custom-model': {
          inputPer1kTokens: 0.01,
          outputPer1kTokens: 0.02,
        },
      };

      const mockFs = {
        existsSync: () => true,
        readFileSync: () => JSON.stringify(customPricing),
      };

      const loaded = loadPricing('/path/to/pricing.json', { fs: mockFs });

      assert.ok(loaded['custom-model']);
      assert.strictEqual(loaded['custom-model'].inputPer1kTokens, 0.01);
    });
  });

  describe('updatePricing', () => {
    it('modifies runtime pricing', () => {
      updatePricing('test-model', {
        inputPer1kTokens: 0.005,
        outputPer1kTokens: 0.015,
      });

      const pricing = getPricing('test-model');
      assert.strictEqual(pricing.inputPer1kTokens, 0.005);
      assert.strictEqual(pricing.outputPer1kTokens, 0.015);
    });
  });

  describe('getDefaultPricing', () => {
    it('has all major models', () => {
      const defaults = getDefaultPricing();

      // Claude models
      assert.ok(defaults['claude-3-opus']);
      assert.ok(defaults['claude-3-sonnet']);
      assert.ok(defaults['claude-3-haiku']);

      // OpenAI models
      assert.ok(defaults['gpt-4']);
      assert.ok(defaults['gpt-4-turbo']);
      assert.ok(defaults['gpt-3.5-turbo']);

      // Other providers
      assert.ok(defaults['deepseek-r1'] || defaults['deepseek-chat']);
    });
  });

  describe('estimateCost', () => {
    it('uses fallback rate for unknown models', () => {
      const cost = estimateCost({
        model: 'totally-unknown-model',
        inputTokens: 1000,
        outputTokens: 500,
      });

      // Should return a reasonable estimate using fallback rates
      assert.ok(cost > 0);
    });
  });

  describe('formatCost', () => {
    it('displays currency correctly', () => {
      const formatted = formatCost(0.0523);

      assert.ok(formatted.includes('$'));
      assert.ok(formatted.includes('0.05'));
    });

    it('handles very small amounts', () => {
      const formatted = formatCost(0.0001);

      assert.ok(formatted.includes('$'));
      // Should show enough precision
      assert.ok(formatted.includes('0.0001') || formatted.includes('<'));
    });

    it('handles zero', () => {
      const formatted = formatCost(0);

      assert.ok(formatted.includes('$0') || formatted.includes('$0.00'));
    });
  });
});
