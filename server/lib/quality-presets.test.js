/**
 * Quality Presets Tests
 *
 * Tests for pre-configured quality levels for common use cases
 */

import { describe, it, beforeEach } from 'vitest';
const assert = require('node:assert');

const {
  getPreset,
  createCustomPreset,
  recommendPreset,
  applyPreset,
  listPresets,
  PRESET_FAST,
  PRESET_BALANCED,
  PRESET_THOROUGH,
  PRESET_CRITICAL,
} = require('./quality-presets.js');

describe('Quality Presets', () => {
  describe('getPreset', () => {
    it('returns preset configuration', () => {
      const preset = getPreset('fast');
      assert.ok(preset);
      assert.ok(preset.thresholds);
    });

    it('returns null for unknown preset', () => {
      const preset = getPreset('unknown');
      assert.strictEqual(preset, null);
    });

    it('returns preset by constant', () => {
      const preset = getPreset(PRESET_FAST);
      assert.ok(preset);
      assert.strictEqual(preset.name, 'fast');
    });
  });

  describe('preset fast', () => {
    it('has low thresholds', () => {
      const preset = getPreset('fast');
      assert.ok(preset.thresholds.default <= 60);
    });

    it('allows cheaper models', () => {
      const preset = getPreset('fast');
      assert.ok(
        preset.modelTier === 'basic' ||
        (preset.allowedModels && preset.allowedModels.some((m) => m.includes('3.5')))
      );
    });

    it('has minimal retry configuration', () => {
      const preset = getPreset('fast');
      assert.ok(preset.maxRetries <= 1);
    });

    it('skips some dimensions', () => {
      const preset = getPreset('fast');
      assert.ok(preset.skipDimensions && preset.skipDimensions.length > 0);
    });
  });

  describe('preset balanced', () => {
    it('has moderate thresholds', () => {
      const preset = getPreset('balanced');
      assert.ok(preset.thresholds.default >= 65 && preset.thresholds.default <= 80);
    });

    it('allows mid-tier models', () => {
      const preset = getPreset('balanced');
      assert.ok(preset.modelTier === 'standard' || !preset.modelTier);
    });

    it('has reasonable retry count', () => {
      const preset = getPreset('balanced');
      assert.ok(preset.maxRetries >= 1 && preset.maxRetries <= 3);
    });
  });

  describe('preset thorough', () => {
    it('has high thresholds', () => {
      const preset = getPreset('thorough');
      assert.ok(preset.thresholds.default >= 80);
    });

    it('requires better models', () => {
      const preset = getPreset('thorough');
      assert.ok(
        preset.modelTier === 'premium' ||
        preset.minModel ||
        (preset.allowedModels && preset.allowedModels.some((m) => m.includes('4')))
      );
    });

    it('enables all dimensions', () => {
      const preset = getPreset('thorough');
      assert.ok(!preset.skipDimensions || preset.skipDimensions.length === 0);
    });

    it('has higher retry budget', () => {
      const preset = getPreset('thorough');
      assert.ok(preset.maxRetries >= 2);
    });
  });

  describe('preset critical', () => {
    it('has highest thresholds', () => {
      const preset = getPreset('critical');
      assert.ok(preset.thresholds.default >= 90);
    });

    it('requires premium models', () => {
      const preset = getPreset('critical');
      assert.ok(preset.modelTier === 'premium' || preset.minModel);
    });

    it('has strictest correctness threshold', () => {
      const preset = getPreset('critical');
      assert.ok(
        preset.thresholds.dimensions?.correctness >= 95 ||
        preset.thresholds.default >= 90
      );
    });

    it('enables all quality checks', () => {
      const preset = getPreset('critical');
      assert.ok(!preset.skipDimensions || preset.skipDimensions.length === 0);
    });
  });

  describe('createCustomPreset', () => {
    it('creates preset with custom thresholds', () => {
      const custom = createCustomPreset('my-preset', {
        thresholds: { default: 75 },
      });
      assert.strictEqual(custom.name, 'my-preset');
      assert.strictEqual(custom.thresholds.default, 75);
    });

    it('validates threshold values', () => {
      assert.throws(() => {
        createCustomPreset('invalid', { thresholds: { default: 150 } });
      });
    });

    it('allows extending existing preset', () => {
      const custom = createCustomPreset('my-fast', {
        extends: 'fast',
        thresholds: { default: 55 },
      });
      assert.ok(custom.skipDimensions);
      assert.strictEqual(custom.thresholds.default, 55);
    });

    it('saves to preset registry', () => {
      createCustomPreset('saved-preset', { thresholds: { default: 70 } });
      const retrieved = getPreset('saved-preset');
      assert.ok(retrieved);
      assert.strictEqual(retrieved.thresholds.default, 70);
    });
  });

  describe('recommendPreset', () => {
    it('suggests preset by task type', () => {
      const recommendation = recommendPreset({ task: 'quick-fix' });
      assert.strictEqual(recommendation, 'fast');
    });

    it('suggests balanced for normal work', () => {
      const recommendation = recommendPreset({ task: 'feature' });
      assert.strictEqual(recommendation, 'balanced');
    });

    it('suggests thorough for production', () => {
      const recommendation = recommendPreset({ task: 'release' });
      assert.ok(recommendation === 'thorough' || recommendation === 'critical');
    });

    it('suggests critical for security code', () => {
      const recommendation = recommendPreset({ task: 'security' });
      assert.strictEqual(recommendation, 'critical');
    });

    it('considers time constraints', () => {
      const rushed = recommendPreset({ task: 'feature', timeConstrained: true });
      const normal = recommendPreset({ task: 'feature', timeConstrained: false });
      const rushedPreset = getPreset(rushed);
      const normalPreset = getPreset(normal);
      assert.ok(rushedPreset.thresholds.default <= normalPreset.thresholds.default);
    });

    it('considers importance level', () => {
      const lowImportance = recommendPreset({ importance: 'low' });
      const highImportance = recommendPreset({ importance: 'high' });
      const lowPreset = getPreset(lowImportance);
      const highPreset = getPreset(highImportance);
      assert.ok(lowPreset.thresholds.default < highPreset.thresholds.default);
    });
  });

  describe('applyPreset', () => {
    it('updates current config with preset values', () => {
      const current = { thresholds: { default: 50 } };
      const updated = applyPreset(current, 'balanced');
      const balanced = getPreset('balanced');
      assert.strictEqual(updated.thresholds.default, balanced.thresholds.default);
    });

    it('preserves non-preset config', () => {
      const current = {
        thresholds: { default: 50 },
        customField: 'preserved',
      };
      const updated = applyPreset(current, 'fast');
      assert.strictEqual(updated.customField, 'preserved');
    });

    it('records applied preset name', () => {
      const current = {};
      const updated = applyPreset(current, 'thorough');
      assert.strictEqual(updated.appliedPreset, 'thorough');
    });

    it('returns new config without mutating original', () => {
      const current = { thresholds: { default: 50 } };
      const updated = applyPreset(current, 'balanced');
      assert.strictEqual(current.thresholds.default, 50);
      assert.notStrictEqual(updated.thresholds.default, 50);
    });
  });

  describe('listPresets', () => {
    it('returns all available presets', () => {
      const presets = listPresets();
      assert.ok(Array.isArray(presets));
      assert.ok(presets.length >= 4);
    });

    it('includes built-in presets', () => {
      const presets = listPresets();
      const names = presets.map((p) => p.name);
      assert.ok(names.includes('fast'));
      assert.ok(names.includes('balanced'));
      assert.ok(names.includes('thorough'));
      assert.ok(names.includes('critical'));
    });

    it('includes custom presets', () => {
      createCustomPreset('my-custom', { thresholds: { default: 77 } });
      const presets = listPresets();
      const names = presets.map((p) => p.name);
      assert.ok(names.includes('my-custom'));
    });

    it('returns preset descriptions', () => {
      const presets = listPresets();
      assert.ok(presets.every((p) => p.description));
    });

    it('returns preset threshold summaries', () => {
      const presets = listPresets({ summary: true });
      assert.ok(presets.every((p) => p.thresholdSummary !== undefined));
    });
  });
});
