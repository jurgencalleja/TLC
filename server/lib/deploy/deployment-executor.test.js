/**
 * Deployment Executor Tests
 */
import { describe, it, expect, vi } from 'vitest';
import {
  createDeployment,
  executeDeployment,
  runHealthChecks,
  switchTraffic,
  cleanupOldDeployment,
  DEPLOYMENT_STATES,
  DEPLOYMENT_STRATEGIES,
  createDeploymentExecutor,
} from './deployment-executor.js';

describe('deployment-executor', () => {
  describe('DEPLOYMENT_STATES', () => {
    it('defines all state constants', () => {
      expect(DEPLOYMENT_STATES.PENDING).toBe('pending');
      expect(DEPLOYMENT_STATES.BUILDING).toBe('building');
      expect(DEPLOYMENT_STATES.DEPLOYING).toBe('deploying');
      expect(DEPLOYMENT_STATES.HEALTH_CHECK).toBe('health_check');
      expect(DEPLOYMENT_STATES.SWITCHING).toBe('switching');
      expect(DEPLOYMENT_STATES.COMPLETED).toBe('completed');
      expect(DEPLOYMENT_STATES.FAILED).toBe('failed');
      expect(DEPLOYMENT_STATES.ROLLED_BACK).toBe('rolled_back');
    });
  });

  describe('DEPLOYMENT_STRATEGIES', () => {
    it('defines all strategy constants', () => {
      expect(DEPLOYMENT_STRATEGIES.ROLLING).toBe('rolling');
      expect(DEPLOYMENT_STRATEGIES.BLUE_GREEN).toBe('blue-green');
      expect(DEPLOYMENT_STRATEGIES.CANARY).toBe('canary');
      expect(DEPLOYMENT_STRATEGIES.RECREATE).toBe('recreate');
    });
  });

  describe('createDeployment', () => {
    it('creates deployment with required fields', () => {
      const deployment = createDeployment({
        branch: 'main',
        commitSha: 'abc123',
        strategy: 'blue-green',
      });

      expect(deployment.id).toBeDefined();
      expect(deployment.branch).toBe('main');
      expect(deployment.commitSha).toBe('abc123');
      expect(deployment.strategy).toBe('blue-green');
      expect(deployment.state).toBe('pending');
      expect(deployment.createdAt).toBeDefined();
    });

    it('defaults to rolling strategy', () => {
      const deployment = createDeployment({
        branch: 'feature/x',
        commitSha: 'abc123',
      });
      expect(deployment.strategy).toBe('rolling');
    });

    it('tracks state transitions', () => {
      const deployment = createDeployment({
        branch: 'main',
        commitSha: 'abc123',
      });
      expect(deployment.stateHistory).toEqual([
        expect.objectContaining({ state: 'pending' }),
      ]);
    });
  });

  describe('executeDeployment', () => {
    it('executes rolling deployment', async () => {
      const mockBuild = vi.fn().mockResolvedValue({ success: true });
      const mockDeploy = vi.fn().mockResolvedValue({ success: true });
      const mockHealth = vi.fn().mockResolvedValue({ healthy: true });

      const deployment = createDeployment({
        branch: 'feature/x',
        commitSha: 'abc123',
        strategy: 'rolling',
      });

      const result = await executeDeployment(deployment, {
        build: mockBuild,
        deploy: mockDeploy,
        healthCheck: mockHealth,
      });

      expect(result.state).toBe('completed');
      expect(mockBuild).toHaveBeenCalled();
      expect(mockDeploy).toHaveBeenCalled();
      expect(mockHealth).toHaveBeenCalled();
    });

    it('executes blue-green deployment', async () => {
      const mockBuild = vi.fn().mockResolvedValue({ success: true });
      const mockDeploy = vi.fn().mockResolvedValue({ success: true, slot: 'green' });
      const mockHealth = vi.fn().mockResolvedValue({ healthy: true });
      const mockSwitch = vi.fn().mockResolvedValue({ success: true });

      const deployment = createDeployment({
        branch: 'main',
        commitSha: 'abc123',
        strategy: 'blue-green',
      });

      const result = await executeDeployment(deployment, {
        build: mockBuild,
        deploy: mockDeploy,
        healthCheck: mockHealth,
        switchTraffic: mockSwitch,
      });

      expect(result.state).toBe('completed');
      expect(mockSwitch).toHaveBeenCalled();
    });

    it('fails on build error', async () => {
      const mockBuild = vi.fn().mockResolvedValue({ success: false, error: 'Build failed' });

      const deployment = createDeployment({
        branch: 'main',
        commitSha: 'abc123',
      });

      const result = await executeDeployment(deployment, {
        build: mockBuild,
      });

      expect(result.state).toBe('failed');
      expect(result.error).toContain('Build failed');
    });

    it('fails on health check failure', async () => {
      const mockBuild = vi.fn().mockResolvedValue({ success: true });
      const mockDeploy = vi.fn().mockResolvedValue({ success: true });
      const mockHealth = vi.fn().mockResolvedValue({ healthy: false, reason: 'Timeout' });

      const deployment = createDeployment({
        branch: 'main',
        commitSha: 'abc123',
      });

      const result = await executeDeployment(deployment, {
        build: mockBuild,
        deploy: mockDeploy,
        healthCheck: mockHealth,
      });

      expect(result.state).toBe('failed');
    });

    it('emits state change events', async () => {
      const mockBuild = vi.fn().mockResolvedValue({ success: true });
      const mockDeploy = vi.fn().mockResolvedValue({ success: true });
      const mockHealth = vi.fn().mockResolvedValue({ healthy: true });
      const onStateChange = vi.fn();

      const deployment = createDeployment({
        branch: 'main',
        commitSha: 'abc123',
      });

      await executeDeployment(deployment, {
        build: mockBuild,
        deploy: mockDeploy,
        healthCheck: mockHealth,
        onStateChange,
      });

      expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({ state: 'building' }));
      expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({ state: 'deploying' }));
      expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({ state: 'completed' }));
    });
  });

  describe('runHealthChecks', () => {
    it('runs multiple health check endpoints', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

      const result = await runHealthChecks({
        endpoints: ['http://localhost:3000/health', 'http://localhost:3000/ready'],
        fetch: mockFetch,
      });

      expect(result.healthy).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('fails if any endpoint unhealthy', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, status: 200 })
        .mockResolvedValueOnce({ ok: false, status: 503 });

      const result = await runHealthChecks({
        endpoints: ['http://localhost:3000/health', 'http://localhost:3000/ready'],
        fetch: mockFetch,
      });

      expect(result.healthy).toBe(false);
    });

    it('retries failed checks', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({ ok: false, status: 503 })
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const result = await runHealthChecks({
        endpoints: ['http://localhost:3000/health'],
        fetch: mockFetch,
        retries: 2,
        retryDelay: 10,
      });

      expect(result.healthy).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('times out slow health checks', async () => {
      const mockFetch = vi.fn().mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 1000))
      );

      const result = await runHealthChecks({
        endpoints: ['http://localhost:3000/health'],
        fetch: mockFetch,
        timeout: 50,
      });

      expect(result.healthy).toBe(false);
      expect(result.reason).toContain('timeout');
    });
  });

  describe('switchTraffic', () => {
    it('switches traffic to new slot', async () => {
      const mockSwitch = vi.fn().mockResolvedValue({ success: true });

      const result = await switchTraffic({
        fromSlot: 'blue',
        toSlot: 'green',
        switchFn: mockSwitch,
      });

      expect(result.success).toBe(true);
      expect(mockSwitch).toHaveBeenCalledWith('blue', 'green');
    });

    it('handles switch failure', async () => {
      const mockSwitch = vi.fn().mockRejectedValue(new Error('Switch failed'));

      const result = await switchTraffic({
        fromSlot: 'blue',
        toSlot: 'green',
        switchFn: mockSwitch,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Switch failed');
    });
  });

  describe('cleanupOldDeployment', () => {
    it('removes old deployment resources', async () => {
      const mockCleanup = vi.fn().mockResolvedValue({ success: true });

      const result = await cleanupOldDeployment({
        slot: 'blue',
        cleanupFn: mockCleanup,
      });

      expect(result.success).toBe(true);
      expect(mockCleanup).toHaveBeenCalledWith('blue');
    });

    it('handles cleanup failure gracefully', async () => {
      const mockCleanup = vi.fn().mockRejectedValue(new Error('Cleanup failed'));

      const result = await cleanupOldDeployment({
        slot: 'blue',
        cleanupFn: mockCleanup,
      });

      // Should not throw, just log warning
      expect(result.success).toBe(false);
    });
  });

  describe('createDeploymentExecutor', () => {
    it('creates executor with config', () => {
      const executor = createDeploymentExecutor();
      expect(executor.execute).toBeDefined();
      expect(executor.getDeployment).toBeDefined();
      expect(executor.cancel).toBeDefined();
    });

    it('tracks active deployments', async () => {
      const executor = createDeploymentExecutor({
        build: vi.fn().mockResolvedValue({ success: true }),
        deploy: vi.fn().mockResolvedValue({ success: true }),
        healthCheck: vi.fn().mockResolvedValue({ healthy: true }),
      });

      const deployment = await executor.start({
        branch: 'main',
        commitSha: 'abc123',
      });

      expect(executor.getDeployment(deployment.id)).toBeDefined();
    });

    it('lists all deployments', async () => {
      const executor = createDeploymentExecutor({
        build: vi.fn().mockResolvedValue({ success: true }),
        deploy: vi.fn().mockResolvedValue({ success: true }),
        healthCheck: vi.fn().mockResolvedValue({ healthy: true }),
      });

      await executor.start({ branch: 'main', commitSha: 'abc123' });
      await executor.start({ branch: 'dev', commitSha: 'def456' });

      const deployments = executor.list();
      expect(deployments).toHaveLength(2);
    });
  });
});
