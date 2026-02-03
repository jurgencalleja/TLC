/**
 * K8s Deploy Command Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { parseK8sArgs, runK8sInit, runK8sApply, runK8sStatus, runK8sRollback, validateKubeconfig, createK8sDeployCommand } from './k8s-deploy.js';

describe('k8s-deploy command', () => {
  describe('parseK8sArgs', () => {
    it('parses init subcommand', () => {
      const args = parseK8sArgs(['init', '--namespace', 'production']);
      expect(args.subcommand).toBe('init');
      expect(args.namespace).toBe('production');
    });

    it('parses apply subcommand', () => {
      const args = parseK8sArgs(['apply', '--env', 'staging']);
      expect(args.subcommand).toBe('apply');
      expect(args.env).toBe('staging');
    });

    it('parses status subcommand', () => {
      const args = parseK8sArgs(['status']);
      expect(args.subcommand).toBe('status');
    });

    it('parses rollback subcommand', () => {
      const args = parseK8sArgs(['rollback', '--revision', '3']);
      expect(args.subcommand).toBe('rollback');
      expect(args.revision).toBe('3');
    });

    it('supports dry-run mode', () => {
      const args = parseK8sArgs(['apply', '--dry-run']);
      expect(args.dryRun).toBe(true);
    });
  });

  describe('validateKubeconfig', () => {
    it('validates kubeconfig', async () => {
      const mockKubectl = vi.fn().mockResolvedValue({ stdout: 'cluster-info' });
      const result = await validateKubeconfig({ kubectl: mockKubectl });
      expect(result.valid).toBe(true);
    });
  });

  describe('runK8sInit', () => {
    it('generates manifests', async () => {
      const result = await runK8sInit({ namespace: 'default' });
      expect(result.manifests).toBeDefined();
    });
  });

  describe('runK8sApply', () => {
    it('deploys to cluster', async () => {
      const result = await runK8sApply({ mockApply: vi.fn().mockResolvedValue({ applied: true }) });
      expect(result.success).toBe(true);
    });
  });

  describe('runK8sStatus', () => {
    it('shows deployment state', async () => {
      const result = await runK8sStatus({ mockStatus: vi.fn().mockResolvedValue({ ready: true }) });
      expect(result.status).toBeDefined();
    });
  });

  describe('runK8sRollback', () => {
    it('reverts deployment', async () => {
      const result = await runK8sRollback({ revision: '3', mockRollback: vi.fn().mockResolvedValue({}) });
      expect(result.success).toBe(true);
    });
  });

  describe('createK8sDeployCommand', () => {
    it('creates command', () => {
      const command = createK8sDeployCommand();
      expect(command.name).toBe('deploy');
      expect(command.execute).toBeDefined();
    });
  });
});
