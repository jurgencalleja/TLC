import { describe, it, expect } from 'vitest';
import {
  ContractTesting,
  generateConsumerTest,
  generateProviderTest,
  generateBrokerConfig,
  generateCiWorkflow,
  generateFromOpenApi,
  createContractTesting,
} from './contract-testing.js';

describe('contract-testing', () => {
  describe('ContractTesting', () => {
    it('creates instance with default options', () => {
      const ct = new ContractTesting();
      expect(ct).toBeDefined();
      expect(ct.options).toBeDefined();
    });

    it('creates instance with custom options', () => {
      const ct = new ContractTesting({ broker: 'pactflow' });
      expect(ct.options.broker).toBe('pactflow');
    });
  });

  describe('generate', () => {
    it('generates complete contract testing setup', () => {
      const ct = new ContractTesting();
      const result = ct.generate({
        services: ['user', 'order'],
        broker: 'local',
      });

      expect(result.files).toBeDefined();
      expect(Array.isArray(result.files)).toBe(true);
      expect(result.files.length).toBeGreaterThan(0);
    });

    it('generates files for each service pair', () => {
      const ct = new ContractTesting();
      const result = ct.generate({
        services: ['user', 'order'],
        broker: 'local',
      });

      const fileNames = result.files.map(f => f.name);
      expect(fileNames.some(n => n.includes('user'))).toBe(true);
      expect(fileNames.some(n => n.includes('order'))).toBe(true);
    });
  });

  describe('generateConsumerTest', () => {
    it('generates valid JavaScript template', () => {
      const result = generateConsumerTest('order', 'user');

      expect(result.content).toContain('describe');
      expect(result.content).toContain('it(');
      expect(result.content).toContain('expect');
    });

    it('defines interactions in the test', () => {
      const result = generateConsumerTest('order', 'user');

      expect(result.content).toContain('interaction');
      expect(result.content).toContain('willRespondWith');
    });

    it('generates contract file on success', () => {
      const result = generateConsumerTest('order', 'user');

      expect(result.content).toContain('writeContract');
      expect(result.content).toContain('pacts');
    });

    it('uses consumer and provider names in test', () => {
      const result = generateConsumerTest('order', 'user');

      expect(result.content).toContain('order');
      expect(result.content).toContain('user');
    });

    it('includes mock provider setup', () => {
      const result = generateConsumerTest('checkout', 'inventory');

      expect(result.content).toContain('mockProvider');
      expect(result.content).toContain('verify');
    });
  });

  describe('generateProviderTest', () => {
    it('loads contracts from broker', () => {
      const result = generateProviderTest('user', { broker: 'local' });

      expect(result.content).toContain('loadContracts');
      expect(result.content).toContain('contracts');
    });

    it('verifies endpoints from contracts', () => {
      const result = generateProviderTest('user', { broker: 'local' });

      expect(result.content).toContain('verifyProvider');
      expect(result.content).toContain('endpoint');
    });

    it('reports failures for missing endpoints', () => {
      const result = generateProviderTest('user', { broker: 'local' });

      expect(result.content).toContain('missing');
      expect(result.content).toContain('fail');
    });

    it('supports different broker modes', () => {
      const localResult = generateProviderTest('user', { broker: 'local' });
      const pactflowResult = generateProviderTest('user', { broker: 'pactflow' });

      expect(localResult.content).toContain('contracts/');
      expect(pactflowResult.content).toContain('pactflow');
    });
  });

  describe('generateBrokerConfig', () => {
    it('supports local mode', () => {
      const result = generateBrokerConfig('local');

      expect(result.mode).toBe('local');
      expect(result.config).toBeDefined();
    });

    it('supports pactflow mode', () => {
      const result = generateBrokerConfig('pactflow');

      expect(result.mode).toBe('pactflow');
      expect(result.config).toContain('PACT_BROKER');
    });

    it('stores contracts in contracts/ directory for local', () => {
      const result = generateBrokerConfig('local');

      expect(result.contractsDir).toBe('contracts/');
    });

    it('generates publish script', () => {
      const result = generateBrokerConfig('pactflow');

      expect(result.publishScript).toBeDefined();
      expect(result.publishScript).toContain('publish');
    });

    it('generates fetch script', () => {
      const result = generateBrokerConfig('pactflow');

      expect(result.fetchScript).toBeDefined();
      expect(result.fetchScript.toLowerCase()).toContain('fetch');
    });
  });

  describe('generateCiWorkflow', () => {
    it('runs on pull requests', () => {
      const result = generateCiWorkflow();

      expect(result.on).toBeDefined();
      expect(result.on.pull_request).toBeDefined();
    });

    it('runs consumer tests', () => {
      const result = generateCiWorkflow();
      const yaml = JSON.stringify(result);

      expect(yaml).toContain('consumer');
    });

    it('runs provider tests', () => {
      const result = generateCiWorkflow();
      const yaml = JSON.stringify(result);

      expect(yaml).toContain('provider');
    });

    it('blocks merge on failure', () => {
      const result = generateCiWorkflow();

      // Workflow should fail if tests fail (no continue-on-error)
      expect(result.jobs.contract_tests).toBeDefined();
      expect(result.jobs.contract_tests['continue-on-error']).not.toBe(true);
    });

    it('generates valid workflow structure', () => {
      const result = generateCiWorkflow();

      expect(result.name).toBeDefined();
      expect(result.jobs).toBeDefined();
      expect(result.jobs.contract_tests.steps).toBeDefined();
    });
  });

  describe('generateFromOpenApi', () => {
    it('extracts endpoints from OpenAPI spec', () => {
      const spec = {
        openapi: '3.0.0',
        paths: {
          '/users': {
            get: { summary: 'List users' },
            post: { summary: 'Create user' },
          },
          '/users/{id}': {
            get: { summary: 'Get user' },
          },
        },
      };

      const result = generateFromOpenApi(spec);

      expect(result.endpoints).toBeDefined();
      expect(result.endpoints.length).toBe(3);
    });

    it('maps responses from spec', () => {
      const spec = {
        openapi: '3.0.0',
        paths: {
          '/users': {
            get: {
              responses: {
                '200': {
                  content: {
                    'application/json': {
                      schema: { type: 'array' },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const result = generateFromOpenApi(spec);

      expect(result.endpoints[0].responses).toBeDefined();
      expect(result.endpoints[0].responses['200']).toBeDefined();
    });

    it('generates contract expectations', () => {
      const spec = {
        openapi: '3.0.0',
        paths: {
          '/users': {
            get: { summary: 'List users' },
          },
        },
      };

      const result = generateFromOpenApi(spec);

      expect(result.contracts).toBeDefined();
      expect(result.contracts.length).toBeGreaterThan(0);
    });

    it('handles request bodies', () => {
      const spec = {
        openapi: '3.0.0',
        paths: {
          '/users': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        email: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const result = generateFromOpenApi(spec);

      expect(result.endpoints[0].requestBody).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('handles service with no consumers', () => {
      const ct = new ContractTesting();
      const result = ct.generate({
        services: ['standalone'],
        broker: 'local',
      });

      expect(result.files).toBeDefined();
      // Should still generate provider test for verification
      expect(result.files.some(f => f.name.includes('provider'))).toBe(true);
    });

    it('handles single consumer-provider pair', () => {
      const ct = new ContractTesting();
      const result = ct.generate({
        services: ['api', 'frontend'],
        relations: [{ consumer: 'frontend', provider: 'api' }],
        broker: 'local',
      });

      expect(result.files).toBeDefined();
      expect(result.files.some(f => f.name.includes('frontend'))).toBe(true);
      expect(result.files.some(f => f.name.includes('api'))).toBe(true);
    });

    it('handles empty services array', () => {
      const ct = new ContractTesting();
      const result = ct.generate({
        services: [],
        broker: 'local',
      });

      expect(result.files).toEqual([]);
    });
  });

  describe('createContractTesting', () => {
    it('creates factory instance', () => {
      const ct = createContractTesting();

      expect(ct.generate).toBeDefined();
      expect(ct.generateConsumerTest).toBeDefined();
      expect(ct.generateProviderTest).toBeDefined();
    });

    it('passes options through', () => {
      const ct = createContractTesting({ broker: 'pactflow' });
      const result = ct.generateBrokerConfig();

      expect(result.mode).toBe('pactflow');
    });
  });
});
