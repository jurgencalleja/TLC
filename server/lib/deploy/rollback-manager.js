/**
 * Rollback Manager
 * Handles deployment snapshots and rollback operations
 */

/**
 * Rollback reason constants
 */
export const ROLLBACK_REASONS = {
  HEALTH_CHECK_FAILED: 'health_check_failed',
  MANUAL: 'manual',
  ERROR_RATE: 'error_rate',
  LATENCY: 'latency',
  SECURITY: 'security',
};

/**
 * Generate a unique ID
 */
function generateId(prefix = 'snap') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a snapshot of current deployment state
 * @param {Object} options - Snapshot options
 * @param {string} options.deploymentId - Deployment identifier
 * @param {string} options.branch - Git branch
 * @param {string} options.commitSha - Git commit SHA
 * @param {string[]} [options.containerIds] - Container IDs to capture
 * @param {Function} [options.captureState] - Function to capture container state
 * @param {Function} [options.captureDbState] - Function to capture database state
 * @returns {Promise<Object>} Snapshot object
 */
export async function createSnapshot(options) {
  const {
    deploymentId,
    branch,
    commitSha,
    containerIds = [],
    captureState,
    captureDbState,
  } = options;

  const snapshot = {
    id: generateId('snap'),
    deploymentId,
    branch,
    commitSha,
    createdAt: new Date().toISOString(),
    containers: [],
    database: null,
  };

  // Capture container state if function provided
  if (captureState && containerIds.length > 0) {
    for (const containerId of containerIds) {
      const state = await captureState(containerId);
      snapshot.containers.push({
        id: containerId,
        ...state,
      });
    }
  }

  // Capture database migration state if function provided
  if (captureDbState) {
    snapshot.database = await captureDbState();
  }

  return snapshot;
}

/**
 * Restore from a snapshot
 * @param {Object} snapshot - Snapshot to restore
 * @param {Object} options - Restore options
 * @param {Function} [options.restoreContainer] - Function to restore a container
 * @param {Function} [options.rollbackMigrations] - Function to rollback migrations
 * @returns {Promise<Object>} Restore result
 */
export async function restoreSnapshot(snapshot, options = {}) {
  const { restoreContainer, rollbackMigrations } = options;

  const result = {
    success: true,
    snapshotId: snapshot.id,
    restoredContainers: [],
    failedContainers: [],
  };

  // Restore containers
  if (restoreContainer && snapshot.containers?.length > 0) {
    for (const container of snapshot.containers) {
      const restoreResult = await restoreContainer(container);
      if (restoreResult.success) {
        result.restoredContainers.push(container.id);
      } else {
        result.failedContainers.push({
          id: container.id,
          error: restoreResult.error,
        });
        result.success = false;
      }
    }
  }

  // Rollback database migrations
  if (rollbackMigrations && snapshot.database?.lastMigration) {
    await rollbackMigrations(snapshot.database.lastMigration);
  }

  return result;
}

/**
 * List snapshots with optional filtering
 * @param {Object} options - List options
 * @param {Function} options.listFn - Function to fetch snapshots
 * @param {string} [options.branch] - Filter by branch
 * @param {number} [options.limit] - Limit results
 * @returns {Promise<Object[]>} Sorted snapshots
 */
export async function listSnapshots(options) {
  const { listFn, branch, limit } = options;

  let snapshots = await listFn();

  // Filter by branch if specified
  if (branch) {
    snapshots = snapshots.filter((s) => s.branch === branch);
  }

  // Sort by date descending (newest first)
  snapshots.sort((a, b) => {
    const dateA = new Date(a.createdAt || 0);
    const dateB = new Date(b.createdAt || 0);
    return dateB - dateA;
  });

  // Limit results if specified
  if (limit) {
    snapshots = snapshots.slice(0, limit);
  }

  return snapshots;
}

/**
 * Trigger automatic rollback
 * @param {Object} options - Rollback options
 * @param {string} options.reason - Rollback reason
 * @param {Object} options.snapshot - Snapshot to rollback to
 * @param {Function} options.rollbackFn - Function to perform rollback
 * @param {Function} [options.notifyFn] - Function to send notifications
 * @param {Function} [options.auditFn] - Function to record audit entry
 * @returns {Promise<Object>} Rollback result
 */
export async function autoRollback(options) {
  const { reason, snapshot, rollbackFn, notifyFn, auditFn } = options;

  const result = {
    triggered: true,
    reason,
    snapshotId: snapshot.id,
    timestamp: new Date().toISOString(),
  };

  // Perform rollback
  const rollbackResult = await rollbackFn(snapshot);
  result.success = rollbackResult.success;

  // Send notification
  if (notifyFn) {
    await notifyFn({
      type: 'rollback',
      reason,
      snapshotId: snapshot.id,
      timestamp: result.timestamp,
    });
  }

  // Record audit entry
  if (auditFn) {
    await auditFn({
      action: 'auto_rollback',
      reason,
      snapshotId: snapshot.id,
      timestamp: result.timestamp,
      success: result.success,
    });
  }

  return result;
}

/**
 * Generate recovery playbook for failed deployment
 * @param {Object} deployment - Failed deployment info
 * @param {Object} [options] - Generation options
 * @param {string} [options.format] - Output format ('object' or 'markdown')
 * @returns {Object|string} Playbook object or markdown string
 */
export function generateRecoveryPlaybook(deployment, options = {}) {
  const { format } = options;

  const steps = [];

  // Step 1: Assess the situation
  steps.push({
    title: 'Assess Deployment State',
    description: `Check the current state of deployment ${deployment.id}`,
    command: `tlc deploy status ${deployment.id}`,
  });

  // Step 2: Investigate the failure
  steps.push({
    title: 'Investigate Failure',
    description: deployment.error
      ? `Review error: ${deployment.error}`
      : 'Check logs for failure reason',
    command: `tlc logs ${deployment.id} --tail 100`,
  });

  // Step 3: Rollback if snapshot available
  if (deployment.previousSnapshot) {
    steps.push({
      title: 'Rollback to Previous Snapshot',
      description: `Restore from snapshot ${deployment.previousSnapshot}`,
      command: `tlc deploy rollback --snapshot ${deployment.previousSnapshot}`,
    });
  } else {
    steps.push({
      title: 'Manual Rollback',
      description: 'No previous snapshot available, perform manual rollback',
      command: `tlc deploy rollback --branch ${deployment.branch} --previous`,
    });
  }

  // Step 4: Verify rollback
  steps.push({
    title: 'Verify Rollback Success',
    description: 'Confirm the rollback was successful',
    command: 'tlc deploy health-check',
  });

  // Step 5: Post-mortem
  steps.push({
    title: 'Create Incident Report',
    description: 'Document the failure and recovery process',
    command: `tlc incident create --deployment ${deployment.id}`,
  });

  const playbook = {
    title: `Recovery Playbook for ${deployment.id}`,
    deployment: {
      id: deployment.id,
      branch: deployment.branch,
      commitSha: deployment.commitSha,
      state: deployment.state,
      error: deployment.error,
    },
    steps,
    generatedAt: new Date().toISOString(),
  };

  // Format as markdown if requested
  if (format === 'markdown') {
    return formatPlaybookAsMarkdown(playbook);
  }

  return playbook;
}

/**
 * Format playbook as markdown
 * @param {Object} playbook - Playbook object
 * @returns {string} Markdown formatted playbook
 */
function formatPlaybookAsMarkdown(playbook) {
  let md = `# Recovery Playbook\n\n`;
  md += `**Deployment:** ${playbook.deployment.id}\n`;
  md += `**Branch:** ${playbook.deployment.branch}\n`;
  md += `**State:** ${playbook.deployment.state}\n`;

  if (playbook.deployment.error) {
    md += `**Error:** ${playbook.deployment.error}\n`;
  }

  md += `\n## Steps\n\n`;

  playbook.steps.forEach((step, index) => {
    md += `### ${index + 1}. ${step.title}\n\n`;
    md += `${step.description}\n\n`;
    if (step.command) {
      md += `\`\`\`bash\n${step.command}\n\`\`\`\n\n`;
    }
  });

  return md;
}

/**
 * Create a rollback manager instance with in-memory storage
 * @returns {Object} Rollback manager
 */
export function createRollbackManager() {
  const snapshots = new Map();
  let sequenceNumber = 0;

  // Reference module-level function to avoid shadowing
  const createSnapshotFn = createSnapshot;

  return {
    /**
     * Create and store a snapshot
     */
    async createSnapshot(options) {
      const snapshot = await createSnapshotFn(options);
      // Add sequence number to maintain insertion order when timestamps are identical
      snapshot._seq = ++sequenceNumber;
      snapshots.set(snapshot.id, snapshot);
      return snapshot;
    },

    /**
     * Restore from a snapshot
     */
    async restore(snapshotId, options = {}) {
      const snapshot = snapshots.get(snapshotId);
      if (!snapshot) {
        throw new Error(`Snapshot not found: ${snapshotId}`);
      }
      return restoreSnapshot(snapshot, options);
    },

    /**
     * List all snapshots
     */
    async list(options = {}) {
      const allSnapshots = Array.from(snapshots.values());
      return listSnapshots({
        listFn: async () => allSnapshots,
        ...options,
      });
    },

    /**
     * Trigger automatic rollback
     */
    async autoRollback(options) {
      return autoRollback(options);
    },

    /**
     * Get a specific snapshot by ID
     */
    getSnapshot(id) {
      return snapshots.get(id);
    },

    /**
     * Get the latest snapshot for a branch
     */
    getLatest(branch) {
      const branchSnapshots = Array.from(snapshots.values())
        .filter((s) => s.branch === branch)
        .sort((a, b) => {
          // Primary sort by date, secondary by sequence number for same-millisecond snapshots
          const dateA = new Date(a.createdAt);
          const dateB = new Date(b.createdAt);
          if (dateB - dateA !== 0) return dateB - dateA;
          return (b._seq || 0) - (a._seq || 0);
        });

      return branchSnapshots[0] || null;
    },
  };
}
