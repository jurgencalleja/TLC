/**
 * Deployment Executor
 *
 * Handles deployment orchestration with support for multiple strategies:
 * - Rolling: Gradual replacement of instances
 * - Blue-Green: Deploy to inactive slot, then switch traffic
 * - Canary: Gradual traffic shift to new version
 * - Recreate: Stop old version, start new version
 */

import { randomUUID } from 'node:crypto';

/**
 * Deployment state constants
 */
export const DEPLOYMENT_STATES = {
  PENDING: 'pending',
  BUILDING: 'building',
  DEPLOYING: 'deploying',
  HEALTH_CHECK: 'health_check',
  SWITCHING: 'switching',
  COMPLETED: 'completed',
  FAILED: 'failed',
  ROLLED_BACK: 'rolled_back',
};

/**
 * Deployment strategy constants
 */
export const DEPLOYMENT_STRATEGIES = {
  ROLLING: 'rolling',
  BLUE_GREEN: 'blue-green',
  CANARY: 'canary',
  RECREATE: 'recreate',
};

/**
 * Create a new deployment object
 * @param {Object} options - Deployment options
 * @param {string} options.branch - Git branch name
 * @param {string} options.commitSha - Git commit SHA
 * @param {string} [options.strategy='rolling'] - Deployment strategy
 * @returns {Object} Deployment object
 */
export function createDeployment(options) {
  const { branch, commitSha, strategy = DEPLOYMENT_STRATEGIES.ROLLING } = options;

  const now = new Date().toISOString();

  return {
    id: randomUUID(),
    branch,
    commitSha,
    strategy,
    state: DEPLOYMENT_STATES.PENDING,
    createdAt: now,
    stateHistory: [{ state: DEPLOYMENT_STATES.PENDING, timestamp: now }],
    error: null,
  };
}

/**
 * Transition deployment to a new state
 * @param {Object} deployment - Deployment object
 * @param {string} newState - New state
 * @param {Function} [onStateChange] - State change callback
 * @returns {Object} Updated deployment
 */
function transitionState(deployment, newState, onStateChange) {
  deployment.state = newState;
  deployment.stateHistory.push({
    state: newState,
    timestamp: new Date().toISOString(),
  });

  if (onStateChange) {
    // Pass a snapshot to preserve state at time of callback
    onStateChange({ ...deployment, stateHistory: [...deployment.stateHistory] });
  }

  return deployment;
}

/**
 * Execute a deployment
 * @param {Object} deployment - Deployment object
 * @param {Object} options - Execution options
 * @param {Function} options.build - Build function
 * @param {Function} [options.deploy] - Deploy function
 * @param {Function} [options.healthCheck] - Health check function
 * @param {Function} [options.switchTraffic] - Traffic switch function (for blue-green)
 * @param {Function} [options.onStateChange] - State change callback
 * @returns {Promise<Object>} Updated deployment
 */
export async function executeDeployment(deployment, options) {
  const { build, deploy, healthCheck, switchTraffic: switchTrafficFn, onStateChange } = options;

  try {
    // Building phase
    transitionState(deployment, DEPLOYMENT_STATES.BUILDING, onStateChange);
    const buildResult = await build(deployment);

    if (!buildResult.success) {
      deployment.error = buildResult.error || 'Build failed';
      return transitionState(deployment, DEPLOYMENT_STATES.FAILED, onStateChange);
    }

    // Deploying phase
    if (deploy) {
      transitionState(deployment, DEPLOYMENT_STATES.DEPLOYING, onStateChange);
      const deployResult = await deploy(deployment);

      if (!deployResult.success) {
        deployment.error = deployResult.error || 'Deploy failed';
        return transitionState(deployment, DEPLOYMENT_STATES.FAILED, onStateChange);
      }

      deployment.slot = deployResult.slot;
    }

    // Health check phase
    if (healthCheck) {
      transitionState(deployment, DEPLOYMENT_STATES.HEALTH_CHECK, onStateChange);
      const healthResult = await healthCheck(deployment);

      if (!healthResult.healthy) {
        deployment.error = healthResult.reason || 'Health check failed';
        return transitionState(deployment, DEPLOYMENT_STATES.FAILED, onStateChange);
      }
    }

    // Traffic switching phase (for blue-green deployments)
    if (deployment.strategy === DEPLOYMENT_STRATEGIES.BLUE_GREEN && switchTrafficFn) {
      transitionState(deployment, DEPLOYMENT_STATES.SWITCHING, onStateChange);
      const switchResult = await switchTrafficFn(deployment);

      if (!switchResult.success) {
        deployment.error = switchResult.error || 'Traffic switch failed';
        return transitionState(deployment, DEPLOYMENT_STATES.FAILED, onStateChange);
      }
    }

    // Completed
    return transitionState(deployment, DEPLOYMENT_STATES.COMPLETED, onStateChange);
  } catch (error) {
    deployment.error = error.message;
    return transitionState(deployment, DEPLOYMENT_STATES.FAILED, onStateChange);
  }
}

/**
 * Run health checks against multiple endpoints
 * @param {Object} options - Health check options
 * @param {string[]} options.endpoints - URLs to check
 * @param {Function} options.fetch - Fetch function
 * @param {number} [options.retries=1] - Number of retry attempts
 * @param {number} [options.retryDelay=1000] - Delay between retries in ms
 * @param {number} [options.timeout=30000] - Timeout in ms
 * @returns {Promise<Object>} Health check result
 */
export async function runHealthChecks(options) {
  const { endpoints, fetch: fetchFn, retries = 1, retryDelay = 1000, timeout = 30000 } = options;

  /**
   * Check a single endpoint with timeout
   */
  async function checkEndpoint(url) {
    return Promise.race([
      fetchFn(url),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), timeout)
      ),
    ]);
  }

  /**
   * Check endpoint with retries
   */
  async function checkWithRetries(url, attemptsLeft) {
    try {
      const response = await checkEndpoint(url);
      if (response.ok) {
        return { healthy: true, url };
      }

      if (attemptsLeft > 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        return checkWithRetries(url, attemptsLeft - 1);
      }

      return { healthy: false, url, reason: `Status ${response.status}` };
    } catch (error) {
      if (attemptsLeft > 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        return checkWithRetries(url, attemptsLeft - 1);
      }

      return { healthy: false, url, reason: error.message };
    }
  }

  try {
    const results = await Promise.all(
      endpoints.map((endpoint) => checkWithRetries(endpoint, retries))
    );

    const unhealthy = results.filter((r) => !r.healthy);

    if (unhealthy.length > 0) {
      return {
        healthy: false,
        reason: unhealthy.map((u) => `${u.url}: ${u.reason}`).join(', '),
        results,
      };
    }

    return { healthy: true, results };
  } catch (error) {
    return { healthy: false, reason: error.message };
  }
}

/**
 * Switch traffic between deployment slots
 * @param {Object} options - Switch options
 * @param {string} options.fromSlot - Source slot
 * @param {string} options.toSlot - Target slot
 * @param {Function} options.switchFn - Switch function
 * @returns {Promise<Object>} Switch result
 */
export async function switchTraffic(options) {
  const { fromSlot, toSlot, switchFn } = options;

  try {
    const result = await switchFn(fromSlot, toSlot);
    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Cleanup old deployment resources
 * @param {Object} options - Cleanup options
 * @param {string} options.slot - Slot to cleanup
 * @param {Function} options.cleanupFn - Cleanup function
 * @returns {Promise<Object>} Cleanup result
 */
export async function cleanupOldDeployment(options) {
  const { slot, cleanupFn } = options;

  try {
    await cleanupFn(slot);
    return { success: true };
  } catch (error) {
    // Log warning but don't throw - cleanup failures are not critical
    console.warn(`Cleanup failed for slot ${slot}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Create a deployment executor instance
 * @param {Object} [config={}] - Executor configuration
 * @param {Function} [config.build] - Build function
 * @param {Function} [config.deploy] - Deploy function
 * @param {Function} [config.healthCheck] - Health check function
 * @param {Function} [config.switchTraffic] - Traffic switch function
 * @returns {Object} Deployment executor
 */
export function createDeploymentExecutor(config = {}) {
  const deployments = new Map();

  return {
    /**
     * Execute an existing deployment
     * @param {Object} deployment - Deployment to execute
     * @param {Object} [options] - Additional options
     * @returns {Promise<Object>} Execution result
     */
    async execute(deployment, options = {}) {
      return executeDeployment(deployment, { ...config, ...options });
    },

    /**
     * Start a new deployment
     * @param {Object} options - Deployment options
     * @returns {Promise<Object>} Created and executed deployment
     */
    async start(options) {
      const deployment = createDeployment(options);
      deployments.set(deployment.id, deployment);

      // Execute in background, don't await
      executeDeployment(deployment, config).catch((error) => {
        deployment.error = error.message;
        deployment.state = DEPLOYMENT_STATES.FAILED;
      });

      return deployment;
    },

    /**
     * Get a deployment by ID
     * @param {string} id - Deployment ID
     * @returns {Object|undefined} Deployment or undefined
     */
    getDeployment(id) {
      return deployments.get(id);
    },

    /**
     * List all deployments
     * @returns {Object[]} Array of deployments
     */
    list() {
      return Array.from(deployments.values());
    },

    /**
     * Cancel a deployment
     * @param {string} id - Deployment ID
     * @returns {boolean} True if cancelled
     */
    cancel(id) {
      const deployment = deployments.get(id);
      if (deployment && deployment.state !== DEPLOYMENT_STATES.COMPLETED) {
        deployment.state = DEPLOYMENT_STATES.FAILED;
        deployment.error = 'Cancelled';
        return true;
      }
      return false;
    },
  };
}
