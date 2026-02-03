/**
 * Deployment Approval Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createApprovalRequest,
  verifyApproval,
  verify2FA,
  getApprovers,
  checkApprovalStatus,
  APPROVAL_STATUS,
  createDeploymentApproval,
} from './deployment-approval.js';

describe('deployment-approval', () => {
  describe('APPROVAL_STATUS', () => {
    it('defines all status constants', () => {
      expect(APPROVAL_STATUS.PENDING).toBe('pending');
      expect(APPROVAL_STATUS.APPROVED).toBe('approved');
      expect(APPROVAL_STATUS.REJECTED).toBe('rejected');
      expect(APPROVAL_STATUS.EXPIRED).toBe('expired');
      expect(APPROVAL_STATUS.CANCELLED).toBe('cancelled');
    });
  });

  describe('createApprovalRequest', () => {
    it('creates approval request with required fields', () => {
      const request = createApprovalRequest({
        branch: 'main',
        requestedBy: 'alice',
        tier: 'stable',
      });

      expect(request.id).toBeDefined();
      expect(request.branch).toBe('main');
      expect(request.requestedBy).toBe('alice');
      expect(request.tier).toBe('stable');
      expect(request.status).toBe('pending');
      expect(request.createdAt).toBeDefined();
    });

    it('sets expiry time', () => {
      const request = createApprovalRequest({
        branch: 'main',
        requestedBy: 'alice',
        tier: 'stable',
        expiresInMinutes: 30,
      });

      const expectedExpiry = new Date(request.createdAt);
      expectedExpiry.setMinutes(expectedExpiry.getMinutes() + 30);
      expect(new Date(request.expiresAt).getTime()).toBeCloseTo(expectedExpiry.getTime(), -3);
    });

    it('defaults to 60 minute expiry', () => {
      const request = createApprovalRequest({
        branch: 'main',
        requestedBy: 'alice',
        tier: 'stable',
      });

      const created = new Date(request.createdAt);
      const expires = new Date(request.expiresAt);
      const diffMinutes = (expires - created) / 60000;
      expect(diffMinutes).toBe(60);
    });

    it('includes commit info when provided', () => {
      const request = createApprovalRequest({
        branch: 'main',
        requestedBy: 'alice',
        tier: 'stable',
        commitSha: 'abc123',
        commitMessage: 'Fix bug',
      });

      expect(request.commitSha).toBe('abc123');
      expect(request.commitMessage).toBe('Fix bug');
    });
  });

  describe('verifyApproval', () => {
    it('approves with valid approver', async () => {
      const request = createApprovalRequest({
        branch: 'main',
        requestedBy: 'alice',
        tier: 'stable',
      });

      const result = await verifyApproval(request, {
        approver: 'bob',
        approvers: ['bob', 'carol'],
      });

      expect(result.status).toBe('approved');
      expect(result.approvedBy).toBe('bob');
      expect(result.approvedAt).toBeDefined();
    });

    it('rejects if not in approvers list', async () => {
      const request = createApprovalRequest({
        branch: 'main',
        requestedBy: 'alice',
        tier: 'stable',
      });

      const result = await verifyApproval(request, {
        approver: 'dave',
        approvers: ['bob', 'carol'],
      });

      expect(result.status).toBe('rejected');
      expect(result.reason).toContain('not authorized');
    });

    it('rejects expired requests', async () => {
      const request = createApprovalRequest({
        branch: 'main',
        requestedBy: 'alice',
        tier: 'stable',
        expiresInMinutes: -1, // Already expired
      });

      const result = await verifyApproval(request, {
        approver: 'bob',
        approvers: ['bob'],
      });

      expect(result.status).toBe('expired');
    });

    it('prevents self-approval', async () => {
      const request = createApprovalRequest({
        branch: 'main',
        requestedBy: 'alice',
        tier: 'stable',
      });

      const result = await verifyApproval(request, {
        approver: 'alice',
        approvers: ['alice', 'bob'],
        allowSelfApproval: false,
      });

      expect(result.status).toBe('rejected');
      expect(result.reason).toContain('self-approval');
    });

    it('allows self-approval when configured', async () => {
      const request = createApprovalRequest({
        branch: 'main',
        requestedBy: 'alice',
        tier: 'stable',
      });

      const result = await verifyApproval(request, {
        approver: 'alice',
        approvers: ['alice'],
        allowSelfApproval: true,
      });

      expect(result.status).toBe('approved');
    });
  });

  describe('verify2FA', () => {
    it('verifies valid TOTP code', async () => {
      const mockVerifier = vi.fn().mockResolvedValue(true);
      const result = await verify2FA('alice', '123456', { verifier: mockVerifier });

      expect(result.verified).toBe(true);
      expect(mockVerifier).toHaveBeenCalledWith('alice', '123456');
    });

    it('rejects invalid TOTP code', async () => {
      const mockVerifier = vi.fn().mockResolvedValue(false);
      const result = await verify2FA('alice', '000000', { verifier: mockVerifier });

      expect(result.verified).toBe(false);
    });

    it('handles verification errors', async () => {
      const mockVerifier = vi.fn().mockRejectedValue(new Error('Service unavailable'));
      const result = await verify2FA('alice', '123456', { verifier: mockVerifier });

      expect(result.verified).toBe(false);
      expect(result.error).toContain('Service unavailable');
    });

    it('validates code format', async () => {
      const result = await verify2FA('alice', 'abc', {});
      expect(result.verified).toBe(false);
      expect(result.error).toContain('Invalid code format');
    });
  });

  describe('getApprovers', () => {
    it('returns approvers from config', () => {
      const config = {
        deployment: {
          approvers: ['alice', 'bob'],
        },
      };
      const approvers = getApprovers(config);
      expect(approvers).toEqual(['alice', 'bob']);
    });

    it('returns empty array when not configured', () => {
      const approvers = getApprovers({});
      expect(approvers).toEqual([]);
    });

    it('filters by tier when specified', () => {
      const config = {
        deployment: {
          approvers: {
            stable: ['alice', 'bob'],
            dev: ['carol'],
          },
        },
      };
      expect(getApprovers(config, 'stable')).toEqual(['alice', 'bob']);
      expect(getApprovers(config, 'dev')).toEqual(['carol']);
    });
  });

  describe('checkApprovalStatus', () => {
    it('returns pending for fresh request', () => {
      const request = createApprovalRequest({
        branch: 'main',
        requestedBy: 'alice',
        tier: 'stable',
      });

      const status = checkApprovalStatus(request);
      expect(status).toBe('pending');
    });

    it('returns expired for old request', () => {
      const request = createApprovalRequest({
        branch: 'main',
        requestedBy: 'alice',
        tier: 'stable',
        expiresInMinutes: -1,
      });

      const status = checkApprovalStatus(request);
      expect(status).toBe('expired');
    });

    it('returns approved when approved', () => {
      const request = createApprovalRequest({
        branch: 'main',
        requestedBy: 'alice',
        tier: 'stable',
      });
      request.status = 'approved';
      request.approvedBy = 'bob';

      const status = checkApprovalStatus(request);
      expect(status).toBe('approved');
    });
  });

  describe('createDeploymentApproval', () => {
    it('creates approval manager', () => {
      const approval = createDeploymentApproval();
      expect(approval.createRequest).toBeDefined();
      expect(approval.approve).toBeDefined();
      expect(approval.reject).toBeDefined();
      expect(approval.checkStatus).toBeDefined();
    });

    it('stores pending requests', async () => {
      const approval = createDeploymentApproval();
      const request = await approval.createRequest({
        branch: 'main',
        requestedBy: 'alice',
        tier: 'stable',
      });

      const retrieved = approval.getRequest(request.id);
      expect(retrieved).toBeDefined();
      expect(retrieved.branch).toBe('main');
    });

    it('lists pending requests', async () => {
      const approval = createDeploymentApproval();
      await approval.createRequest({ branch: 'main', requestedBy: 'alice', tier: 'stable' });
      await approval.createRequest({ branch: 'release/1.0', requestedBy: 'bob', tier: 'stable' });

      const pending = approval.listPending();
      expect(pending).toHaveLength(2);
    });
  });
});
