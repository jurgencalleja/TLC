/**
 * Output Schemas - Standard JSON schemas for provider outputs
 * Phase 33, Task 6
 */

import { readFile } from 'fs/promises';
import { join } from 'path';

// Built-in schemas
export const reviewResultSchema = {
  type: 'object',
  required: ['summary', 'issues', 'score', 'approved'],
  properties: {
    summary: { type: 'string', description: 'Brief summary of the review' },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['error', 'warning', 'info'] },
          message: { type: 'string' },
          file: { type: 'string' },
          line: { type: 'number' },
        },
      },
    },
    score: { type: 'number', minimum: 0, maximum: 100 },
    approved: { type: 'boolean' },
  },
};

export const designResultSchema = {
  type: 'object',
  required: ['mockups', 'rationale', 'alternatives'],
  properties: {
    mockups: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          imageUrl: { type: 'string' },
        },
      },
    },
    rationale: { type: 'string' },
    alternatives: {
      type: 'array',
      items: { type: 'string' },
    },
  },
};

export const codeResultSchema = {
  type: 'object',
  required: ['files', 'explanation', 'tests'],
  properties: {
    files: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          content: { type: 'string' },
          action: { type: 'string', enum: ['create', 'modify', 'delete'] },
        },
      },
    },
    explanation: { type: 'string' },
    tests: {
      type: 'array',
      items: { type: 'string' },
    },
  },
};

/**
 * Load schema from file
 */
export async function loadSchema(name) {
  const schemaPath = join(process.cwd(), '.tlc', 'schemas', name + '.json');
  const content = await readFile(schemaPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Validate output against schema
 */
export function validateOutput(data, schema) {
  const errors = [];

  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in data)) {
        errors.push('Missing required field: ' + field);
      }
    }
  }

  // Check type
  if (schema.type === 'object' && typeof data !== 'object') {
    errors.push('Expected object');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Build prompt with schema instructions
 */
export function buildPromptWithSchema(prompt, schema) {
  const instructions = schemaToPromptInstructions(schema);
  return prompt + '\n\nRespond with JSON matching this schema:\n' + instructions;
}

/**
 * Convert schema to human-readable instructions
 */
export function schemaToPromptInstructions(schema) {
  const lines = ['{\n'];

  if (schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties)) {
      const desc = prop.description || prop.type;
      lines.push('  "' + key + '": // ' + desc + '\n');
    }
  }

  lines.push('}');
  return lines.join('');
}

export default {
  loadSchema,
  validateOutput,
  reviewResultSchema,
  designResultSchema,
  codeResultSchema,
  buildPromptWithSchema,
  schemaToPromptInstructions,
};
