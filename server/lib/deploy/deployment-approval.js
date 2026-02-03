/**
 * Deployment Approval Module
 *
 * Handles approval workflows for deployments including:
 * - Creating approval requests
 * - Verifying approvals with 2FA
 * - Managing approval status and expiry
 */

import { randomUUID } from 'crypto';

/**
 * Approval status constants
 */
export const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
};

/**
 * Create an approval request
 * @param {Object} options - Request options
 * @param {string} options.branch - Branch being deployed
 * @param {string} options.requestedBy - User requesting deployment
 * @param {string} options.tier - Deployment tier (stable, dev, etc.)
 * @param {number} [options.expiresInMinutes=60] - Minutes until request expires
 * @param {string} [options.commitSha] - Commit SHA being deployed
 * @param {string} [options.commitMessage] - Commit message
 * @returns {Object} Approval request object
 */
export function createApprovalRequest(options) {
  const {
    branch,
    requestedBy,
    tier,
    expiresInMinutes = 60,
    commitSha,
    commitMessage,
  } = options;

  const createdAt = new Date().toISOString();
  const expiresAt = new Date(
    new Date(createdAt).getTime() + expiresInMinutes * 60000
  ).toISOString();

  const request = {
    id: randomUUID(),
    branch,
    requestedBy,
    tier,
    status: APPROVAL_STATUS.PENDING,
    createdAt,
    expiresAt,
  };

  if (commitSha) {
    request.commitSha = commitSha;
  }

  if (commitMessage) {
    request.commitMessage = commitMessage;
  }

  return request;
}

/**
 * Verify an approval request
 * @param {Object} request - The approval request
 * @param {Object} options - Verification options
 * @param {string} options.approver - User approving the request
 * @param {string[]} options.approvers - List of authorized approvers
 * @param {boolean} [options.allowSelfApproval=true] - Whether self-approval is allowed
 * @returns {Promise<Object>} Verification result
 */
export async function verifyApproval(request, options) {
  const { approver, approvers, allowSelfApproval = true } = options;

  // Check if request has expired
  if (new Date(request.expiresAt) < new Date()) {
    return {
      status: APPROVAL_STATUS.EXPIRED,
      reason: 'Request has expired',
    };
  }

  // Check self-approval
  if (!allowSelfApproval && request.requestedBy === approver) {
    return {
      status: APPROVAL_STATUS.REJECTED,
      reason: 'self-approval is not allowed',
    };
  }

  // Check if approver is authorized
  if (!approvers.includes(approver)) {
    return {
      status: APPROVAL_STATUS.REJECTED,
      reason: `${approver} is not authorized to approve deployments`,
    };
  }

  return {
    status: APPROVAL_STATUS.APPROVED,
    approvedBy: approver,
    approvedAt: new Date().toISOString(),
  };
}

/**
 * Verify 2FA code
 * @param {string} user - Username
 * @param {string} code - TOTP code
 * @param {Object} options - Verification options
 * @param {Function} [options.verifier] - Async function to verify the code
 * @returns {Promise<Object>} Verification result
 */
export async function verify2FA(user, code, options) {
  const { verifier } = options;

  // Validate code format (6 digits)
  if (!/^\d{6}$/.test(code)) {
    return {
      verified: false,
      error: 'Invalid code format',
    };
  }

  if (!verifier) {
    return {
      verified: false,
      error: 'No verifier configured',
    };
  }

  try {
    const verified = await verifier(user, code);
    return { verified };
  } catch (err) {
    return {
      verified: false,
      error: err.message,
    };
  }
}

/**
 * Get approvers from config
 * @param {Object} config - Configuration object
 * @param {string} [tier] - Optional tier to filter by
 * @returns {string[]} List of approvers
 */
export function getApprovers(config, tier) {
  const approvers = config?.deployment?.approvers;

  if (!approvers) {
    return [];
  }

  // If approvers is an array, return it
  if (Array.isArray(approvers)) {
    return approvers;
  }

  // If approvers is an object keyed by tier, return the tier's approvers
  if (tier && typeof approvers === 'object') {
    return approvers[tier] || [];
  }

  return [];
}

/**
 * Check approval status of a request
 * @param {Object} request - The approval request
 * @returns {string} Current status
 */
export function checkApprovalStatus(request) {
  // If already approved or rejected, return that status
  if (request.status === APPROVAL_STATUS.APPROVED) {
    return APPROVAL_STATUS.APPROVED;
  }

  if (request.status === APPROVAL_STATUS.REJECTED) {
    return APPROVAL_STATUS.REJECTED;
  }

  if (request.status === APPROVAL_STATUS.CANCELLED) {
    return APPROVAL_STATUS.CANCELLED;
  }

  // Check if expired
  if (new Date(request.expiresAt) < new Date()) {
    return APPROVAL_STATUS.EXPIRED;
  }

  return APPROVAL_STATUS.PENDING;
}

/**
 * Create a deployment approval manager
 * @returns {Object} Approval manager with methods
 */
export function createDeploymentApproval() {
  const requests = new Map();

  return {
    /**
     * Create a new approval request
     * @param {Object} options - Request options
     * @returns {Promise<Object>} The created request
     */
    async createRequest(options) {
      const request = createApprovalRequest(options);
      requests.set(request.id, request);
      return request;
    },

    /**
     * Approve a request
     * @param {string} requestId - Request ID
     * @param {Object} options - Approval options
     * @returns {Promise<Object>} Approval result
     */
    async approve(requestId, options) {
      const request = requests.get(requestId);
      if (!request) {
        return { status: APPROVAL_STATUS.REJECTED, reason: 'Request not found' };
      }

      const result = await verifyApproval(request, options);
      if (result.status === APPROVAL_STATUS.APPROVED) {
        request.status = APPROVAL_STATUS.APPROVED;
        request.approvedBy = result.approvedBy;
        request.approvedAt = result.approvedAt;
      }
      return result;
    },

    /**
     * Reject a request
     * @param {string} requestId - Request ID
     * @param {Object} options - Rejection options
     * @returns {Promise<Object>} Rejection result
     */
    async reject(requestId, options = {}) {
      const request = requests.get(requestId);
      if (!request) {
        return { status: APPROVAL_STATUS.REJECTED, reason: 'Request not found' };
      }

      request.status = APPROVAL_STATUS.REJECTED;
      request.rejectedBy = options.rejectedBy;
      request.rejectedAt = new Date().toISOString();
      request.reason = options.reason;

      return {
        status: APPROVAL_STATUS.REJECTED,
        rejectedBy: options.rejectedBy,
        reason: options.reason,
      };
    },

    /**
     * Check status of a request
     * @param {string} requestId - Request ID
     * @returns {string|null} Status or null if not found
     */
    checkStatus(requestId) {
      const request = requests.get(requestId);
      if (!request) {
        return null;
      }
      return checkApprovalStatus(request);
    },

    /**
     * Get a request by ID
     * @param {string} requestId - Request ID
     * @returns {Object|undefined} The request or undefined
     */
    getRequest(requestId) {
      return requests.get(requestId);
    },

    /**
     * List all pending requests
     * @returns {Object[]} Array of pending requests
     */
    listPending() {
      return Array.from(requests.values()).filter(
        (r) => checkApprovalStatus(r) === APPROVAL_STATUS.PENDING
      );
    },
  };
}
