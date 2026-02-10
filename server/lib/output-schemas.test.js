import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import {
  loadSchema,
  validateOutput,
  reviewResultSchema,
  designResultSchema,
  codeResultSchema,
  buildPromptWithSchema,
  schemaToPromptInstructions,
} from './output-schemas.js';

const schemasDir = join(process.cwd(), '.tlc', 'schemas');
const testSchema = { type: 'object', required: ['summary'], properties: { summary: { type: 'string' } } };

describe('Output Schemas', () => {
  describe('loadSchema', () => {
    beforeEach(() => {
      mkdirSync(schemasDir, { recursive: true });
      writeFileSync(join(schemasDir, 'review-result.json'), JSON.stringify(testSchema));
    });

    afterEach(() => {
      rmSync(join(schemasDir, 'review-result.json'), { force: true });
    });

    it('reads from file', async () => {
      const schema = await loadSchema('review-result');
      expect(schema).toBeDefined();
    });

    it('returns parsed JSON', async () => {
      const schema = await loadSchema('review-result');
      expect(schema).toHaveProperty('type');
    });

    it('handles missing schema file', async () => {
      await expect(loadSchema('nonexistent')).rejects.toThrow();
    });
  });

  describe('validateOutput', () => {
    it('passes valid data', () => {
      const schema = {
        type: 'object',
        required: ['summary'],
        properties: {
          summary: { type: 'string' },
        },
      };

      const result = validateOutput({ summary: 'Test' }, schema);
      expect(result.valid).toBe(true);
    });

    it('rejects invalid data', () => {
      const schema = {
        type: 'object',
        required: ['summary'],
        properties: {
          summary: { type: 'string' },
        },
      };

      const result = validateOutput({ other: 'field' }, schema);
      expect(result.valid).toBe(false);
    });
  });

  describe('Built-in Schemas', () => {
    it('reviewResultSchema has required fields', () => {
      expect(reviewResultSchema.properties).toHaveProperty('summary');
      expect(reviewResultSchema.properties).toHaveProperty('issues');
      expect(reviewResultSchema.properties).toHaveProperty('score');
      expect(reviewResultSchema.properties).toHaveProperty('approved');
    });

    it('designResultSchema has required fields', () => {
      expect(designResultSchema.properties).toHaveProperty('mockups');
      expect(designResultSchema.properties).toHaveProperty('rationale');
      expect(designResultSchema.properties).toHaveProperty('alternatives');
    });

    it('codeResultSchema has required fields', () => {
      expect(codeResultSchema.properties).toHaveProperty('files');
      expect(codeResultSchema.properties).toHaveProperty('explanation');
      expect(codeResultSchema.properties).toHaveProperty('tests');
    });
  });

  describe('buildPromptWithSchema', () => {
    it('injects schema into prompt', () => {
      const prompt = 'Review this code';
      const schema = { type: 'object', properties: { summary: { type: 'string' } } };

      const enhanced = buildPromptWithSchema(prompt, schema);

      expect(enhanced).toContain('Review this code');
      expect(enhanced).toContain('JSON');
    });
  });

  describe('schemaToPromptInstructions', () => {
    it('creates text instructions', () => {
      const schema = {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'Brief summary' },
          score: { type: 'number', description: 'Quality score 0-100' },
        },
      };

      const instructions = schemaToPromptInstructions(schema);

      expect(instructions).toContain('summary');
      expect(instructions).toContain('score');
    });
  });
});
