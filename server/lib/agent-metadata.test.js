import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AgentMetadata,
  createMetadata,
  MODEL_PRICING,
} from './agent-metadata.js';

describe('AgentMetadata', () => {
  let metadata;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-02T12:00:00Z'));
  });

  describe('createMetadata', () => {
    it('initializes with model and task', () => {
      metadata = createMetadata({
        model: 'claude-3-opus',
        taskType: 'code-review',
        parameters: { files: ['test.js'] },
      });

      expect(metadata.model).toBe('claude-3-opus');
      expect(metadata.taskType).toBe('code-review');
      expect(metadata.parameters).toEqual({ files: ['test.js'] });
    });

    it('sets initial token counts to zero', () => {
      metadata = createMetadata({
        model: 'claude-3-opus',
        taskType: 'analysis',
      });

      expect(metadata.inputTokens).toBe(0);
      expect(metadata.outputTokens).toBe(0);
      expect(metadata.totalTokens).toBe(0);
    });

    it('records start timestamp', () => {
      metadata = createMetadata({
        model: 'claude-3-opus',
        taskType: 'generation',
      });

      expect(metadata.startedAt).toBe(new Date('2026-02-02T12:00:00Z').getTime());
    });

    it('initializes cost to zero', () => {
      metadata = createMetadata({
        model: 'claude-3-opus',
        taskType: 'analysis',
      });

      expect(metadata.cost).toBe(0);
    });

    it('sets frozen to false initially', () => {
      metadata = createMetadata({
        model: 'claude-3-opus',
        taskType: 'generation',
      });

      expect(metadata.frozen).toBe(false);
    });
  });

  describe('updateTokens', () => {
    beforeEach(() => {
      metadata = createMetadata({
        model: 'claude-3-opus',
        taskType: 'analysis',
      });
    });

    it('adds input tokens', () => {
      metadata.updateTokens({ input: 100 });

      expect(metadata.inputTokens).toBe(100);
    });

    it('adds output tokens', () => {
      metadata.updateTokens({ output: 50 });

      expect(metadata.outputTokens).toBe(50);
    });

    it('calculates total tokens', () => {
      metadata.updateTokens({ input: 100, output: 50 });

      expect(metadata.totalTokens).toBe(150);
    });

    it('accumulates across multiple updates', () => {
      metadata.updateTokens({ input: 100, output: 50 });
      metadata.updateTokens({ input: 200, output: 75 });

      expect(metadata.inputTokens).toBe(300);
      expect(metadata.outputTokens).toBe(125);
      expect(metadata.totalTokens).toBe(425);
    });

    it('returns self for chaining', () => {
      const result = metadata.updateTokens({ input: 100 });

      expect(result).toBe(metadata);
    });
  });

  describe('calculateCost', () => {
    it('uses model pricing for claude-3-opus', () => {
      metadata = createMetadata({
        model: 'claude-3-opus',
        taskType: 'analysis',
      });
      metadata.updateTokens({ input: 1000, output: 500 });

      const cost = metadata.calculateCost();

      // claude-3-opus: $15/1M input, $75/1M output
      const expectedCost = (1000 * 15 / 1_000_000) + (500 * 75 / 1_000_000);
      expect(cost).toBeCloseTo(expectedCost, 6);
      expect(metadata.cost).toBeCloseTo(expectedCost, 6);
    });

    it('uses model pricing for claude-3-sonnet', () => {
      metadata = createMetadata({
        model: 'claude-3-sonnet',
        taskType: 'analysis',
      });
      metadata.updateTokens({ input: 1000, output: 500 });

      const cost = metadata.calculateCost();

      // claude-3-sonnet: $3/1M input, $15/1M output
      const expectedCost = (1000 * 3 / 1_000_000) + (500 * 15 / 1_000_000);
      expect(cost).toBeCloseTo(expectedCost, 6);
    });

    it('uses model pricing for claude-3-haiku', () => {
      metadata = createMetadata({
        model: 'claude-3-haiku',
        taskType: 'analysis',
      });
      metadata.updateTokens({ input: 1000, output: 500 });

      const cost = metadata.calculateCost();

      // claude-3-haiku: $0.25/1M input, $1.25/1M output
      const expectedCost = (1000 * 0.25 / 1_000_000) + (500 * 1.25 / 1_000_000);
      expect(cost).toBeCloseTo(expectedCost, 6);
    });

    it('handles unknown models with default pricing', () => {
      metadata = createMetadata({
        model: 'unknown-model',
        taskType: 'analysis',
      });
      metadata.updateTokens({ input: 1000, output: 500 });

      const cost = metadata.calculateCost();

      // default: $1/1M input, $3/1M output
      const expectedCost = (1000 * 1 / 1_000_000) + (500 * 3 / 1_000_000);
      expect(cost).toBeCloseTo(expectedCost, 6);
    });

    it('returns zero cost when no tokens', () => {
      metadata = createMetadata({
        model: 'claude-3-opus',
        taskType: 'analysis',
      });

      const cost = metadata.calculateCost();

      expect(cost).toBe(0);
    });
  });

  describe('setDuration', () => {
    beforeEach(() => {
      metadata = createMetadata({
        model: 'claude-3-opus',
        taskType: 'analysis',
      });
    });

    it('records elapsed time in milliseconds', () => {
      // Advance time by 5 seconds
      vi.advanceTimersByTime(5000);

      metadata.setDuration();

      expect(metadata.duration).toBe(5000);
    });

    it('records completion timestamp', () => {
      vi.advanceTimersByTime(5000);

      metadata.setDuration();

      expect(metadata.completedAt).toBe(new Date('2026-02-02T12:00:05Z').getTime());
    });

    it('returns self for chaining', () => {
      const result = metadata.setDuration();

      expect(result).toBe(metadata);
    });
  });

  describe('freeze', () => {
    beforeEach(() => {
      metadata = createMetadata({
        model: 'claude-3-opus',
        taskType: 'analysis',
      });
      metadata.updateTokens({ input: 100, output: 50 });
    });

    it('prevents further token updates', () => {
      metadata.freeze();

      expect(() => metadata.updateTokens({ input: 100 })).toThrow();
      expect(metadata.inputTokens).toBe(100);
    });

    it('prevents setting duration again', () => {
      metadata.setDuration();
      metadata.freeze();

      expect(() => metadata.setDuration()).toThrow();
    });

    it('sets frozen flag to true', () => {
      metadata.freeze();

      expect(metadata.frozen).toBe(true);
    });

    it('automatically calculates final cost', () => {
      metadata.freeze();

      expect(metadata.cost).toBeGreaterThan(0);
    });

    it('returns self for chaining', () => {
      const result = metadata.freeze();

      expect(result).toBe(metadata);
    });
  });

  describe('toJSON', () => {
    it('serializes all fields', () => {
      metadata = createMetadata({
        model: 'claude-3-opus',
        taskType: 'code-review',
        parameters: { files: ['test.js'] },
      });
      metadata.updateTokens({ input: 1000, output: 500 });
      vi.advanceTimersByTime(5000);
      metadata.setDuration();
      metadata.freeze();

      const json = metadata.toJSON();

      expect(json).toMatchObject({
        model: 'claude-3-opus',
        taskType: 'code-review',
        parameters: { files: ['test.js'] },
        inputTokens: 1000,
        outputTokens: 500,
        totalTokens: 1500,
        duration: 5000,
        frozen: true,
      });
      expect(json.startedAt).toBeDefined();
      expect(json.completedAt).toBeDefined();
      expect(json.cost).toBeGreaterThan(0);
    });

    it('returns plain object, not instance', () => {
      metadata = createMetadata({
        model: 'claude-3-opus',
        taskType: 'analysis',
      });

      const json = metadata.toJSON();

      expect(json).not.toBeInstanceOf(AgentMetadata);
      expect(typeof json.updateTokens).toBe('undefined');
    });
  });

  describe('fromJSON', () => {
    it('deserializes correctly', () => {
      const original = createMetadata({
        model: 'claude-3-opus',
        taskType: 'code-review',
        parameters: { files: ['test.js'] },
      });
      original.updateTokens({ input: 1000, output: 500 });
      vi.advanceTimersByTime(5000);
      original.setDuration();
      original.freeze();

      const json = original.toJSON();
      const restored = AgentMetadata.fromJSON(json);

      expect(restored.model).toBe('claude-3-opus');
      expect(restored.taskType).toBe('code-review');
      expect(restored.parameters).toEqual({ files: ['test.js'] });
      expect(restored.inputTokens).toBe(1000);
      expect(restored.outputTokens).toBe(500);
      expect(restored.totalTokens).toBe(1500);
      expect(restored.duration).toBe(5000);
      expect(restored.frozen).toBe(true);
    });

    it('restored metadata is immutable if original was frozen', () => {
      const original = createMetadata({
        model: 'claude-3-opus',
        taskType: 'analysis',
      });
      original.freeze();

      const restored = AgentMetadata.fromJSON(original.toJSON());

      expect(() => restored.updateTokens({ input: 100 })).toThrow();
    });

    it('restored metadata is mutable if original was not frozen', () => {
      const original = createMetadata({
        model: 'claude-3-opus',
        taskType: 'analysis',
      });

      const restored = AgentMetadata.fromJSON(original.toJSON());
      restored.updateTokens({ input: 100 });

      expect(restored.inputTokens).toBe(100);
    });
  });

  describe('validates required fields', () => {
    it('throws if model is missing', () => {
      expect(() => createMetadata({
        taskType: 'analysis',
      })).toThrow('model is required');
    });

    it('throws if taskType is missing', () => {
      expect(() => createMetadata({
        model: 'claude-3-opus',
      })).toThrow('taskType is required');
    });

    it('accepts valid minimal config', () => {
      expect(() => createMetadata({
        model: 'claude-3-opus',
        taskType: 'analysis',
      })).not.toThrow();
    });
  });

  describe('MODEL_PRICING', () => {
    it('exports pricing constants', () => {
      expect(MODEL_PRICING).toBeDefined();
      expect(MODEL_PRICING['claude-3-opus']).toBeDefined();
      expect(MODEL_PRICING['claude-3-sonnet']).toBeDefined();
      expect(MODEL_PRICING['claude-3-haiku']).toBeDefined();
      expect(MODEL_PRICING['default']).toBeDefined();
    });

    it('has input and output rates for each model', () => {
      for (const model of Object.keys(MODEL_PRICING)) {
        expect(MODEL_PRICING[model].input).toBeTypeOf('number');
        expect(MODEL_PRICING[model].output).toBeTypeOf('number');
      }
    });
  });
});
