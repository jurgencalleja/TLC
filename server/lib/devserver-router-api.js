/**
 * Devserver Router API - HTTP endpoints for task execution
 */

import { createRouter } from './model-router.js';
import { createQueue } from './provider-queue.js';

/**
 * Create router API handlers
 * @param {Object} options - API options
 * @param {string} options.secret - Authentication secret
 * @param {Object} [options.routerConfig] - Router configuration
 * @param {Object} [options.queueConfig] - Queue configuration
 * @returns {Promise<Object>} API handlers
 */
export async function createRouterAPI(options = {}) {
  const { secret, routerConfig, queueConfig } = options;

  // Initialize router and queue
  const router = await createRouter(routerConfig);
  const queue = createQueue(queueConfig);

  return {
    handleRun: handleRun(router, queue),
    handleTaskStatus: handleTaskStatus(queue),
    handleReview: handleReview(router),
    handleDesign: handleDesign(router),
    handleHealth: handleHealth(router),
    validateAuth: validateAuth(secret),
    router,
    queue,
  };
}

/**
 * Handle POST /api/run - Queue a task
 * @param {Object} router - Router instance
 * @param {Object} queue - Queue instance
 * @returns {Function} Express handler
 */
export function handleRun(router, queue) {
  return async (req, res) => {
    try {
      const { capability, prompt, options = {} } = req.body;

      // Create task function
      const taskFn = async () => {
        return await router.run(capability, prompt, options);
      };

      // Enqueue the task
      const taskId = await queue.enqueue(taskFn, {
        priority: options.priority || 5,
        capability,
      });

      res.json({ taskId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}

/**
 * Handle GET /api/task/:taskId - Get task status
 * @param {Object} queue - Queue instance
 * @returns {Function} Express handler
 */
export function handleTaskStatus(queue) {
  return async (req, res) => {
    try {
      const { taskId } = req.params;
      const task = queue.getTask(taskId);

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      res.json({
        status: task.status,
        result: task.result,
        error: task.error,
        createdAt: task.createdAt,
        completedAt: task.completedAt,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}

/**
 * Handle POST /api/review - Multi-model review
 * @param {Object} router - Router instance
 * @returns {Function} Express handler
 */
export function handleReview(router) {
  return async (req, res) => {
    try {
      const { code, prompt = 'Review this code', options = {} } = req.body;

      const fullPrompt = code ? `${prompt}\n\n\`\`\`\n${code}\n\`\`\`` : prompt;

      const results = await router.run('review', fullPrompt, options);

      // Calculate consensus
      const consensus = calculateConsensus(results);

      res.json({
        consensus,
        results,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}

/**
 * Handle POST /api/design - Design generation
 * @param {Object} router - Router instance
 * @returns {Function} Express handler
 */
export function handleDesign(router) {
  return async (req, res) => {
    try {
      const { prompt, options = {} } = req.body;

      const results = await router.run('design', prompt, options);

      // Return first successful result
      const successful = results.find((r) => r.success);

      res.json({
        result: successful?.result || null,
        provider: successful?.provider,
        error: successful ? null : 'No successful design generated',
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}

/**
 * Handle GET /api/health - Provider health
 * @param {Object} router - Router instance
 * @returns {Function} Express handler
 */
export function handleHealth(router) {
  return async (req, res) => {
    try {
      const status = router.getStatus();

      // Check if at least one provider is available
      const hasAvailable = Object.values(status.providers || {}).some(
        (p) => p.detected || p.type === 'api'
      );

      res.json({
        healthy: hasAvailable,
        providers: status.providers,
        devserver: status.devserver,
      });
    } catch (err) {
      res.status(500).json({ error: err.message, healthy: false });
    }
  };
}

/**
 * Authentication middleware
 * @param {string} secret - Expected secret
 * @returns {Function} Express middleware
 */
export function validateAuth(secret) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.replace('Bearer ', '');

    if (token !== secret) {
      return res.status(401).json({ error: 'Invalid authorization token' });
    }

    next();
  };
}

/**
 * Request body validation middleware
 * @param {string[]} requiredFields - Required field names
 * @returns {Function} Express middleware
 */
export function validateRequestBody(requiredFields) {
  return (req, res, next) => {
    const body = req.body || {};
    const missing = requiredFields.filter((field) => !body[field]);

    if (missing.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missing.join(', ')}`,
      });
    }

    next();
  };
}

/**
 * Calculate consensus from multiple provider results
 * @param {Object[]} results - Provider results
 * @returns {Object} Consensus result
 */
function calculateConsensus(results) {
  const successful = results.filter((r) => r.success);

  if (successful.length === 0) {
    return { approved: false, reason: 'No successful reviews' };
  }

  // Count approvals
  const approvals = successful.filter((r) => r.result?.approved).length;
  const total = successful.length;

  // Majority vote
  const approved = approvals > total / 2;

  // Average score if available
  const scores = successful
    .map((r) => r.result?.score)
    .filter((s) => typeof s === 'number');

  const averageScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

  return {
    approved,
    votes: { approve: approvals, reject: total - approvals },
    averageScore,
    providers: successful.map((r) => r.provider),
  };
}
