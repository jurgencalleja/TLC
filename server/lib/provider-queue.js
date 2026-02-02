/**
 * Provider Queue - Queue concurrent provider tasks
 * Phase 33, Task 8
 */

export const Priority = {
  URGENT: 'urgent',
  NORMAL: 'normal',
  LOW: 'low',
};

const PRIORITY_ORDER = {
  [Priority.URGENT]: 0,
  [Priority.NORMAL]: 1,
  [Priority.LOW]: 2,
};

let taskIdCounter = 0;

export class ProviderQueue {
  constructor(options = {}) {
    this.maxConcurrent = options.maxConcurrent || 3;
    this.timeout = options.timeout || 30000;
    this.pending = [];
    this.running = new Map();
    this.completed = new Map();
    this.processing = false;
  }

  enqueue(task) {
    const id = task.id || `task-${++taskIdCounter}`;
    const queuedTask = {
      id,
      priority: task.priority || Priority.NORMAL,
      execute: task.execute || (() => Promise.resolve()),
      prompt: task.prompt,
      status: 'pending',
      enqueuedAt: Date.now(),
    };

    this.pending.push(queuedTask);
    this._sortPending();

    if (this.processing) {
      this._processNext();
    }

    return id;
  }

  _sortPending() {
    this.pending.sort((a, b) => {
      const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.enqueuedAt - b.enqueuedAt;
    });
  }

  process() {
    this.processing = true;
    this._processNext();
  }

  async _processNext() {
    while (
      this.processing &&
      this.pending.length > 0 &&
      this.running.size < this.maxConcurrent
    ) {
      const task = this.pending.shift();
      if (!task) break;

      task.status = 'running';
      task.startedAt = Date.now();
      this.running.set(task.id, task);

      this._executeTask(task);
    }
  }

  async _executeTask(task) {
    const timeoutId = setTimeout(() => {
      if (this.running.has(task.id)) {
        task.status = 'cancelled';
        task.error = 'Timeout';
        this.running.delete(task.id);
        this.completed.set(task.id, task);
        this._processNext();
      }
    }, this.timeout);

    try {
      const result = await task.execute();
      clearTimeout(timeoutId);

      if (this.running.has(task.id)) {
        task.status = 'completed';
        task.result = result;
        task.completedAt = Date.now();
        this.running.delete(task.id);
        this.completed.set(task.id, task);
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (this.running.has(task.id)) {
        task.status = 'failed';
        task.error = error.message;
        task.completedAt = Date.now();
        this.running.delete(task.id);
        this.completed.set(task.id, task);
      }
    }

    this._processNext();
  }

  getStatus() {
    return {
      pending: this.pending.length,
      running: this.running.size,
      completed: this.completed.size,
    };
  }

  getTaskStatus(taskId) {
    if (this.running.has(taskId)) {
      return this.running.get(taskId).status;
    }
    if (this.completed.has(taskId)) {
      return this.completed.get(taskId).status;
    }
    const pending = this.pending.find(t => t.id === taskId);
    if (pending) {
      return pending.status;
    }
    return null;
  }

  clearQueue() {
    this.pending = [];
  }

  async drainQueue() {
    this.process();

    return new Promise((resolve) => {
      const check = () => {
        if (this.pending.length === 0 && this.running.size === 0) {
          resolve();
        } else {
          setTimeout(check, 10);
        }
      };
      check();
    });
  }

  stop() {
    this.processing = false;
  }
}

export default { ProviderQueue, Priority };
