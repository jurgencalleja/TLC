/**
 * Quality Thresholds Tests
 *
 * Tests for configurable quality thresholds per operation
 */

import { describe, it, beforeEach } from 'vitest';
const assert = require('node:assert');

const {
  createThresholds,
  getThreshold,
  getDimensionThreshold,
  checkThreshold,
  applyPreset,
  saveThresholds,
  loadThresholds,
  PRESET_FAST,
  PRESET_BALANCED,
  PRESET_THOROUGH,
} = require('./quality-thresholds.js');

describe('Quality Thresholds', () => {
  describe('createThresholds', () => {
    it('creates thresholds with defaults', () => {
      const thresholds = createThresholds();
      assert.ok(thresholds);
      assert.ok(thresholds.default >= 0);
    });

    it('accepts custom default threshold', () => {
      const thresholds = createThresholds({ default: 80 });
      assert.strictEqual(thresholds.default, 80);
    });

    it('accepts per-operation thresholds', () => {
      const thresholds = createThresholds({
        operations: {
          'code-gen': 85,
          review: 90,
        },
      });
      assert.strictEqual(thresholds.operations['code-gen'], 85);
      assert.strictEqual(thresholds.operations.review, 90);
    });
  });

  describe('getThreshold', () => {
    it('returns operation threshold when set', () => {
      const thresholds = createThresholds({
        default: 70,
        operations: { 'code-gen': 85 },
      });
      const threshold = getThreshold(thresholds, 'code-gen');
      assert.strictEqual(threshold, 85);
    });

    it('falls back to default threshold', () => {
      const thresholds = createThresholds({ default: 70 });
      const threshold = getThreshold(thresholds, 'unknown-operation');
      assert.strictEqual(threshold, 70);
    });

    it('returns default for null operation', () => {
      const thresholds = createThresholds({ default: 75 });
      const threshold = getThreshold(thresholds, null);
      assert.strictEqual(threshold, 75);
    });
  });

  describe('getDimensionThreshold', () => {
    it('returns per-dimension threshold when set', () => {
      const thresholds = createThresholds({
        dimensions: {
          style: 90,
          correctness: 100,
        },
      });
      const threshold = getDimensionThreshold(thresholds, 'style');
      assert.strictEqual(threshold, 90);
    });

    it('falls back to default when dimension not set', () => {
      const thresholds = createThresholds({ default: 70 });
      const threshold = getDimensionThreshold(thresholds, 'documentation');
      assert.strictEqual(threshold, 70);
    });

    it('returns operation-specific dimension threshold', () => {
      const thresholds = createThresholds({
        default: 70,
        operations: {
          'code-gen': {
            default: 80,
            dimensions: { style: 95 },
          },
        },
      });
      const threshold = getDimensionThreshold(thresholds, 'style', 'code-gen');
      assert.strictEqual(threshold, 95);
    });
  });

  describe('checkThreshold', () => {
    it('returns pass when score meets threshold', () => {
      const thresholds = createThresholds({ default: 70 });
      const result = checkThreshold(thresholds, { composite: 80 });
      assert.strictEqual(result.pass, true);
    });

    it('returns fail when score below threshold', () => {
      const thresholds = createThresholds({ default: 70 });
      const result = checkThreshold(thresholds, { composite: 60 });
      assert.strictEqual(result.pass, false);
    });

    it('returns which dimensions failed', () => {
      const thresholds = createThresholds({
        default: 70,
        dimensions: { style: 80, correctness: 90 },
      });
      const scores = { style: 75, correctness: 85, documentation: 90 };
      const result = checkThreshold(thresholds, scores);
      assert.ok(result.failed);
      assert.ok(result.failed.includes('style'));
      assert.ok(result.failed.includes('correctness'));
      assert.ok(!result.failed.includes('documentation'));
    });

    it('returns margin for each dimension', () => {
      const thresholds = createThresholds({ default: 70 });
      const scores = { style: 80, correctness: 60 };
      const result = checkThreshold(thresholds, scores, { margins: true });
      assert.ok(result.margins);
      assert.strictEqual(result.margins.style, 10);
      assert.strictEqual(result.margins.correctness, -10);
    });

    it('passes when exactly at threshold', () => {
      const thresholds = createThresholds({ default: 70 });
      const result = checkThreshold(thresholds, { composite: 70 });
      assert.strictEqual(result.pass, true);
    });
  });

  describe('applyPreset', () => {
    it('applies fast preset with lower thresholds', () => {
      const thresholds = applyPreset(PRESET_FAST);
      assert.ok(thresholds.default <= 60);
    });

    it('applies balanced preset with moderate thresholds', () => {
      const thresholds = applyPreset(PRESET_BALANCED);
      assert.ok(thresholds.default >= 65 && thresholds.default <= 80);
    });

    it('applies thorough preset with higher thresholds', () => {
      const thresholds = applyPreset(PRESET_THOROUGH);
      assert.ok(thresholds.default >= 80);
    });

    it('merges preset with custom overrides', () => {
      const thresholds = applyPreset(PRESET_BALANCED, { default: 85 });
      assert.strictEqual(thresholds.default, 85);
    });

    it('preserves preset name', () => {
      const thresholds = applyPreset(PRESET_FAST);
      assert.strictEqual(thresholds.preset, 'fast');
    });
  });

  describe('presets', () => {
    it('fast has lower thresholds than balanced', () => {
      const fast = applyPreset(PRESET_FAST);
      const balanced = applyPreset(PRESET_BALANCED);
      assert.ok(fast.default < balanced.default);
    });

    it('balanced has lower thresholds than thorough', () => {
      const balanced = applyPreset(PRESET_BALANCED);
      const thorough = applyPreset(PRESET_THOROUGH);
      assert.ok(balanced.default < thorough.default);
    });

    it('fast preset allows cheaper models', () => {
      const fast = applyPreset(PRESET_FAST);
      assert.ok(fast.allowedModels || fast.modelTier === 'basic');
    });

    it('thorough preset requires better models', () => {
      const thorough = applyPreset(PRESET_THOROUGH);
      assert.ok(thorough.modelTier === 'premium' || thorough.minModel);
    });
  });

  describe('saveThresholds', () => {
    it('persists thresholds to config', async () => {
      const thresholds = createThresholds({ default: 85 });
      let savedData = null;
      const mockSave = async (data) => {
        savedData = data;
      };
      await saveThresholds(thresholds, { save: mockSave });
      assert.ok(savedData);
      assert.strictEqual(savedData.default, 85);
    });

    it('returns success status', async () => {
      const thresholds = createThresholds();
      const result = await saveThresholds(thresholds, {
        save: async () => {},
      });
      assert.strictEqual(result.success, true);
    });
  });

  describe('loadThresholds', () => {
    it('reads thresholds from config', async () => {
      const mockLoad = async () => ({ default: 90 });
      const thresholds = await loadThresholds({ load: mockLoad });
      assert.strictEqual(thresholds.default, 90);
    });

    it('returns defaults when no config', async () => {
      const mockLoad = async () => null;
      const thresholds = await loadThresholds({ load: mockLoad });
      assert.ok(thresholds.default >= 0);
    });

    it('validates loaded config', async () => {
      const mockLoad = async () => ({ default: 'invalid' });
      const thresholds = await loadThresholds({ load: mockLoad });
      assert.ok(typeof thresholds.default === 'number');
    });
  });
});
