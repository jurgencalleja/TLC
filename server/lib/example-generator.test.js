import { describe, it, expect } from 'vitest';
import {
  SAMPLE_VALUES,
  getSampleValue,
  generateSampleObject,
  generateRequestExample,
  generateResponseExample,
  generateGenericResponse,
  getErrorMessage,
  generateCurlCommand,
  generateCurlFromOperation,
  generateOperationExamples,
  createExampleGenerator,
} from './example-generator.js';

describe('example-generator', () => {
  describe('SAMPLE_VALUES', () => {
    it('has common types', () => {
      expect(SAMPLE_VALUES.string).toBeDefined();
      expect(SAMPLE_VALUES.integer).toBeDefined();
      expect(SAMPLE_VALUES.boolean).toBeDefined();
    });

    it('has formatted values', () => {
      expect(SAMPLE_VALUES.email).toContain('@');
      expect(SAMPLE_VALUES.uuid).toMatch(/^[a-f0-9-]+$/);
      expect(SAMPLE_VALUES.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getSampleValue', () => {
    it('returns string for string type', () => {
      expect(typeof getSampleValue({ type: 'string' })).toBe('string');
    });

    it('returns number for integer type', () => {
      expect(typeof getSampleValue({ type: 'integer' })).toBe('number');
    });

    it('returns boolean for boolean type', () => {
      expect(typeof getSampleValue({ type: 'boolean' })).toBe('boolean');
    });

    it('respects format over type', () => {
      const value = getSampleValue({ type: 'string', format: 'email' });
      expect(value).toContain('@');
    });

    it('uses field name hints', () => {
      expect(getSampleValue({ type: 'string' }, 'email')).toContain('@');
      expect(getSampleValue({ type: 'string' }, 'userName')).toBe('John Doe');
    });

    it('handles arrays', () => {
      const value = getSampleValue({
        type: 'array',
        items: { type: 'string' },
      });
      expect(Array.isArray(value)).toBe(true);
    });

    it('handles objects', () => {
      const value = getSampleValue({
        type: 'object',
        properties: { name: { type: 'string' } },
      });
      expect(typeof value).toBe('object');
      expect(value.name).toBeDefined();
    });
  });

  describe('generateSampleObject', () => {
    it('generates object from schema', () => {
      const schema = {
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
        },
      };

      const sample = generateSampleObject(schema);

      expect(sample.id).toBe(1);
      expect(sample.name).toBe('John Doe');
      expect(sample.email).toContain('@');
    });

    it('returns empty object for no properties', () => {
      const sample = generateSampleObject({});
      expect(sample).toEqual({});
    });
  });

  describe('generateRequestExample', () => {
    it('generates from JSON content', () => {
      const operation = {
        requestBody: {
          content: {
            'application/json': {
              schema: {
                properties: {
                  name: { type: 'string' },
                },
              },
            },
          },
        },
      };

      const example = generateRequestExample(operation);

      expect(example).toBeDefined();
      expect(example.name).toBeDefined();
    });

    it('returns null for no body', () => {
      expect(generateRequestExample({})).toBeNull();
    });
  });

  describe('generateResponseExample', () => {
    it('generates from schema', () => {
      const operation = {
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  properties: {
                    data: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      };

      const example = generateResponseExample(operation, '200');

      expect(example).toBeDefined();
    });

    it('generates generic for no schema', () => {
      const operation = {
        responses: {
          '200': {},
        },
      };

      const example = generateResponseExample(operation, '200');

      expect(example.success).toBe(true);
    });

    it('generates error response', () => {
      const operation = {
        responses: {
          '404': {},
        },
      };

      const example = generateResponseExample(operation, '404');

      expect(example.error).toBeDefined();
    });
  });

  describe('generateGenericResponse', () => {
    it('generates success for 2xx', () => {
      expect(generateGenericResponse('200').success).toBe(true);
      expect(generateGenericResponse('201').success).toBe(true);
    });

    it('generates error for 4xx', () => {
      expect(generateGenericResponse('400').error).toBeDefined();
      expect(generateGenericResponse('404').error).toBeDefined();
    });

    it('generates error for 5xx', () => {
      expect(generateGenericResponse('500').error).toBeDefined();
    });
  });

  describe('getErrorMessage', () => {
    it('returns message for known codes', () => {
      expect(getErrorMessage('400')).toContain('Bad request');
      expect(getErrorMessage('401')).toContain('Unauthorized');
      expect(getErrorMessage('404')).toContain('not found');
    });

    it('returns default for unknown', () => {
      expect(getErrorMessage('499')).toBe('Request failed');
    });
  });

  describe('generateCurlCommand', () => {
    it('generates GET request', () => {
      const curl = generateCurlCommand({
        method: 'GET',
        url: 'http://api.example.com/users',
      });

      expect(curl).toContain('curl');
      expect(curl).toContain('http://api.example.com/users');
      expect(curl).not.toContain('-X GET');
    });

    it('generates POST with body', () => {
      const curl = generateCurlCommand({
        method: 'POST',
        url: 'http://api.example.com/users',
        body: { name: 'John' },
      });

      expect(curl).toContain('-X POST');
      expect(curl).toContain('-d');
      expect(curl).toContain('name');
      expect(curl).toContain('Content-Type: application/json');
    });

    it('adds headers', () => {
      const curl = generateCurlCommand({
        method: 'GET',
        url: 'http://api.example.com/users',
        headers: { 'X-Custom': 'value' },
      });

      expect(curl).toContain("'X-Custom: value'");
    });

    it('substitutes path params', () => {
      const curl = generateCurlCommand({
        method: 'GET',
        url: 'http://api.example.com/users/{id}',
        pathParams: { id: '123' },
      });

      expect(curl).toContain('/users/123');
      expect(curl).not.toContain('{id}');
    });

    it('adds query params', () => {
      const curl = generateCurlCommand({
        method: 'GET',
        url: 'http://api.example.com/users',
        queryParams: { page: 1, limit: 10 },
      });

      expect(curl).toContain('page=1');
      expect(curl).toContain('limit=10');
    });

    it('adds bearer auth', () => {
      const curl = generateCurlCommand({
        method: 'GET',
        url: 'http://api.example.com/users',
        auth: { type: 'bearer', token: 'abc123' },
      });

      expect(curl).toContain('Authorization: Bearer abc123');
    });

    it('adds basic auth', () => {
      const curl = generateCurlCommand({
        method: 'GET',
        url: 'http://api.example.com/users',
        auth: { type: 'basic', credentials: 'dXNlcjpwYXNz' },
      });

      expect(curl).toContain('Authorization: Basic');
    });

    it('adds API key auth', () => {
      const curl = generateCurlCommand({
        method: 'GET',
        url: 'http://api.example.com/users',
        auth: { type: 'apiKey', name: 'X-API-Key', in: 'header', value: 'key123' },
      });

      expect(curl).toContain('X-API-Key: key123');
    });
  });

  describe('generateCurlFromOperation', () => {
    it('generates curl from operation', () => {
      const operation = {
        parameters: [
          { name: 'id', in: 'path', schema: { type: 'integer' } },
        ],
      };

      const curl = generateCurlFromOperation('/users/{id}', 'GET', operation);

      expect(curl).toContain('curl');
      expect(curl).toContain('/users/');
    });

    it('includes request body', () => {
      const operation = {
        requestBody: {
          content: {
            'application/json': {
              schema: {
                properties: { name: { type: 'string' } },
              },
            },
          },
        },
      };

      const curl = generateCurlFromOperation('/users', 'POST', operation);

      expect(curl).toContain('-X POST');
      expect(curl).toContain('-d');
    });

    it('handles security', () => {
      const operation = {
        security: [{ bearerAuth: [] }],
      };

      const curl = generateCurlFromOperation('/users', 'GET', operation);

      expect(curl).toContain('Authorization: Bearer');
    });
  });

  describe('generateOperationExamples', () => {
    it('generates all examples', () => {
      const operation = {
        requestBody: {
          content: {
            'application/json': {
              schema: { properties: { name: { type: 'string' } } },
            },
          },
        },
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: { properties: { id: { type: 'integer' } } },
              },
            },
          },
          '404': {},
        },
      };

      const examples = generateOperationExamples('/users', 'POST', operation);

      expect(examples.curl).toContain('curl');
      expect(examples.request).toBeDefined();
      expect(examples.responses['200']).toBeDefined();
      expect(examples.responses['404']).toBeDefined();
    });
  });

  describe('createExampleGenerator', () => {
    it('creates generator with methods', () => {
      const generator = createExampleGenerator();

      expect(generator.getSampleValue).toBeDefined();
      expect(generator.generateCurlCommand).toBeDefined();
      expect(generator.generateOperationExamples).toBeDefined();
    });

    it('uses custom base URL', () => {
      const generator = createExampleGenerator({ baseUrl: 'https://api.example.com' });
      const curl = generator.generateCurlFromOperation('/test', 'GET', {});

      expect(curl).toContain('https://api.example.com');
    });
  });
});
