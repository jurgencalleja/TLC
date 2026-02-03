/**
 * Deployment Audit Tests
 */
import { describe, it, expect, vi } from 'vitest';
import {
  logDeploymentEvent,
  queryAuditLog,
  exportAuditLog,
  AUDIT_EVENTS,
  createDeploymentAudit,
} from './deployment-audit.js';

describe('deployment-audit', () => {
  describe('AUDIT_EVENTS', () => {
    it('defines all event types', () => {
      expect(AUDIT_EVENTS.DEPLOYMENT_STARTED).toBe('deployment_started');
      expect(AUDIT_EVENTS.DEPLOYMENT_COMPLETED).toBe('deployment_completed');
      expect(AUDIT_EVENTS.DEPLOYMENT_FAILED).toBe('deployment_failed');
      expect(AUDIT_EVENTS.APPROVAL_REQUESTED).toBe('approval_requested');
      expect(AUDIT_EVENTS.APPROVAL_GRANTED).toBe('approval_granted');
      expect(AUDIT_EVENTS.APPROVAL_DENIED).toBe('approval_denied');
      expect(AUDIT_EVENTS.ROLLBACK_TRIGGERED).toBe('rollback_triggered');
      expect(AUDIT_EVENTS.ROLLBACK_COMPLETED).toBe('rollback_completed');
      expect(AUDIT_EVENTS.SECURITY_GATE_PASSED).toBe('security_gate_passed');
      expect(AUDIT_EVENTS.SECURITY_GATE_FAILED).toBe('security_gate_failed');
    });
  });

  describe('logDeploymentEvent', () => {
    it('logs event with required fields', async () => {
      const mockWrite = vi.fn().mockResolvedValue(true);

      const entry = await logDeploymentEvent({
        event: 'deployment_started',
        deploymentId: 'deploy-123',
        branch: 'main',
        user: 'alice',
        writeFn: mockWrite,
      });

      expect(entry.id).toBeDefined();
      expect(entry.event).toBe('deployment_started');
      expect(entry.deploymentId).toBe('deploy-123');
      expect(entry.branch).toBe('main');
      expect(entry.user).toBe('alice');
      expect(entry.timestamp).toBeDefined();
    });

    it('includes metadata when provided', async () => {
      const mockWrite = vi.fn().mockResolvedValue(true);

      const entry = await logDeploymentEvent({
        event: 'deployment_completed',
        deploymentId: 'deploy-123',
        branch: 'main',
        user: 'alice',
        metadata: {
          duration: 120000,
          commitSha: 'abc123',
        },
        writeFn: mockWrite,
      });

      expect(entry.metadata.duration).toBe(120000);
      expect(entry.metadata.commitSha).toBe('abc123');
    });

    it('generates checksum for integrity', async () => {
      const mockWrite = vi.fn().mockResolvedValue(true);

      const entry = await logDeploymentEvent({
        event: 'deployment_started',
        deploymentId: 'deploy-123',
        branch: 'main',
        user: 'alice',
        writeFn: mockWrite,
      });

      expect(entry.checksum).toBeDefined();
      expect(entry.checksum).toMatch(/^[a-f0-9]{64}$/); // SHA-256
    });

    it('links to previous entry', async () => {
      const mockWrite = vi.fn().mockResolvedValue(true);
      const previousChecksum = 'abc123def456';

      const entry = await logDeploymentEvent({
        event: 'deployment_completed',
        deploymentId: 'deploy-123',
        branch: 'main',
        user: 'alice',
        previousChecksum,
        writeFn: mockWrite,
      });

      expect(entry.previousChecksum).toBe(previousChecksum);
    });
  });

  describe('queryAuditLog', () => {
    const mockEntries = [
      { id: '1', event: 'deployment_started', branch: 'main', user: 'alice', timestamp: '2024-01-01T10:00:00Z' },
      { id: '2', event: 'deployment_completed', branch: 'main', user: 'alice', timestamp: '2024-01-01T10:05:00Z' },
      { id: '3', event: 'deployment_started', branch: 'dev', user: 'bob', timestamp: '2024-01-01T11:00:00Z' },
      { id: '4', event: 'deployment_failed', branch: 'dev', user: 'bob', timestamp: '2024-01-01T11:02:00Z' },
    ];

    it('queries by date range', async () => {
      const mockQuery = vi.fn().mockResolvedValue(mockEntries);

      const results = await queryAuditLog({
        startDate: '2024-01-01T10:00:00Z',
        endDate: '2024-01-01T10:30:00Z',
        queryFn: mockQuery,
      });

      expect(results).toHaveLength(2);
    });

    it('queries by user', async () => {
      const mockQuery = vi.fn().mockResolvedValue(mockEntries);

      const results = await queryAuditLog({
        user: 'bob',
        queryFn: mockQuery,
      });

      expect(results).toHaveLength(2);
      expect(results.every(e => e.user === 'bob')).toBe(true);
    });

    it('queries by branch', async () => {
      const mockQuery = vi.fn().mockResolvedValue(mockEntries);

      const results = await queryAuditLog({
        branch: 'main',
        queryFn: mockQuery,
      });

      expect(results).toHaveLength(2);
      expect(results.every(e => e.branch === 'main')).toBe(true);
    });

    it('queries by event type', async () => {
      const mockQuery = vi.fn().mockResolvedValue(mockEntries);

      const results = await queryAuditLog({
        event: 'deployment_failed',
        queryFn: mockQuery,
      });

      expect(results).toHaveLength(1);
      expect(results[0].event).toBe('deployment_failed');
    });

    it('combines filters', async () => {
      const mockQuery = vi.fn().mockResolvedValue(mockEntries);

      const results = await queryAuditLog({
        branch: 'dev',
        user: 'bob',
        queryFn: mockQuery,
      });

      expect(results).toHaveLength(2);
    });

    it('paginates results', async () => {
      const mockQuery = vi.fn().mockResolvedValue(mockEntries);

      const results = await queryAuditLog({
        limit: 2,
        offset: 1,
        queryFn: mockQuery,
      });

      expect(results).toHaveLength(2);
    });
  });

  describe('exportAuditLog', () => {
    const mockEntries = [
      { id: '1', event: 'deployment_started', branch: 'main', user: 'alice', timestamp: '2024-01-01T10:00:00Z' },
      { id: '2', event: 'deployment_completed', branch: 'main', user: 'alice', timestamp: '2024-01-01T10:05:00Z' },
    ];

    it('exports as JSON', async () => {
      const mockQuery = vi.fn().mockResolvedValue(mockEntries);

      const result = await exportAuditLog({
        format: 'json',
        queryFn: mockQuery,
      });

      const parsed = JSON.parse(result);
      expect(parsed.entries).toHaveLength(2);
      expect(parsed.exportedAt).toBeDefined();
    });

    it('exports as CSV', async () => {
      const mockQuery = vi.fn().mockResolvedValue(mockEntries);

      const result = await exportAuditLog({
        format: 'csv',
        queryFn: mockQuery,
      });

      expect(result).toContain('id,event,branch,user,timestamp');
      expect(result).toContain('deployment_started');
    });

    it('exports as SIEM format (CEF)', async () => {
      const mockQuery = vi.fn().mockResolvedValue(mockEntries);

      const result = await exportAuditLog({
        format: 'cef',
        queryFn: mockQuery,
      });

      expect(result).toContain('CEF:0');
      expect(result).toContain('deployment_started');
    });

    it('includes metadata in export', async () => {
      const mockQuery = vi.fn().mockResolvedValue(mockEntries);

      const result = await exportAuditLog({
        format: 'json',
        includeMetadata: true,
        queryFn: mockQuery,
      });

      const parsed = JSON.parse(result);
      expect(parsed.totalEntries).toBe(2);
    });
  });

  describe('createDeploymentAudit', () => {
    it('creates audit logger', () => {
      const audit = createDeploymentAudit();
      expect(audit.log).toBeDefined();
      expect(audit.query).toBeDefined();
      expect(audit.export).toBeDefined();
    });

    it('logs events to storage', async () => {
      const mockStorage = {
        write: vi.fn().mockResolvedValue(true),
        read: vi.fn().mockResolvedValue([]),
      };

      const audit = createDeploymentAudit({ storage: mockStorage });

      await audit.log({
        event: 'deployment_started',
        deploymentId: 'deploy-123',
        branch: 'main',
        user: 'alice',
      });

      expect(mockStorage.write).toHaveBeenCalled();
    });

    it('maintains checksum chain', async () => {
      const audit = createDeploymentAudit();

      const entry1 = await audit.log({
        event: 'deployment_started',
        deploymentId: 'deploy-123',
        branch: 'main',
        user: 'alice',
      });

      const entry2 = await audit.log({
        event: 'deployment_completed',
        deploymentId: 'deploy-123',
        branch: 'main',
        user: 'alice',
      });

      expect(entry2.previousChecksum).toBe(entry1.checksum);
    });

    it('verifies log integrity', async () => {
      const audit = createDeploymentAudit();

      await audit.log({ event: 'deployment_started', deploymentId: 'd1', branch: 'main', user: 'alice' });
      await audit.log({ event: 'deployment_completed', deploymentId: 'd1', branch: 'main', user: 'alice' });

      const integrity = await audit.verifyIntegrity();
      expect(integrity.valid).toBe(true);
    });

    it('detects tampered entries', async () => {
      const audit = createDeploymentAudit();

      await audit.log({ event: 'deployment_started', deploymentId: 'd1', branch: 'main', user: 'alice' });

      // Simulate tampering
      audit._tamperEntry(0, { user: 'mallory' });

      const integrity = await audit.verifyIntegrity();
      expect(integrity.valid).toBe(false);
      expect(integrity.tamperedEntries).toHaveLength(1);
    });
  });
});
