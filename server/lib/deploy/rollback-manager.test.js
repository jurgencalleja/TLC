/**
 * Rollback Manager Tests
 */
import { describe, it, expect, vi } from 'vitest';
import {
  createSnapshot,
  restoreSnapshot,
  listSnapshots,
  autoRollback,
  generateRecoveryPlaybook,
  ROLLBACK_REASONS,
  createRollbackManager,
} from './rollback-manager.js';

describe('rollback-manager', () => {
  describe('ROLLBACK_REASONS', () => {
    it('defines all reason constants', () => {
      expect(ROLLBACK_REASONS.HEALTH_CHECK_FAILED).toBe('health_check_failed');
      expect(ROLLBACK_REASONS.MANUAL).toBe('manual');
      expect(ROLLBACK_REASONS.ERROR_RATE).toBe('error_rate');
      expect(ROLLBACK_REASONS.LATENCY).toBe('latency');
      expect(ROLLBACK_REASONS.SECURITY).toBe('security');
    });
  });

  describe('createSnapshot', () => {
    it('creates snapshot with deployment info', async () => {
      const snapshot = await createSnapshot({
        deploymentId: 'deploy-123',
        branch: 'main',
        commitSha: 'abc123',
        containerIds: ['container-1', 'container-2'],
      });

      expect(snapshot.id).toBeDefined();
      expect(snapshot.deploymentId).toBe('deploy-123');
      expect(snapshot.branch).toBe('main');
      expect(snapshot.commitSha).toBe('abc123');
      expect(snapshot.createdAt).toBeDefined();
    });

    it('captures container state', async () => {
      const mockCapture = vi.fn().mockResolvedValue({
        image: 'app:v1.0',
        config: { env: ['NODE_ENV=production'] },
      });

      const snapshot = await createSnapshot({
        deploymentId: 'deploy-123',
        branch: 'main',
        commitSha: 'abc123',
        containerIds: ['container-1'],
        captureState: mockCapture,
      });

      expect(snapshot.containers).toHaveLength(1);
      expect(snapshot.containers[0].image).toBe('app:v1.0');
    });

    it('captures database migration state', async () => {
      const mockDbState = vi.fn().mockResolvedValue({
        lastMigration: '20240101_create_users',
        pendingMigrations: [],
      });

      const snapshot = await createSnapshot({
        deploymentId: 'deploy-123',
        branch: 'main',
        commitSha: 'abc123',
        captureDbState: mockDbState,
      });

      expect(snapshot.database.lastMigration).toBe('20240101_create_users');
    });
  });

  describe('restoreSnapshot', () => {
    it('restores containers from snapshot', async () => {
      const mockRestore = vi.fn().mockResolvedValue({ success: true });
      const snapshot = {
        id: 'snap-123',
        containers: [
          { id: 'container-1', image: 'app:v1.0', config: {} },
        ],
      };

      const result = await restoreSnapshot(snapshot, {
        restoreContainer: mockRestore,
      });

      expect(result.success).toBe(true);
      expect(mockRestore).toHaveBeenCalledWith(snapshot.containers[0]);
    });

    it('handles partial restore failure', async () => {
      const mockRestore = vi.fn()
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: 'Failed' });

      const snapshot = {
        id: 'snap-123',
        containers: [
          { id: 'container-1', image: 'app:v1.0' },
          { id: 'container-2', image: 'app:v1.0' },
        ],
      };

      const result = await restoreSnapshot(snapshot, {
        restoreContainer: mockRestore,
      });

      expect(result.success).toBe(false);
      expect(result.failedContainers).toHaveLength(1);
    });

    it('rolls back database migrations', async () => {
      const mockMigrationRollback = vi.fn().mockResolvedValue({ success: true });
      const snapshot = {
        id: 'snap-123',
        containers: [],
        database: {
          lastMigration: '20240101_create_users',
        },
      };

      await restoreSnapshot(snapshot, {
        rollbackMigrations: mockMigrationRollback,
      });

      expect(mockMigrationRollback).toHaveBeenCalledWith('20240101_create_users');
    });
  });

  describe('listSnapshots', () => {
    it('returns snapshots sorted by date', async () => {
      const mockList = vi.fn().mockResolvedValue([
        { id: 'snap-1', createdAt: '2024-01-01T10:00:00Z' },
        { id: 'snap-2', createdAt: '2024-01-02T10:00:00Z' },
      ]);

      const snapshots = await listSnapshots({ listFn: mockList });

      expect(snapshots[0].id).toBe('snap-2'); // Newest first
      expect(snapshots[1].id).toBe('snap-1');
    });

    it('filters by branch', async () => {
      const mockList = vi.fn().mockResolvedValue([
        { id: 'snap-1', branch: 'main' },
        { id: 'snap-2', branch: 'dev' },
      ]);

      const snapshots = await listSnapshots({
        listFn: mockList,
        branch: 'main',
      });

      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].branch).toBe('main');
    });

    it('limits results', async () => {
      const mockList = vi.fn().mockResolvedValue([
        { id: 'snap-1' },
        { id: 'snap-2' },
        { id: 'snap-3' },
      ]);

      const snapshots = await listSnapshots({
        listFn: mockList,
        limit: 2,
      });

      expect(snapshots).toHaveLength(2);
    });
  });

  describe('autoRollback', () => {
    it('triggers rollback on health check failure', async () => {
      const mockRollback = vi.fn().mockResolvedValue({ success: true });
      const snapshot = { id: 'snap-123', containers: [] };

      const result = await autoRollback({
        reason: 'health_check_failed',
        snapshot,
        rollbackFn: mockRollback,
      });

      expect(result.triggered).toBe(true);
      expect(result.reason).toBe('health_check_failed');
      expect(mockRollback).toHaveBeenCalled();
    });

    it('notifies on rollback', async () => {
      const mockNotify = vi.fn();
      const mockRollback = vi.fn().mockResolvedValue({ success: true });

      await autoRollback({
        reason: 'health_check_failed',
        snapshot: { id: 'snap-123', containers: [] },
        rollbackFn: mockRollback,
        notifyFn: mockNotify,
      });

      expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({
        type: 'rollback',
        reason: 'health_check_failed',
      }));
    });

    it('records audit entry', async () => {
      const mockAudit = vi.fn();
      const mockRollback = vi.fn().mockResolvedValue({ success: true });

      await autoRollback({
        reason: 'error_rate',
        snapshot: { id: 'snap-123', containers: [] },
        rollbackFn: mockRollback,
        auditFn: mockAudit,
      });

      expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'auto_rollback',
        reason: 'error_rate',
      }));
    });
  });

  describe('generateRecoveryPlaybook', () => {
    it('generates playbook for failed deployment', () => {
      const deployment = {
        id: 'deploy-123',
        branch: 'main',
        commitSha: 'abc123',
        state: 'failed',
        error: 'Health check timeout',
      };

      const playbook = generateRecoveryPlaybook(deployment);

      expect(playbook.title).toContain('Recovery');
      expect(playbook.steps).toBeDefined();
      expect(playbook.steps.length).toBeGreaterThan(0);
    });

    it('includes rollback command', () => {
      const deployment = {
        id: 'deploy-123',
        branch: 'main',
        commitSha: 'abc123',
        state: 'failed',
        previousSnapshot: 'snap-122',
      };

      const playbook = generateRecoveryPlaybook(deployment);
      const rollbackStep = playbook.steps.find(s => s.command?.includes('rollback'));

      expect(rollbackStep).toBeDefined();
    });

    it('includes investigation steps', () => {
      const deployment = {
        id: 'deploy-123',
        branch: 'main',
        state: 'failed',
        error: 'Container crashed',
      };

      const playbook = generateRecoveryPlaybook(deployment);
      const investigateStep = playbook.steps.find(s => s.title?.includes('Investigate'));

      expect(investigateStep).toBeDefined();
    });

    it('formats as markdown', () => {
      const deployment = {
        id: 'deploy-123',
        branch: 'main',
        state: 'failed',
      };

      const playbook = generateRecoveryPlaybook(deployment, { format: 'markdown' });

      expect(playbook).toContain('# Recovery Playbook');
      expect(playbook).toContain('## Steps');
    });
  });

  describe('createRollbackManager', () => {
    it('creates manager with methods', () => {
      const manager = createRollbackManager();
      expect(manager.createSnapshot).toBeDefined();
      expect(manager.restore).toBeDefined();
      expect(manager.list).toBeDefined();
      expect(manager.autoRollback).toBeDefined();
    });

    it('stores snapshots', async () => {
      const manager = createRollbackManager();

      const snapshot = await manager.createSnapshot({
        deploymentId: 'deploy-123',
        branch: 'main',
        commitSha: 'abc123',
      });

      const retrieved = manager.getSnapshot(snapshot.id);
      expect(retrieved).toBeDefined();
    });

    it('gets latest snapshot for branch', async () => {
      const manager = createRollbackManager();

      await manager.createSnapshot({ deploymentId: 'd1', branch: 'main', commitSha: 'a1' });
      await manager.createSnapshot({ deploymentId: 'd2', branch: 'main', commitSha: 'a2' });

      const latest = manager.getLatest('main');
      expect(latest.commitSha).toBe('a2');
    });
  });
});
