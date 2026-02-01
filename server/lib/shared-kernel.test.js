import { describe, it, expect } from 'vitest';
import {
  SharedKernel,
  createSharedKernel,
  generatePackageJson,
  generateTypes,
  generateContracts,
  generateEvents,
  generateUtils,
} from './shared-kernel.js';

describe('shared-kernel', () => {
  describe('SharedKernel', () => {
    describe('generate', () => {
      it('creates shared directory structure', () => {
        const kernel = new SharedKernel({ projectName: 'myapp' });
        const result = kernel.generate({
          services: ['user', 'order'],
          events: ['UserCreated', 'OrderPlaced'],
        });

        expect(result.directories).toBeDefined();
        expect(result.directories).toContain('shared');
      });

      it('creates types/, contracts/, events/, utils/ subdirectories', () => {
        const kernel = new SharedKernel({ projectName: 'myapp' });
        const result = kernel.generate({
          services: ['user'],
          events: ['UserCreated'],
        });

        expect(result.directories).toContain('shared/types');
        expect(result.directories).toContain('shared/contracts');
        expect(result.directories).toContain('shared/events');
        expect(result.directories).toContain('shared/utils');
      });

      it('returns files array with generated content', () => {
        const kernel = new SharedKernel({ projectName: 'myapp' });
        const result = kernel.generate({
          services: ['user'],
          events: ['UserCreated'],
        });

        expect(result.files).toBeDefined();
        expect(Array.isArray(result.files)).toBe(true);
        expect(result.files.length).toBeGreaterThan(0);
      });

      it('handles empty services array', () => {
        const kernel = new SharedKernel({ projectName: 'myapp' });
        const result = kernel.generate({
          services: [],
          events: ['SomeEvent'],
        });

        expect(result.directories).toContain('shared');
        expect(result.files).toBeDefined();
      });

      it('handles empty events array', () => {
        const kernel = new SharedKernel({ projectName: 'myapp' });
        const result = kernel.generate({
          services: ['user'],
          events: [],
        });

        expect(result.directories).toContain('shared');
        expect(result.files).toBeDefined();
      });
    });
  });

  describe('generatePackageJson', () => {
    it('has correct name format', () => {
      const pkg = generatePackageJson({ projectName: 'myapp' });

      expect(pkg.name).toBe('@myapp/shared');
    });

    it('has exports field', () => {
      const pkg = generatePackageJson({ projectName: 'myapp' });

      expect(pkg.exports).toBeDefined();
      expect(pkg.exports['./types']).toBeDefined();
      expect(pkg.exports['./contracts']).toBeDefined();
      expect(pkg.exports['./events']).toBeDefined();
      expect(pkg.exports['./utils']).toBeDefined();
    });

    it('includes version and description', () => {
      const pkg = generatePackageJson({ projectName: 'myapp' });

      expect(pkg.version).toBeDefined();
      expect(pkg.description).toBeDefined();
    });
  });

  describe('generateTypes', () => {
    it('includes common types', () => {
      const types = generateTypes({ services: ['user'] });

      expect(types).toContain('ID');
      expect(types).toContain('Timestamp');
      expect(types).toContain('PaginatedResponse');
    });

    it('includes service-specific types', () => {
      const types = generateTypes({ services: ['user', 'order'] });

      expect(types).toContain('User');
      expect(types).toContain('Order');
    });

    it('generates syntactically valid TypeScript', () => {
      const types = generateTypes({ services: ['user'] });

      // Should have proper export statements
      expect(types).toContain('export');
      // Should have type or interface declarations
      expect(types).toMatch(/export\s+(type|interface)/);
      // Should not have obvious syntax errors (unbalanced braces)
      const openBraces = (types.match(/\{/g) || []).length;
      const closeBraces = (types.match(/\}/g) || []).length;
      expect(openBraces).toBe(closeBraces);
    });

    it('handles empty services array', () => {
      const types = generateTypes({ services: [] });

      expect(types).toContain('ID');
      expect(types).toContain('Timestamp');
    });
  });

  describe('generateContracts', () => {
    it('generates valid JSON Schema for services', () => {
      const contracts = generateContracts(['user', 'order']);

      expect(contracts.user).toBeDefined();
      expect(contracts.order).toBeDefined();
      expect(contracts.user.$schema).toContain('json-schema');
    });

    it('has request/response schemas', () => {
      const contracts = generateContracts(['user']);

      expect(contracts.user.definitions).toBeDefined();
      expect(contracts.user.definitions.Request).toBeDefined();
      expect(contracts.user.definitions.Response).toBeDefined();
    });

    it('includes error response schema', () => {
      const contracts = generateContracts(['user']);

      expect(contracts.user.definitions.ErrorResponse).toBeDefined();
      expect(contracts.user.definitions.ErrorResponse.properties.error).toBeDefined();
    });

    it('handles empty services array', () => {
      const contracts = generateContracts([]);

      expect(contracts).toBeDefined();
      expect(Object.keys(contracts).length).toBe(0);
    });
  });

  describe('generateEvents', () => {
    it('includes metadata fields', () => {
      const events = generateEvents(['UserCreated', 'OrderPlaced']);

      expect(events.base).toBeDefined();
      expect(events.base).toContain('id');
      expect(events.base).toContain('timestamp');
      expect(events.base).toContain('source');
    });

    it('generates per-event schema with payload types', () => {
      const events = generateEvents(['UserCreated', 'OrderPlaced']);

      expect(events.schemas.UserCreated).toBeDefined();
      expect(events.schemas.OrderPlaced).toBeDefined();
      expect(events.schemas.UserCreated).toContain('payload');
    });

    it('generates event catalog listing all events', () => {
      const events = generateEvents(['UserCreated', 'OrderPlaced']);

      expect(events.catalog).toBeDefined();
      expect(events.catalog).toContain('UserCreated');
      expect(events.catalog).toContain('OrderPlaced');
    });

    it('handles empty events array', () => {
      const events = generateEvents([]);

      expect(events.base).toBeDefined();
      expect(events.catalog).toBeDefined();
    });
  });

  describe('generateUtils', () => {
    it('includes logger utility', () => {
      const utils = generateUtils();

      expect(utils.logger).toBeDefined();
      expect(utils.logger).toContain('log');
    });

    it('includes error classes', () => {
      const utils = generateUtils();

      expect(utils.errors).toBeDefined();
      expect(utils.errors).toContain('AppError');
      expect(utils.errors).toContain('ValidationError');
      expect(utils.errors).toContain('NotFoundError');
    });

    it('error classes extend base AppError', () => {
      const utils = generateUtils();

      expect(utils.errors).toContain('extends AppError');
    });

    it('includes validation helpers', () => {
      const utils = generateUtils();

      expect(utils.validation).toBeDefined();
      expect(utils.validation).toContain('validate');
    });
  });

  describe('createSharedKernel', () => {
    it('creates kernel instance with methods', () => {
      const kernel = createSharedKernel({ projectName: 'myapp' });

      expect(kernel.generate).toBeDefined();
      expect(typeof kernel.generate).toBe('function');
    });

    it('uses provided options', () => {
      const kernel = createSharedKernel({ projectName: 'customapp' });
      const result = kernel.generate({
        services: ['user'],
        events: [],
      });

      // Find the package.json file in result
      const pkgFile = result.files.find(f => f.path === 'shared/package.json');
      expect(pkgFile).toBeDefined();
      expect(pkgFile.content).toContain('@customapp/shared');
    });
  });
});
