/**
 * Helm Chart Generator Tests
 */
import { describe, it, expect } from 'vitest';
import { generateChartYaml, generateValuesYaml, generateDeploymentTemplate, generateServiceTemplate, generateIngressTemplate, createHelmGenerator } from './helm-generator.js';

describe('helm-generator', () => {
  describe('generateChartYaml', () => {
    it('generates Chart.yaml', () => {
      const chart = generateChartYaml({ name: 'myapp', version: '1.0.0' });
      expect(chart).toContain('apiVersion: v2');
      expect(chart).toContain('name: myapp');
    });
  });

  describe('generateValuesYaml', () => {
    it('generates values.yaml with secure defaults', () => {
      const values = generateValuesYaml({ image: 'myapp:latest' });
      expect(values).toContain('securityContext');
      expect(values).toContain('runAsNonRoot: true');
    });
  });

  describe('generateDeploymentTemplate', () => {
    it('creates deployment template', () => {
      const template = generateDeploymentTemplate({});
      expect(template).toContain('kind: Deployment');
      expect(template).toContain('{{ .Values');
    });
  });

  describe('generateServiceTemplate', () => {
    it('creates service template', () => {
      const template = generateServiceTemplate({});
      expect(template).toContain('kind: Service');
    });
  });

  describe('generateIngressTemplate', () => {
    it('creates ingress template', () => {
      const template = generateIngressTemplate({});
      expect(template).toContain('kind: Ingress');
    });
  });

  describe('createHelmGenerator', () => {
    it('creates generator', () => {
      const generator = createHelmGenerator();
      expect(generator.generateChart).toBeDefined();
      expect(generator.generateAll).toBeDefined();
    });

    it('supports values override', () => {
      const generator = createHelmGenerator();
      const values = generator.generateValues({ replicaCount: 3 });
      expect(values).toContain('replicaCount: 3');
    });
  });
});
