/**
 * Docker Compose Orchestrator Tests
 */
import { describe, it, expect } from 'vitest';
import { generateProductionCompose, addHealthCheck, setResourceLimits, configureLogging, createComposeOrchestrator } from './compose-orchestrator.js';

describe('compose-orchestrator', () => {
  describe('generateProductionCompose', () => {
    it('generates production compose file', () => {
      const config = generateProductionCompose({ services: ['app', 'db'] });
      expect(config).toContain('version:');
      expect(config).toContain('services:');
    });

    it('sets restart policy', () => {
      const config = generateProductionCompose({ services: ['app'] });
      expect(config).toContain('restart: always');
    });
  });

  describe('addHealthCheck', () => {
    it('adds health check config', () => {
      const config = addHealthCheck({ test: 'curl -f http://localhost', interval: '30s' });
      expect(config.healthcheck).toBeDefined();
      expect(config.healthcheck.test).toContain('curl');
    });
  });

  describe('setResourceLimits', () => {
    it('sets memory limits', () => {
      const config = setResourceLimits({ memory: '512M', cpus: '0.5' });
      expect(config.deploy.resources.limits.memory).toBe('512M');
    });
  });

  describe('configureLogging', () => {
    it('configures logging driver', () => {
      const config = configureLogging({ driver: 'json-file', maxSize: '10m' });
      expect(config.logging.driver).toBe('json-file');
    });
  });

  describe('createComposeOrchestrator', () => {
    it('creates orchestrator', () => {
      const orchestrator = createComposeOrchestrator();
      expect(orchestrator.generate).toBeDefined();
      expect(orchestrator.addService).toBeDefined();
    });
  });
});
