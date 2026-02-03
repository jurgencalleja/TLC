/**
 * GitOps Configuration Tests
 */
import { describe, it, expect } from 'vitest';
import { generateArgoCdApplication, generateFluxKustomization, configureSyncPolicy, configureHealthChecks, configureNotifications, createGitopsConfig } from './gitops-config.js';

describe('gitops-config', () => {
  describe('generateArgoCdApplication', () => {
    it('generates ArgoCD Application', () => {
      const app = generateArgoCdApplication({ name: 'myapp', repo: 'https://github.com/org/repo', path: 'k8s' });
      expect(app.kind).toBe('Application');
      expect(app.spec.source.repoURL).toBe('https://github.com/org/repo');
    });
  });

  describe('generateFluxKustomization', () => {
    it('generates Flux Kustomization', () => {
      const ks = generateFluxKustomization({ name: 'myapp', path: './k8s' });
      expect(ks.kind).toBe('Kustomization');
      expect(ks.spec.path).toBe('./k8s');
    });
  });

  describe('configureSyncPolicy', () => {
    it('configures sync policy', () => {
      const policy = configureSyncPolicy({ automated: true, prune: true, selfHeal: true });
      expect(policy.automated.prune).toBe(true);
      expect(policy.automated.selfHeal).toBe(true);
    });
  });

  describe('configureHealthChecks', () => {
    it('sets up health checks', () => {
      const health = configureHealthChecks({ ignoreDifferences: [{ group: '', kind: 'Secret' }] });
      expect(health).toBeDefined();
    });
  });

  describe('configureNotifications', () => {
    it('configures notifications', () => {
      const notifications = configureNotifications({ slack: { channel: '#deployments' } });
      expect(notifications).toContain('slack');
    });
  });

  describe('createGitopsConfig', () => {
    it('creates config manager', () => {
      const manager = createGitopsConfig();
      expect(manager.generateArgo).toBeDefined();
      expect(manager.generateFlux).toBeDefined();
    });

    it('supports multi-cluster', () => {
      const manager = createGitopsConfig();
      const app = manager.generateArgo({ name: 'app', cluster: 'production' });
      expect(app.spec.destination.name).toBe('production');
    });
  });
});
