/**
 * Kustomize Generator Tests
 */
import { describe, it, expect } from 'vitest';
import { generateBaseKustomization, generateDevOverlay, generateStagingOverlay, generateProductionOverlay, addPatch, createKustomizeGenerator } from './kustomize-generator.js';

describe('kustomize-generator', () => {
  describe('generateBaseKustomization', () => {
    it('generates base kustomization.yaml', () => {
      const kustomization = generateBaseKustomization({ resources: ['deployment.yaml', 'service.yaml'] });
      expect(kustomization).toContain('apiVersion: kustomize.config.k8s.io/v1beta1');
      expect(kustomization).toContain('resources:');
    });
  });

  describe('generateDevOverlay', () => {
    it('creates dev overlay', () => {
      const overlay = generateDevOverlay({});
      expect(overlay).toContain('../../base');
      expect(overlay).toContain('dev');
    });
  });

  describe('generateStagingOverlay', () => {
    it('creates staging overlay', () => {
      const overlay = generateStagingOverlay({});
      expect(overlay).toContain('staging');
    });
  });

  describe('generateProductionOverlay', () => {
    it('creates production overlay', () => {
      const overlay = generateProductionOverlay({});
      expect(overlay).toContain('production');
    });
  });

  describe('addPatch', () => {
    it('supports patches', () => {
      const patch = addPatch({ target: { kind: 'Deployment', name: 'app' }, patch: { spec: { replicas: 3 } } });
      expect(patch).toContain('replicas');
    });
  });

  describe('createKustomizeGenerator', () => {
    it('creates generator', () => {
      const generator = createKustomizeGenerator();
      expect(generator.generateBase).toBeDefined();
      expect(generator.generateOverlay).toBeDefined();
    });

    it('validates kustomize syntax', () => {
      const generator = createKustomizeGenerator();
      const result = generator.validate('apiVersion: kustomize.config.k8s.io/v1beta1\nkind: Kustomization\nresources: []');
      expect(result.valid).toBe(true);
    });
  });
});
