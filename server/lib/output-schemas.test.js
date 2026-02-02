import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import {
  loadSchema,
  validateOutput,
  buildPromptWithSchema,
  schemaToPromptInstructions,
  BUILTIN_SCHEMAS,
} from './output-schemas.js';

// Mock fs/promises
vi.mock('fs/promises');

describe('output-schemas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadSchema', () => {
    it('reads schema from file', async () => {
      const schema = {
        type: 'object',
        properties: { result: { type: 'string' } },
      };

      fs.readFile.mockResolvedValue(JSON.stringify(schema));

      const loaded = await loadSchema('/.tlc/schemas/test-schema.json');

      expect(loaded).toEqual(schema);
      expect(fs.readFile).toHaveBeenCalledWith('/.tlc/schemas/test-schema.json', 'utf8');
    });

    it('returns parsed JSON', async () => {
      const schema = {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          score: { type: 'number' },
        },
        required: ['summary'],
      };

      fs.readFile.mockResolvedValue(JSON.stringify(schema));

      const loaded = await loadSchema('/.tlc/schemas/review.json');

      expect(loaded.type).toBe('object');
      expect(loaded.properties.summary.type).toBe('string');
      expect(loaded.required).toContain('summary');
    });

    it('handles missing schema file', async () => {
      fs.readFile.mockRejectedValue(new Error('ENOENT: no such file'));

      await expect(loadSchema('/.tlc/schemas/missing.json'))
        .rejects.toThrow(/ENOENT|no such file/i);
    });

    it('handles invalid JSON', async () => {
      fs.readFile.mockResolvedValue('not valid json {');

      await expect(loadSchema('/.tlc/schemas/invalid.json'))
        .rejects.toThrow();
    });
  });

  describe('validateOutput', () => {
    const schema = {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        score: { type: 'integer', minimum: 0, maximum: 100 },
        approved: { type: 'boolean' },
      },
      required: ['summary', 'score', 'approved'],
    };

    it('passes valid data', () => {
      const data = {
        summary: 'Code looks good',
        score: 85,
        approved: true,
      };

      const result = validateOutput(data, schema);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('rejects invalid data', () => {
      const data = {
        summary: 'Code looks good',
        score: 'not a number', // Should be integer
        approved: true,
      };

      const result = validateOutput(data, schema);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects missing required fields', () => {
      const data = {
        summary: 'Code looks good',
        // Missing score and approved
      };

      const result = validateOutput(data, schema);

      expect(result.valid).toBe(false);
    });

    it('validates nested objects', () => {
      const nestedSchema = {
        type: 'object',
        properties: {
          issue: {
            type: 'object',
            properties: {
              severity: { type: 'string', enum: ['critical', 'moderate', 'suggestion'] },
              line: { type: 'integer' },
            },
            required: ['severity'],
          },
        },
      };

      const validData = {
        issue: { severity: 'critical', line: 42 },
      };

      const invalidData = {
        issue: { severity: 'invalid-severity' },
      };

      expect(validateOutput(validData, nestedSchema).valid).toBe(true);
      expect(validateOutput(invalidData, nestedSchema).valid).toBe(false);
    });
  });

  describe('BUILTIN_SCHEMAS', () => {
    it('has review-result schema', () => {
      const schema = BUILTIN_SCHEMAS['review-result'];

      expect(schema).toBeDefined();
      expect(schema.properties.summary).toBeDefined();
      expect(schema.properties.issues).toBeDefined();
      expect(schema.properties.score).toBeDefined();
      expect(schema.properties.approved).toBeDefined();
    });

    it('review-result has required fields', () => {
      const schema = BUILTIN_SCHEMAS['review-result'];

      expect(schema.required).toContain('summary');
      expect(schema.required).toContain('issues');
      expect(schema.required).toContain('score');
      expect(schema.required).toContain('approved');
    });

    it('has design-result schema', () => {
      const schema = BUILTIN_SCHEMAS['design-result'];

      expect(schema).toBeDefined();
      expect(schema.properties.mockups).toBeDefined();
      expect(schema.properties.rationale).toBeDefined();
    });

    it('design-result has required fields', () => {
      const schema = BUILTIN_SCHEMAS['design-result'];

      expect(schema.required).toContain('mockups');
      expect(schema.required).toContain('rationale');
    });

    it('has code-result schema', () => {
      const schema = BUILTIN_SCHEMAS['code-result'];

      expect(schema).toBeDefined();
      expect(schema.properties.files).toBeDefined();
      expect(schema.properties.explanation).toBeDefined();
    });

    it('code-result has required fields', () => {
      const schema = BUILTIN_SCHEMAS['code-result'];

      expect(schema.required).toContain('files');
      expect(schema.required).toContain('explanation');
    });
  });

  describe('buildPromptWithSchema', () => {
    it('injects schema into prompt', () => {
      const prompt = 'Review this code';
      const schema = {
        type: 'object',
        properties: { result: { type: 'string' } },
      };

      const result = buildPromptWithSchema(prompt, schema);

      expect(result).toContain('Review this code');
      expect(result).toContain('JSON');
    });

    it('includes schema structure', () => {
      const prompt = 'Analyze';
      const schema = {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          score: { type: 'integer' },
        },
        required: ['summary'],
      };

      const result = buildPromptWithSchema(prompt, schema);

      expect(result).toContain('summary');
      expect(result).toContain('score');
    });

    it('returns original prompt when no schema', () => {
      const prompt = 'Just a prompt';

      const result = buildPromptWithSchema(prompt, null);

      expect(result).toBe(prompt);
    });
  });

  describe('schemaToPromptInstructions', () => {
    it('creates text instructions from schema', () => {
      const schema = {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'A brief summary' },
          score: { type: 'integer', minimum: 0, maximum: 100 },
        },
        required: ['summary', 'score'],
      };

      const instructions = schemaToPromptInstructions(schema);

      expect(instructions).toContain('summary');
      expect(instructions).toContain('score');
      expect(instructions).toContain('required');
    });

    it('handles nested objects', () => {
      const schema = {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              value: { type: 'string' },
            },
          },
        },
      };

      const instructions = schemaToPromptInstructions(schema);

      expect(instructions).toContain('data');
      expect(instructions).toContain('value');
    });

    it('handles arrays', () => {
      const schema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      };

      const instructions = schemaToPromptInstructions(schema);

      expect(instructions).toContain('items');
      expect(instructions).toContain('array');
    });

    it('includes enum values', () => {
      const schema = {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['pending', 'approved', 'rejected'],
          },
        },
      };

      const instructions = schemaToPromptInstructions(schema);

      expect(instructions).toContain('pending');
      expect(instructions).toContain('approved');
      expect(instructions).toContain('rejected');
    });
  });
});
