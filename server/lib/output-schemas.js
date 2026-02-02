/**
 * Output Schemas - Standard JSON schemas for provider outputs
 *
 * Ensures consistent output format across all providers.
 */

import fs from 'fs/promises';

/**
 * Built-in schemas for common operations
 */
export const BUILTIN_SCHEMAS = {
  'review-result': {
    type: 'object',
    properties: {
      summary: { type: 'string', description: 'Brief summary of the review' },
      issues: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            severity: {
              type: 'string',
              enum: ['critical', 'moderate', 'suggestion'],
              description: 'Issue severity level',
            },
            file: { type: 'string', description: 'File path' },
            line: { type: 'integer', description: 'Line number' },
            title: { type: 'string', description: 'Issue title' },
            description: { type: 'string', description: 'Detailed description' },
            suggestion: { type: 'string', description: 'Suggested fix' },
          },
          required: ['severity', 'file', 'title', 'description'],
        },
      },
      score: {
        type: 'integer',
        minimum: 0,
        maximum: 100,
        description: 'Overall code quality score',
      },
      approved: { type: 'boolean', description: 'Whether the code is approved' },
    },
    required: ['summary', 'issues', 'score', 'approved'],
  },

  'design-result': {
    type: 'object',
    properties: {
      mockups: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Mockup name' },
            description: { type: 'string', description: 'Mockup description' },
            imageUrl: { type: 'string', description: 'Generated image URL' },
            components: {
              type: 'array',
              items: { type: 'string' },
              description: 'UI components used',
            },
          },
          required: ['name', 'description'],
        },
      },
      rationale: { type: 'string', description: 'Design rationale' },
      alternatives: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            tradeoffs: { type: 'string' },
          },
        },
        description: 'Alternative design approaches',
      },
    },
    required: ['mockups', 'rationale'],
  },

  'code-result': {
    type: 'object',
    properties: {
      files: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path' },
            content: { type: 'string', description: 'File content' },
            action: {
              type: 'string',
              enum: ['create', 'modify', 'delete'],
              description: 'Action to take',
            },
          },
          required: ['path', 'content', 'action'],
        },
      },
      explanation: { type: 'string', description: 'Explanation of changes' },
      tests: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
          },
        },
        description: 'Suggested tests',
      },
    },
    required: ['files', 'explanation'],
  },
};

/**
 * Load a schema from file
 * @param {string} filePath - Path to schema file
 * @returns {Promise<Object>} Parsed schema
 */
export async function loadSchema(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

/**
 * Validate output against a schema
 * @param {any} data - Data to validate
 * @param {Object} schema - JSON schema
 * @returns {Object} Validation result { valid, errors }
 */
export function validateOutput(data, schema) {
  const errors = [];

  function validate(value, schemaNode, path = '') {
    if (!schemaNode) return;

    // Type validation
    if (schemaNode.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      const expectedType = schemaNode.type;

      // Handle integer as number
      if (expectedType === 'integer') {
        if (typeof value !== 'number' || !Number.isInteger(value)) {
          errors.push(`${path}: expected integer, got ${actualType}`);
          return;
        }
      } else if (expectedType !== actualType) {
        errors.push(`${path}: expected ${expectedType}, got ${actualType}`);
        return;
      }
    }

    // Enum validation
    if (schemaNode.enum && !schemaNode.enum.includes(value)) {
      errors.push(`${path}: value must be one of: ${schemaNode.enum.join(', ')}`);
    }

    // Number constraints
    if (typeof value === 'number') {
      if (schemaNode.minimum !== undefined && value < schemaNode.minimum) {
        errors.push(`${path}: value must be >= ${schemaNode.minimum}`);
      }
      if (schemaNode.maximum !== undefined && value > schemaNode.maximum) {
        errors.push(`${path}: value must be <= ${schemaNode.maximum}`);
      }
    }

    // Object validation
    if (schemaNode.type === 'object' && typeof value === 'object' && value !== null) {
      // Required fields
      if (schemaNode.required) {
        for (const field of schemaNode.required) {
          if (!(field in value)) {
            errors.push(`${path}.${field}: required field missing`);
          }
        }
      }

      // Validate properties
      if (schemaNode.properties) {
        for (const [key, propSchema] of Object.entries(schemaNode.properties)) {
          if (key in value) {
            validate(value[key], propSchema, `${path}.${key}`);
          }
        }
      }
    }

    // Array validation
    if (schemaNode.type === 'array' && Array.isArray(value)) {
      if (schemaNode.items) {
        value.forEach((item, index) => {
          validate(item, schemaNode.items, `${path}[${index}]`);
        });
      }
    }
  }

  validate(data, schema, 'root');

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Convert schema to human-readable prompt instructions
 * @param {Object} schema - JSON schema
 * @returns {string} Text instructions
 */
export function schemaToPromptInstructions(schema) {
  const lines = ['Your response must be valid JSON matching this structure:'];

  function describeSchema(node, indent = 0) {
    const prefix = '  '.repeat(indent);

    if (node.type === 'object' && node.properties) {
      lines.push(`${prefix}{`);

      for (const [key, prop] of Object.entries(node.properties)) {
        const required = node.required?.includes(key) ? ' (required)' : '';
        const type = prop.type || 'any';

        if (prop.enum) {
          lines.push(`${prefix}  "${key}": one of [${prop.enum.join(', ')}]${required}`);
        } else if (type === 'object' && prop.properties) {
          lines.push(`${prefix}  "${key}": {${required}`);
          describeSchema(prop, indent + 2);
          lines.push(`${prefix}  }`);
        } else if (type === 'array') {
          lines.push(`${prefix}  "${key}": array of ${prop.items?.type || 'items'}${required}`);
        } else {
          lines.push(`${prefix}  "${key}": ${type}${required}`);
        }
      }

      lines.push(`${prefix}}`);
    }
  }

  describeSchema(schema);

  return lines.join('\n');
}

/**
 * Build a prompt that includes schema instructions
 * @param {string} prompt - Original prompt
 * @param {Object} schema - JSON schema
 * @returns {string} Enhanced prompt
 */
export function buildPromptWithSchema(prompt, schema) {
  if (!schema) return prompt;

  const instructions = schemaToPromptInstructions(schema);

  return `${prompt}

${instructions}

Respond ONLY with valid JSON matching the above structure.`;
}
