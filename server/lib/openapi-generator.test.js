import { describe, it, expect } from 'vitest';
import {
  DEFAULT_INFO,
  STATUS_DESCRIPTIONS,
  createBaseDocument,
  generateParameterSchema,
  generateRequestBodySchema,
  generateResponseSchemas,
  generateOperation,
  addRouteToPath,
  collectTags,
  generateOpenAPIDocument,
  serializeToJSON,
  serializeToYAML,
  yamlStringify,
  validateDocument,
  createGenerator,
} from './openapi-generator.js';

describe('openapi-generator', () => {
  describe('createBaseDocument', () => {
    it('creates document with default info', () => {
      const doc = createBaseDocument();

      expect(doc.openapi).toBe('3.0.3');
      expect(doc.info.title).toBe('API Documentation');
      expect(doc.info.version).toBe('1.0.0');
      expect(doc.paths).toEqual({});
    });

    it('uses custom info', () => {
      const doc = createBaseDocument({
        info: {
          title: 'My API',
          version: '2.0.0',
          description: 'Custom description',
        },
      });

      expect(doc.info.title).toBe('My API');
      expect(doc.info.version).toBe('2.0.0');
      expect(doc.info.description).toBe('Custom description');
    });

    it('sets custom servers', () => {
      const doc = createBaseDocument({
        servers: [{ url: 'https://api.example.com' }],
      });

      expect(doc.servers[0].url).toBe('https://api.example.com');
    });

    it('includes empty components', () => {
      const doc = createBaseDocument();

      expect(doc.components.schemas).toEqual({});
      expect(doc.components.securitySchemes).toEqual({});
    });
  });

  describe('generateParameterSchema', () => {
    it('generates path parameter', () => {
      const schema = generateParameterSchema({
        name: 'id',
        in: 'path',
        required: true,
        type: 'string',
      });

      expect(schema.name).toBe('id');
      expect(schema.in).toBe('path');
      expect(schema.required).toBe(true);
      expect(schema.schema.type).toBe('string');
    });

    it('defaults to required', () => {
      const schema = generateParameterSchema({ name: 'id' });

      expect(schema.required).toBe(true);
    });

    it('defaults to string type', () => {
      const schema = generateParameterSchema({ name: 'id' });

      expect(schema.schema.type).toBe('string');
    });

    it('generates description', () => {
      const schema = generateParameterSchema({ name: 'userId' });

      expect(schema.description).toContain('userId');
    });
  });

  describe('generateRequestBodySchema', () => {
    it('returns null for no body', () => {
      expect(generateRequestBodySchema(null)).toBeNull();
      expect(generateRequestBodySchema({ hasBody: false })).toBeNull();
      expect(generateRequestBodySchema({ hasBody: true, fields: [] })).toBeNull();
    });

    it('generates schema from fields', () => {
      const schema = generateRequestBodySchema({
        hasBody: true,
        fields: ['name', 'email'],
      });

      expect(schema.required).toBe(true);
      expect(schema.content['application/json']).toBeDefined();
      expect(schema.content['application/json'].schema.properties.name).toBeDefined();
      expect(schema.content['application/json'].schema.properties.email).toBeDefined();
    });
  });

  describe('generateResponseSchemas', () => {
    it('returns default 200 for empty hints', () => {
      const responses = generateResponseSchemas([]);

      expect(responses['200']).toBeDefined();
      expect(responses['200'].description).toBe('Successful response');
    });

    it('generates responses from hints', () => {
      const responses = generateResponseSchemas([
        { status: 200, type: 'json' },
        { status: 404, type: 'json' },
      ]);

      expect(responses['200']).toBeDefined();
      expect(responses['404']).toBeDefined();
      expect(responses['404'].description).toBe('Not found');
    });

    it('handles unknown status codes', () => {
      const responses = generateResponseSchemas([
        { status: 418, type: 'json' },
      ]);

      expect(responses['418'].description).toBe('Status 418');
    });
  });

  describe('generateOperation', () => {
    it('generates operation from route', () => {
      const operation = generateOperation({
        method: 'GET',
        path: '/users/:id',
      });

      expect(operation.operationId).toBe('getUsersId');
      expect(operation.summary).toContain('GET');
      expect(operation.tags).toContain('users');
      expect(operation.parameters).toHaveLength(1);
      expect(operation.parameters[0].name).toBe('id');
    });

    it('includes request body for POST', () => {
      const operation = generateOperation({
        method: 'POST',
        path: '/users',
        requestBody: { hasBody: true, fields: ['name'] },
      });

      expect(operation.requestBody).toBeDefined();
      expect(operation.requestBody.content['application/json']).toBeDefined();
    });

    it('excludes request body for GET', () => {
      const operation = generateOperation({
        method: 'GET',
        path: '/users',
        requestBody: { hasBody: true, fields: ['name'] },
      });

      expect(operation.requestBody).toBeUndefined();
    });

    it('uses custom operation ID', () => {
      const operation = generateOperation({
        method: 'GET',
        path: '/users',
        operationId: 'listAllUsers',
      });

      expect(operation.operationId).toBe('listAllUsers');
    });

    it('uses custom tags', () => {
      const operation = generateOperation({
        method: 'GET',
        path: '/users',
        tags: ['authentication'],
      });

      expect(operation.tags).toContain('authentication');
    });

    it('includes security if specified', () => {
      const operation = generateOperation({
        method: 'GET',
        path: '/users',
        security: [{ bearerAuth: [] }],
      });

      expect(operation.security).toEqual([{ bearerAuth: [] }]);
    });
  });

  describe('addRouteToPath', () => {
    it('adds route to paths object', () => {
      const paths = {};
      addRouteToPath(paths, {
        method: 'GET',
        path: '/users',
      });

      expect(paths['/users']).toBeDefined();
      expect(paths['/users'].get).toBeDefined();
    });

    it('normalizes path parameters', () => {
      const paths = {};
      addRouteToPath(paths, {
        method: 'GET',
        path: '/users/:id',
      });

      expect(paths['/users/{id}']).toBeDefined();
    });

    it('adds multiple methods to same path', () => {
      const paths = {};
      addRouteToPath(paths, { method: 'GET', path: '/users' });
      addRouteToPath(paths, { method: 'POST', path: '/users' });

      expect(paths['/users'].get).toBeDefined();
      expect(paths['/users'].post).toBeDefined();
    });
  });

  describe('collectTags', () => {
    it('collects unique tags from routes', () => {
      const tags = collectTags([
        { path: '/users' },
        { path: '/users/:id' },
        { path: '/posts' },
      ]);

      expect(tags).toHaveLength(2);
      expect(tags.map(t => t.name)).toContain('users');
      expect(tags.map(t => t.name)).toContain('posts');
    });

    it('uses custom tags if provided', () => {
      const tags = collectTags([
        { path: '/users', tags: ['authentication'] },
      ]);

      expect(tags[0].name).toBe('authentication');
    });

    it('sorts tags alphabetically', () => {
      const tags = collectTags([
        { path: '/z-resource' },
        { path: '/a-resource' },
      ]);

      expect(tags[0].name).toBe('a-resource');
      expect(tags[1].name).toBe('z-resource');
    });
  });

  describe('generateOpenAPIDocument', () => {
    it('generates complete document from routes', () => {
      const doc = generateOpenAPIDocument([
        { method: 'GET', path: '/users' },
        { method: 'POST', path: '/users' },
        { method: 'GET', path: '/users/:id' },
      ]);

      expect(doc.openapi).toBe('3.0.3');
      expect(doc.paths['/users']).toBeDefined();
      expect(doc.paths['/users/{id}']).toBeDefined();
      expect(doc.tags).toHaveLength(1);
    });

    it('accepts custom options', () => {
      const doc = generateOpenAPIDocument([], {
        info: { title: 'Custom API' },
      });

      expect(doc.info.title).toBe('Custom API');
    });
  });

  describe('serializeToJSON', () => {
    it('serializes document to JSON', () => {
      const doc = createBaseDocument();
      const json = serializeToJSON(doc);

      expect(json).toContain('"openapi"');
      expect(JSON.parse(json)).toEqual(doc);
    });

    it('pretty prints by default', () => {
      const doc = createBaseDocument();
      const json = serializeToJSON(doc);

      expect(json).toContain('\n');
    });

    it('minifies when pretty is false', () => {
      const doc = createBaseDocument();
      const json = serializeToJSON(doc, false);

      expect(json).not.toContain('\n');
    });
  });

  describe('yamlStringify', () => {
    it('stringifies primitives', () => {
      expect(yamlStringify(null)).toBe('null');
      expect(yamlStringify(true)).toBe('true');
      expect(yamlStringify(false)).toBe('false');
      expect(yamlStringify(42)).toBe('42');
    });

    it('stringifies simple strings', () => {
      expect(yamlStringify('hello')).toBe('hello');
    });

    it('quotes strings with special chars', () => {
      expect(yamlStringify('hello: world')).toContain('"');
      expect(yamlStringify('line1\nline2')).toContain('"');
    });

    it('handles empty arrays', () => {
      expect(yamlStringify([])).toBe('[]');
    });

    it('handles empty objects', () => {
      expect(yamlStringify({})).toBe('{}');
    });

    it('stringifies arrays', () => {
      const yaml = yamlStringify(['a', 'b']);
      expect(yaml).toContain('- a');
      expect(yaml).toContain('- b');
    });

    it('stringifies objects', () => {
      const yaml = yamlStringify({ key: 'value' });
      expect(yaml).toContain('key: value');
    });
  });

  describe('serializeToYAML', () => {
    it('serializes document to YAML', () => {
      const doc = createBaseDocument();
      const yaml = serializeToYAML(doc);

      expect(yaml).toContain('openapi:');
      expect(yaml).toContain('info:');
      expect(yaml).toContain('paths:');
    });
  });

  describe('validateDocument', () => {
    it('validates correct document', () => {
      const doc = createBaseDocument();
      const result = validateDocument(doc);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('errors on missing openapi version', () => {
      const result = validateDocument({});

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: openapi');
    });

    it('errors on wrong openapi version', () => {
      const result = validateDocument({ openapi: '2.0' });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('3.x'))).toBe(true);
    });

    it('errors on missing info', () => {
      const result = validateDocument({ openapi: '3.0.3' });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: info');
    });

    it('errors on missing info.title', () => {
      const result = validateDocument({
        openapi: '3.0.3',
        info: { version: '1.0.0' },
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: info.title');
    });

    it('errors on path not starting with /', () => {
      const result = validateDocument({
        openapi: '3.0.3',
        info: { title: 'API', version: '1.0.0' },
        paths: { 'users': {} },
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('must start with /'))).toBe(true);
    });

    it('warns on missing responses', () => {
      const result = validateDocument({
        openapi: '3.0.3',
        info: { title: 'API', version: '1.0.0' },
        paths: { '/users': { get: {} } },
      });

      expect(result.warnings.some(w => w.includes('No responses'))).toBe(true);
    });
  });

  describe('createGenerator', () => {
    it('creates generator with methods', () => {
      const generator = createGenerator();

      expect(generator.generate).toBeDefined();
      expect(generator.toJSON).toBeDefined();
      expect(generator.toYAML).toBeDefined();
      expect(generator.validate).toBeDefined();
    });

    it('generates document with options', () => {
      const generator = createGenerator({
        info: { title: 'My API' },
      });
      const doc = generator.generate([]);

      expect(doc.info.title).toBe('My API');
    });

    it('validates generated document', () => {
      const generator = createGenerator();
      const doc = generator.generate([]);
      const result = generator.validate(doc);

      expect(result.valid).toBe(true);
    });
  });
});
