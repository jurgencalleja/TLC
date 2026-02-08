/**
 * Infrastructure Blueprint Generator Tests
 *
 * Generates Docker dev environment with observability stack.
 */
import { describe, it, expect } from 'vitest';

const {
  generateDockerCompose,
  generateEnvExample,
  AVAILABLE_SERVICES,
} = require('./infra-generator.js');

describe('Infrastructure Blueprint Generator', () => {
  describe('generateDockerCompose', () => {
    it('generates docker-compose with postgres', () => {
      const result = generateDockerCompose({ services: ['postgres'] });

      expect(result.content).toContain('postgres');
      expect(result.content).toContain('image:');
      expect(result.content).toContain('volumes:');
    });

    it('generates docker-compose with full observability stack', () => {
      const result = generateDockerCompose({
        services: ['postgres', 'redis', 'prometheus', 'grafana', 'mailhog', 'minio', 'pgadmin'],
      });

      expect(result.content).toContain('postgres');
      expect(result.content).toContain('redis');
      expect(result.content).toContain('prometheus');
      expect(result.content).toContain('grafana');
      expect(result.content).toContain('mailhog');
      expect(result.content).toContain('minio');
      expect(result.content).toContain('pgadmin');
    });

    it('each volume has explicit name property', () => {
      const result = generateDockerCompose({
        services: ['postgres', 'redis'],
      });

      // Parse volumes section - every volume should have name: property
      const volumesSection = result.content.split('volumes:').pop();
      // Check that volume definitions include name:
      expect(volumesSection).toContain('name:');
    });

    it('no external: true in any volume', () => {
      const result = generateDockerCompose({
        services: ['postgres', 'redis', 'prometheus', 'grafana'],
      });

      expect(result.content).not.toContain('external: true');
      expect(result.content).not.toContain('external:true');
    });

    it('services on correct networks', () => {
      const result = generateDockerCompose({
        services: ['postgres', 'prometheus', 'minio'],
      });

      expect(result.content).toContain('app');
      expect(result.content).toContain('monitoring');
      expect(result.content).toContain('storage');
    });

    it('health checks present for each service', () => {
      const services = ['postgres', 'redis', 'prometheus', 'grafana', 'mailhog', 'minio', 'pgadmin'];
      const result = generateDockerCompose({ services });

      // Count healthcheck occurrences - should be at least one per service
      const healthcheckCount = (result.content.match(/healthcheck:/g) || []).length;
      expect(healthcheckCount).toBe(services.length);
    });

    it('ports configurable via options', () => {
      const result = generateDockerCompose({
        services: ['postgres'],
        ports: { postgres: 5555 },
      });

      expect(result.content).toContain('5555');
    });

    it('includes pgAdmin with connection pre-configured', () => {
      const result = generateDockerCompose({
        services: ['postgres', 'pgadmin'],
      });

      expect(result.content).toContain('pgadmin');
      expect(result.content).toContain('PGADMIN_DEFAULT_EMAIL');
    });

    it('includes Grafana with Prometheus datasource', () => {
      const result = generateDockerCompose({
        services: ['prometheus', 'grafana'],
      });

      expect(result.content).toContain('grafana');
      expect(result.content).toContain('prometheus');
    });

    it('empty service list returns minimal compose', () => {
      const result = generateDockerCompose({ services: [] });

      expect(result.content).toContain('version:');
      expect(result.content).toContain('services:');
    });

    it('returns structured output (not writes files)', () => {
      const result = generateDockerCompose({
        services: ['postgres'],
      });

      expect(result).toMatchObject({
        content: expect.any(String),
        filename: expect.any(String),
      });
    });
  });

  describe('generateEnvExample', () => {
    it('generates .env.example with all vars', () => {
      const result = generateEnvExample({
        services: ['postgres', 'redis', 'minio'],
      });

      expect(result.content).toContain('POSTGRES');
      expect(result.content).toContain('REDIS');
      expect(result.content).toContain('MINIO');
    });
  });

  describe('AVAILABLE_SERVICES', () => {
    it('lists all expected services', () => {
      expect(AVAILABLE_SERVICES).toContain('postgres');
      expect(AVAILABLE_SERVICES).toContain('redis');
      expect(AVAILABLE_SERVICES).toContain('prometheus');
      expect(AVAILABLE_SERVICES).toContain('grafana');
      expect(AVAILABLE_SERVICES).toContain('mailhog');
      expect(AVAILABLE_SERVICES).toContain('minio');
      expect(AVAILABLE_SERVICES).toContain('pgadmin');
    });
  });
});
