/**
 * Resource Manager Tests
 */
import { describe, it, expect } from 'vitest';
import { setResourceRequests, setResourceLimits, generateHpa, generatePdb, setPriorityClass, createResourceManager } from './resource-manager.js';

describe('resource-manager', () => {
  describe('setResourceRequests', () => {
    it('sets resource requests', () => {
      const resources = setResourceRequests({ cpu: '100m', memory: '128Mi' });
      expect(resources.requests.cpu).toBe('100m');
      expect(resources.requests.memory).toBe('128Mi');
    });
  });

  describe('setResourceLimits', () => {
    it('sets resource limits', () => {
      const resources = setResourceLimits({ cpu: '500m', memory: '512Mi' });
      expect(resources.limits.cpu).toBe('500m');
    });
  });

  describe('generateHpa', () => {
    it('generates HPA config', () => {
      const hpa = generateHpa({ name: 'app', minReplicas: 2, maxReplicas: 10, targetCpu: 80 });
      expect(hpa.kind).toBe('HorizontalPodAutoscaler');
      expect(hpa.spec.minReplicas).toBe(2);
    });
  });

  describe('generatePdb', () => {
    it('generates PDB config', () => {
      const pdb = generatePdb({ name: 'app', minAvailable: 1 });
      expect(pdb.kind).toBe('PodDisruptionBudget');
      expect(pdb.spec.minAvailable).toBe(1);
    });
  });

  describe('setPriorityClass', () => {
    it('configures priority classes', () => {
      const pc = setPriorityClass({ name: 'high-priority', value: 1000000 });
      expect(pc.kind).toBe('PriorityClass');
    });
  });

  describe('createResourceManager', () => {
    it('creates manager', () => {
      const manager = createResourceManager();
      expect(manager.setRequests).toBeDefined();
      expect(manager.setLimits).toBeDefined();
      expect(manager.generateHpa).toBeDefined();
    });

    it('validates resource syntax', () => {
      const manager = createResourceManager();
      const result = manager.validate({ cpu: '100m', memory: '128Mi' });
      expect(result.valid).toBe(true);
    });
  });
});
