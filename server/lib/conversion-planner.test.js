import { describe, it, expect } from 'vitest';
import {
  buildDependencyGraph,
  detectCircularDependencies,
  topologicalSort,
  generateApiContract,
  generateMigrationTest,
  estimateEffort,
  generateConversionPlan,
  formatConversionReport,
} from './conversion-planner.js';

describe('conversion-planner', () => {
  describe('topologicalSort', () => {
    it('orders extraction by dependencies (leaves first)', () => {
      const services = [
        { name: 'api-gateway', dependencies: ['auth', 'users', 'orders'] },
        { name: 'auth', dependencies: ['users'] },
        { name: 'users', dependencies: [] },
        { name: 'orders', dependencies: ['users', 'products'] },
        { name: 'products', dependencies: [] },
      ];

      const order = topologicalSort(services);

      // Users and products have no dependencies - should come first
      const usersIndex = order.indexOf('users');
      const productsIndex = order.indexOf('products');
      const authIndex = order.indexOf('auth');
      const ordersIndex = order.indexOf('orders');
      const gatewayIndex = order.indexOf('api-gateway');

      // Leaves should be extracted before services that depend on them
      expect(usersIndex).toBeLessThan(authIndex);
      expect(usersIndex).toBeLessThan(ordersIndex);
      expect(productsIndex).toBeLessThan(ordersIndex);
      expect(authIndex).toBeLessThan(gatewayIndex);
      expect(ordersIndex).toBeLessThan(gatewayIndex);
    });

    it('handles services with no dependencies', () => {
      const services = [
        { name: 'service-a', dependencies: [] },
        { name: 'service-b', dependencies: [] },
        { name: 'service-c', dependencies: [] },
      ];

      const order = topologicalSort(services);

      expect(order).toHaveLength(3);
      expect(order).toContain('service-a');
      expect(order).toContain('service-b');
      expect(order).toContain('service-c');
    });

    it('handles external dependencies not in service list', () => {
      const services = [
        { name: 'my-service', dependencies: ['external-lib', 'another-external'] },
      ];

      const order = topologicalSort(services);

      expect(order).toEqual(['my-service']);
    });
  });

  describe('generateApiContract', () => {
    it('generates API contract stubs for service', () => {
      const service = {
        name: 'users',
        endpoints: [
          { method: 'GET', path: '/users', description: 'List users' },
          { method: 'POST', path: '/users', description: 'Create user' },
          { method: 'GET', path: '/users/:id', description: 'Get user by ID' },
        ],
        models: [
          { name: 'User', schema: { type: 'object', properties: { id: { type: 'string' } } } },
        ],
      };

      const contract = generateApiContract(service);

      expect(contract.service).toBe('users');
      expect(contract.version).toBe('1.0.0');
      expect(contract.endpoints).toHaveLength(3);
      expect(contract.endpoints[0]).toEqual({
        method: 'GET',
        path: '/users',
        request: null,
        response: { type: 'object' },
        description: 'List users',
      });
      expect(contract.models).toHaveLength(1);
      expect(contract.models[0].name).toBe('User');
    });

    it('handles service with events', () => {
      const service = {
        name: 'orders',
        endpoints: [],
        models: [],
        events: [
          { name: 'order.created', payload: { type: 'object' } },
          { name: 'order.shipped', payload: { type: 'object' } },
        ],
      };

      const contract = generateApiContract(service);

      expect(contract.events).toHaveLength(2);
      expect(contract.events[0].name).toBe('order.created');
    });

    it('handles empty service with defaults', () => {
      const service = { name: 'empty-service' };

      const contract = generateApiContract(service);

      expect(contract.service).toBe('empty-service');
      expect(contract.endpoints).toEqual([]);
      expect(contract.models).toEqual([]);
      expect(contract.events).toEqual([]);
    });
  });

  describe('generateMigrationTest', () => {
    it('creates migration test templates', () => {
      const service = { name: 'users' };
      const contract = {
        service: 'users',
        endpoints: [
          { method: 'GET', path: '/users', description: 'List users' },
          { method: 'POST', path: '/users', description: 'Create user' },
        ],
        models: [],
        events: [],
      };

      const testTemplate = generateMigrationTest(service, contract);

      expect(testTemplate).toContain("describe('users migration'");
      expect(testTemplate).toContain("describe('GET /users'");
      expect(testTemplate).toContain("describe('POST /users'");
      expect(testTemplate).toContain('returns same response as monolith');
      expect(testTemplate).toContain('handles error cases consistently');
      expect(testTemplate).toContain("describe('performance'");
      expect(testTemplate).toContain("describe('data migration'");
    });

    it('includes parity test structure', () => {
      const service = { name: 'auth' };
      const contract = {
        service: 'auth',
        endpoints: [{ method: 'POST', path: '/login' }],
        models: [],
        events: [],
      };

      const testTemplate = generateMigrationTest(service, contract);

      expect(testTemplate).toContain('callMonolith');
      expect(testTemplate).toContain('callService');
      expect(testTemplate).toContain('toEqual(monolithResponse)');
    });
  });

  describe('estimateEffort', () => {
    it('estimates based on file count', () => {
      const smallService = {
        name: 'small',
        files: ['a.js', 'b.js'],
        dependencies: [],
      };

      const largeService = {
        name: 'large',
        files: ['a.js', 'b.js', 'c.js', 'd.js', 'e.js', 'f.js', 'g.js', 'h.js', 'i.js', 'j.js', 'k.js'],
        dependencies: [],
      };

      const smallEstimate = estimateEffort(smallService);
      const largeEstimate = estimateEffort(largeService);

      expect(largeEstimate.days).toBeGreaterThan(smallEstimate.days);
      expect(smallEstimate.complexity).toBe('low');
      expect(largeEstimate.complexity).toBe('high');
    });

    it('includes dependencies in estimate', () => {
      const noDeps = {
        name: 'isolated',
        files: ['a.js'],
        dependencies: [],
      };

      const manyDeps = {
        name: 'connected',
        files: ['a.js'],
        dependencies: ['auth', 'users', 'orders', 'products', 'inventory', 'shipping'],
      };

      const noDepsEstimate = estimateEffort(noDeps);
      const manyDepsEstimate = estimateEffort(manyDeps);

      expect(manyDepsEstimate.days).toBeGreaterThan(noDepsEstimate.days);
      expect(manyDepsEstimate.complexity).toBe('high');
    });

    it('provides effort range', () => {
      const service = {
        name: 'test',
        files: ['a.js', 'b.js', 'c.js', 'd.js'],
        dependencies: ['dep1'],
      };

      const estimate = estimateEffort(service);

      expect(estimate.range).toHaveProperty('min');
      expect(estimate.range).toHaveProperty('max');
      expect(estimate.range.max).toBeGreaterThan(estimate.range.min);
    });

    it('has minimum of 1 day', () => {
      const tinyService = { name: 'tiny', files: [], dependencies: [] };

      const estimate = estimateEffort(tinyService);

      expect(estimate.days).toBeGreaterThanOrEqual(1);
    });
  });

  describe('detectCircularDependencies', () => {
    it('handles circular dependencies in plan', () => {
      const services = [
        { name: 'service-a', dependencies: ['service-b'] },
        { name: 'service-b', dependencies: ['service-c'] },
        { name: 'service-c', dependencies: ['service-a'] }, // Circular: A -> B -> C -> A
      ];

      const graph = buildDependencyGraph(services);
      const cycles = detectCircularDependencies(graph);

      expect(cycles.length).toBeGreaterThan(0);
      // Should detect cycle involving all three services
      const flatCycles = cycles.flat();
      expect(flatCycles).toContain('service-a');
      expect(flatCycles).toContain('service-b');
      expect(flatCycles).toContain('service-c');
    });

    it('returns empty array for acyclic graph', () => {
      const services = [
        { name: 'api', dependencies: ['auth'] },
        { name: 'auth', dependencies: ['users'] },
        { name: 'users', dependencies: [] },
      ];

      const graph = buildDependencyGraph(services);
      const cycles = detectCircularDependencies(graph);

      expect(cycles).toEqual([]);
    });

    it('includes warnings in conversion plan for cycles', () => {
      const services = [
        { name: 'service-a', dependencies: ['service-b'] },
        { name: 'service-b', dependencies: ['service-a'] }, // Simple cycle: A <-> B
      ];

      const plan = generateConversionPlan(services);

      expect(plan.summary.hasCircularDependencies).toBe(true);
      expect(plan.warnings.length).toBeGreaterThan(0);
      expect(plan.warnings[0].type).toBe('circular-dependency');
      expect(plan.warnings[0].recommendation).toContain('event bus');
    });
  });

  describe('generateConversionPlan', () => {
    it('generates complete conversion plan', () => {
      const services = [
        {
          name: 'users',
          dependencies: [],
          files: ['users.js', 'users.model.js'],
          endpoints: [{ method: 'GET', path: '/users' }],
        },
        {
          name: 'auth',
          dependencies: ['users'],
          files: ['auth.js'],
          endpoints: [{ method: 'POST', path: '/login' }],
        },
      ];

      const plan = generateConversionPlan(services);

      expect(plan.summary.totalServices).toBe(2);
      expect(plan.summary.totalPhases).toBeGreaterThan(0);
      expect(plan.summary.estimatedDays).toBeGreaterThan(0);
      expect(plan.extractionOrder).toContain('users');
      expect(plan.extractionOrder).toContain('auth');
      expect(plan.contracts).toHaveProperty('users');
      expect(plan.contracts).toHaveProperty('auth');
      expect(plan.estimates).toHaveProperty('users');
      expect(plan.migrationTests).toHaveProperty('users');
    });

    it('groups independent services into phases', () => {
      const services = [
        { name: 'users', dependencies: [] },
        { name: 'products', dependencies: [] },
        { name: 'inventory', dependencies: [] },
        { name: 'orders', dependencies: ['users', 'products'] },
      ];

      const plan = generateConversionPlan(services);

      // Users, products, and inventory can be extracted in parallel
      // Orders must wait for users and products
      expect(plan.phases.length).toBeGreaterThanOrEqual(2);

      // First phase should contain leaf services
      const firstPhaseServices = plan.phases[0].services;
      expect(firstPhaseServices).not.toContain('orders');
    });
  });

  describe('formatConversionReport', () => {
    it('produces human-readable report', () => {
      const services = [
        { name: 'users', dependencies: [], files: ['users.js'] },
        { name: 'auth', dependencies: ['users'], files: ['auth.js'] },
      ];

      const plan = generateConversionPlan(services);
      const report = formatConversionReport(plan);

      expect(report).toContain('Microservice Conversion Plan');
      expect(report).toContain('Summary');
      expect(report).toContain('Extraction Order');
      expect(report).toContain('Phases');
      expect(report).toContain('Service Details');
      expect(report).toContain('users');
      expect(report).toContain('auth');
    });

    it('includes warnings section when cycles exist', () => {
      const services = [
        { name: 'a', dependencies: ['b'] },
        { name: 'b', dependencies: ['a'] },
      ];

      const plan = generateConversionPlan(services);
      const report = formatConversionReport(plan);

      expect(report).toContain('Warnings');
      expect(report).toContain('circular-dependency');
    });
  });
});
