import { describe, it, expect } from 'vitest';
import {
  convertToMcpSchema,
  generateToolName,
  generateToolDescription,
  extractInputSchema,
  extractOutputSchema,
  operationToMcpTool,
  specToMcpTools,
  generateMcpManifest,
  generateToolExample,
  getExampleValue,
  formatToolsList,
  createMcpFormatGenerator,
} from './mcp-format.js';

describe('mcp-format', () => {
  describe('convertToMcpSchema', () => {
    it('converts basic types', () => {
      expect(convertToMcpSchema({ type: 'string' })).toEqual({ type: 'string' });
      expect(convertToMcpSchema({ type: 'integer' })).toEqual({ type: 'integer' });
      expect(convertToMcpSchema({ type: 'boolean' })).toEqual({ type: 'boolean' });
    });

    it('preserves format', () => {
      const schema = convertToMcpSchema({ type: 'string', format: 'email' });
      expect(schema.format).toBe('email');
    });

    it('preserves description', () => {
      const schema = convertToMcpSchema({ type: 'string', description: 'A field' });
      expect(schema.description).toBe('A field');
    });

    it('preserves enum', () => {
      const schema = convertToMcpSchema({ type: 'string', enum: ['a', 'b'] });
      expect(schema.enum).toEqual(['a', 'b']);
    });

    it('converts nested objects', () => {
      const schema = convertToMcpSchema({
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
      });

      expect(schema.properties.name.type).toBe('string');
      expect(schema.required).toContain('name');
    });

    it('converts arrays', () => {
      const schema = convertToMcpSchema({
        type: 'array',
        items: { type: 'string' },
      });

      expect(schema.items.type).toBe('string');
    });

    it('handles null/undefined', () => {
      expect(convertToMcpSchema(null).type).toBe('string');
      expect(convertToMcpSchema(undefined).type).toBe('string');
    });
  });

  describe('generateToolName', () => {
    it('uses operation ID if available', () => {
      expect(generateToolName('GET', '/users', 'listUsers')).toBe('list_users');
      expect(generateToolName('POST', '/users', 'createUser')).toBe('create_user');
    });

    it('generates from path if no operation ID', () => {
      expect(generateToolName('GET', '/users')).toBe('get_users');
      expect(generateToolName('POST', '/users/{id}')).toBe('post_users_id');
    });

    it('cleans path parameters', () => {
      expect(generateToolName('GET', '/users/:id')).toBe('get_users_id');
      expect(generateToolName('GET', '/users/{userId}')).toBe('get_users_userId');
    });
  });

  describe('generateToolDescription', () => {
    it('uses summary if available', () => {
      const op = { summary: 'List all users' };
      expect(generateToolDescription(op, 'GET', '/users')).toBe('List all users');
    });

    it('uses first sentence of description', () => {
      const op = { description: 'Gets users from database. Returns paginated results.' };
      expect(generateToolDescription(op, 'GET', '/users')).toBe('Gets users from database');
    });

    it('truncates long descriptions', () => {
      const op = { description: 'A'.repeat(200) };
      const desc = generateToolDescription(op, 'GET', '/users');
      expect(desc.length).toBeLessThanOrEqual(100);
    });

    it('falls back to method and path', () => {
      expect(generateToolDescription({}, 'GET', '/users')).toBe('GET /users');
    });
  });

  describe('extractInputSchema', () => {
    it('extracts path parameters', () => {
      const op = {
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
      };

      const schema = extractInputSchema(op);

      expect(schema.properties.id.type).toBe('integer');
      expect(schema.properties.id._in).toBe('path');
      expect(schema.required).toContain('id');
    });

    it('extracts query parameters', () => {
      const op = {
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
        ],
      };

      const schema = extractInputSchema(op);

      expect(schema.properties.page._in).toBe('query');
    });

    it('extracts request body properties', () => {
      const op = {
        requestBody: {
          content: {
            'application/json': {
              schema: {
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                },
                required: ['name'],
              },
            },
          },
        },
      };

      const schema = extractInputSchema(op);

      expect(schema.properties.name._in).toBe('body');
      expect(schema.properties.email._in).toBe('body');
      expect(schema.required).toContain('name');
    });

    it('handles empty operation', () => {
      const schema = extractInputSchema({});
      expect(schema.type).toBe('object');
      expect(schema.properties).toEqual({});
    });
  });

  describe('extractOutputSchema', () => {
    it('extracts 200 response schema', () => {
      const op = {
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: { type: 'object', properties: { id: { type: 'integer' } } },
              },
            },
          },
        },
      };

      const schema = extractOutputSchema(op);

      expect(schema.properties.id.type).toBe('integer');
    });

    it('uses 201 as fallback', () => {
      const op = {
        responses: {
          '201': {
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      };

      const schema = extractOutputSchema(op);

      expect(schema.type).toBe('object');
    });

    it('returns object for no responses', () => {
      expect(extractOutputSchema({}).type).toBe('object');
    });
  });

  describe('operationToMcpTool', () => {
    it('converts operation to MCP tool', () => {
      const op = {
        operationId: 'getUsers',
        summary: 'List users',
        parameters: [{ name: 'page', in: 'query', schema: { type: 'integer' } }],
      };

      const tool = operationToMcpTool('/users', 'get', op);

      expect(tool.name).toBe('get_users');
      expect(tool.description).toBe('List users');
      expect(tool.inputSchema.properties.page).toBeDefined();
      expect(tool._meta.method).toBe('GET');
      expect(tool._meta.path).toBe('/users');
    });

    it('uses custom base URL', () => {
      const tool = operationToMcpTool('/users', 'get', {}, { baseUrl: 'https://api.example.com' });
      expect(tool._meta.url).toBe('https://api.example.com/users');
    });
  });

  describe('specToMcpTools', () => {
    it('converts spec to tools array', () => {
      const spec = {
        paths: {
          '/users': {
            get: { summary: 'List users' },
            post: { summary: 'Create user' },
          },
        },
      };

      const tools = specToMcpTools(spec);

      expect(tools).toHaveLength(2);
      expect(tools.map(t => t._meta.method)).toContain('GET');
      expect(tools.map(t => t._meta.method)).toContain('POST');
    });

    it('uses server URL from spec', () => {
      const spec = {
        servers: [{ url: 'https://api.example.com' }],
        paths: { '/test': { get: {} } },
      };

      const tools = specToMcpTools(spec);

      expect(tools[0]._meta.url).toBe('https://api.example.com/test');
    });

    it('returns empty for no paths', () => {
      expect(specToMcpTools({})).toEqual([]);
    });
  });

  describe('generateMcpManifest', () => {
    it('generates manifest with tools', () => {
      const spec = {
        info: { description: 'My API' },
        paths: { '/test': { get: {} } },
      };

      const manifest = generateMcpManifest(spec);

      expect(manifest.name).toBe('api-tools');
      expect(manifest.tools).toHaveLength(1);
      expect(manifest.capabilities.tools).toBe(true);
    });

    it('uses custom name and version', () => {
      const manifest = generateMcpManifest({ paths: {} }, { name: 'custom', version: '2.0.0' });

      expect(manifest.name).toBe('custom');
      expect(manifest.version).toBe('2.0.0');
    });
  });

  describe('getExampleValue', () => {
    it('uses default if available', () => {
      expect(getExampleValue({ type: 'string', default: 'foo' })).toBe('foo');
    });

    it('uses first enum value', () => {
      expect(getExampleValue({ type: 'string', enum: ['a', 'b'] })).toBe('a');
    });

    it('generates by type', () => {
      expect(typeof getExampleValue({ type: 'string' })).toBe('string');
      expect(typeof getExampleValue({ type: 'integer' })).toBe('number');
      expect(typeof getExampleValue({ type: 'boolean' })).toBe('boolean');
    });

    it('uses format hints', () => {
      expect(getExampleValue({ type: 'string', format: 'email' })).toContain('@');
      expect(getExampleValue({ type: 'string', format: 'uuid' })).toMatch(/[a-f0-9-]/);
    });

    it('uses name hints', () => {
      // Name hint only works when format also matches or name includes 'id'
      expect(getExampleValue({ type: 'string' }, 'userId')).toBe('123');
      expect(getExampleValue({ type: 'string' }, 'productId')).toBe('123');
      expect(getExampleValue({ type: 'string' }, 'userName')).toBe('Example');
    });
  });

  describe('generateToolExample', () => {
    it('generates example with required args', () => {
      const tool = {
        name: 'get_user',
        inputSchema: {
          properties: {
            id: { type: 'integer' },
            include: { type: 'string' },
          },
          required: ['id'],
        },
      };

      const example = generateToolExample(tool);

      expect(example.tool).toBe('get_user');
      expect(example.arguments.id).toBeDefined();
      expect(example.arguments.include).toBeUndefined();
    });
  });

  describe('formatToolsList', () => {
    it('formats tools as markdown', () => {
      const tools = [{
        name: 'get_users',
        description: 'List users',
        _meta: { method: 'GET', path: '/users' },
        inputSchema: { properties: {} },
      }];

      const formatted = formatToolsList(tools);

      expect(formatted).toContain('## get_users');
      expect(formatted).toContain('List users');
      expect(formatted).toContain('GET /users');
    });

    it('lists parameters', () => {
      const tools = [{
        name: 'test',
        description: 'Test',
        _meta: { method: 'GET', path: '/test' },
        inputSchema: {
          properties: {
            id: { type: 'integer', _in: 'path' },
          },
          required: ['id'],
        },
      }];

      const formatted = formatToolsList(tools);

      expect(formatted).toContain('`id`');
      expect(formatted).toContain('(required)');
      expect(formatted).toContain('[path]');
    });
  });

  describe('createMcpFormatGenerator', () => {
    it('creates generator with methods', () => {
      const generator = createMcpFormatGenerator();

      expect(generator.convertSchema).toBeDefined();
      expect(generator.generateToolName).toBeDefined();
      expect(generator.specToTools).toBeDefined();
      expect(generator.generateManifest).toBeDefined();
      expect(generator.generateExample).toBeDefined();
      expect(generator.formatTools).toBeDefined();
    });

    it('uses provided options', () => {
      const generator = createMcpFormatGenerator({ baseUrl: 'https://custom.api' });
      const tool = generator.operationToTool('/test', 'get', {});

      expect(tool._meta.url).toBe('https://custom.api/test');
    });
  });
});
