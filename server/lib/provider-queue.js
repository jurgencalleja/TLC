/**
 * Provider Queue - Queue concurrent provider tasks
 *
 * Features:
 * - Configurable max concurrent executions
 * - FIFO ordering with priority support
 * - Task timeout handling
 * - Queue status reporting
 */

/**
 * Priority levels
 */
export const PRIORITY = {
  URGENT: 10,
  NORMAL: 5,
  LOW: 1,
};

/**
 * Create a new task queue
 * @param {Object} [options] - Queue options
 * @param {number} [options.maxConcurrent=3] - Maximum concurrent tasks
 * @param {number} [options.timeout=120000] - Task timeout in ms
 * @returns {Object} Queue instance
 */
export function createQueue(options = {}) {
  const maxConcurrent = options.maxConcurrent ?? 3;
  const timeout = options.timeout ?? 120000;

  return {
    maxConcurrent,
    timeout,
    pending: [],
    running: new Set(),
    completed: 0,
    failed: 0,
    _processing: false,
  };
}

/**
 * Process the next tasks in the queue
 * @param {Object} queue - Queue instance
 */
function processQueue(queue) {
  if (queue._processing) return;
  queue._processing = true;

  while (queue.running.size < queue.maxConcurrent && queue.pending.length > 0) {
    // Sort by priority (highest first)
    queue.pending.sort((a, b) => (b.priority || PRIORITY.NORMAL) - (a.priority || PRIORITY.NORMAL));

    const task = queue.pending.shift();
    if (!task) continue;

    queue.running.add(task.id);

    // Execute with timeout
    const timeoutPromise = new Promise((_, reject) => {
      task.timeoutId = setTimeout(() => {
        reject(new Error(`Task ${task.id} timeout after ${queue.timeout}ms`));
      }, queue.timeout);
    });

    Promise.race([task.execute(), timeoutPromise])
      .then((result) => {
        clearTimeout(task.timeoutId);
        queue.running.delete(task.id);
        queue.completed++;
        task.resolve(result);
        processQueue(queue);
      })
      .catch((error) => {
        clearTimeout(task.timeoutId);
        queue.running.delete(task.id);
        queue.failed++;
        task.reject(error);
        processQueue(queue);
      });
  }

  queue._processing = false;
}

/**
 * Add a task to the queue
 * @param {Object} queue - Queue instance
 * @param {Object} task - Task to add
 * @param {string} task.id - Unique task ID
 * @param {Function} task.execute - Async function to execute
 * @param {number} [task.priority] - Task priority (default: PRIORITY.NORMAL)
 * @returns {Promise<any>} Promise that resolves with task result
 */
export function enqueue(queue, task) {
  return new Promise((resolve, reject) => {
    const queuedTask = {
      ...task,
      priority: task.priority ?? PRIORITY.NORMAL,
      resolve,
      reject,
      enqueuedAt: Date.now(),
    };

    queue.pending.push(queuedTask);
    processQueue(queue);
  });
}

/**
 * Get queue status
 * @param {Object} queue - Queue instance
 * @returns {Object} Queue status
 */
export function getStatus(queue) {
  return {
    pending: queue.pending.length,
    running: queue.running.size,
    completed: queue.completed,
    failed: queue.failed,
    maxConcurrent: queue.maxConcurrent,
  };
}

/**
 * Clear all pending tasks from the queue
 * @param {Object} queue - Queue instance
 */
export function clearQueue(queue) {
  // Reject all pending tasks
  for (const task of queue.pending) {
    task.reject(new Error('Queue cleared'));
    if (task.timeoutId) {
      clearTimeout(task.timeoutId);
    }
  }

  queue.pending = [];
}

/**
 * Wait for all tasks to complete
 * @param {Object} queue - Queue instance
 * @returns {Promise<void>} Resolves when queue is drained
 */
export function drainQueue(queue) {
  return new Promise((resolve) => {
    const checkDrained = () => {
      if (queue.pending.length === 0 && queue.running.size === 0) {
        resolve();
      } else {
        setTimeout(checkDrained, 10);
      }
    };

    checkDrained();
  });
}
