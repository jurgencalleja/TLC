import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createQueue,
  enqueue,
  getStatus,
  clearQueue,
  drainQueue,
  PRIORITY,
} from './provider-queue.js';

describe('provider-queue', () => {
  let queue;

  beforeEach(() => {
    queue = createQueue({ maxConcurrent: 3 });
  });

  afterEach(() => {
    if (queue) {
      clearQueue(queue);
    }
  });

  describe('createQueue', () => {
    it('creates queue with default maxConcurrent', () => {
      const q = createQueue();
      expect(q.maxConcurrent).toBe(3);
    });

    it('creates queue with custom maxConcurrent', () => {
      const q = createQueue({ maxConcurrent: 5 });
      expect(q.maxConcurrent).toBe(5);
    });

    it('creates queue with default timeout', () => {
      const q = createQueue();
      expect(q.timeout).toBe(120000);
    });

    it('creates queue with custom timeout', () => {
      const q = createQueue({ timeout: 60000 });
      expect(q.timeout).toBe(60000);
    });
  });

  describe('enqueue', () => {
    it('adds task to queue', async () => {
      const task = { id: 'task-1', execute: vi.fn().mockResolvedValue('result') };

      const promise = enqueue(queue, task);

      expect(getStatus(queue).pending).toBeGreaterThanOrEqual(0);
      await promise;
    });

    it('returns promise that resolves with result', async () => {
      const task = {
        id: 'task-1',
        execute: vi.fn().mockResolvedValue('my-result'),
      };

      const result = await enqueue(queue, task);

      expect(result).toBe('my-result');
    });

    it('executes task function', async () => {
      const executeFn = vi.fn().mockResolvedValue('done');
      const task = { id: 'task-1', execute: executeFn };

      await enqueue(queue, task);

      expect(executeFn).toHaveBeenCalled();
    });
  });

  describe('dequeue respects maxConcurrent', () => {
    it('limits concurrent executions', async () => {
      const q = createQueue({ maxConcurrent: 2 });
      let concurrentCount = 0;
      let maxConcurrent = 0;

      const createSlowTask = (id) => ({
        id,
        execute: async () => {
          concurrentCount++;
          maxConcurrent = Math.max(maxConcurrent, concurrentCount);
          await new Promise(r => setTimeout(r, 50));
          concurrentCount--;
          return id;
        },
      });

      const promises = [
        enqueue(q, createSlowTask('t1')),
        enqueue(q, createSlowTask('t2')),
        enqueue(q, createSlowTask('t3')),
        enqueue(q, createSlowTask('t4')),
      ];

      await Promise.all(promises);

      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });
  });

  describe('dequeue processes FIFO', () => {
    it('processes tasks in order', async () => {
      const q = createQueue({ maxConcurrent: 1 });
      const order = [];

      const createTask = (id) => ({
        id,
        execute: async () => {
          order.push(id);
          return id;
        },
      });

      await Promise.all([
        enqueue(q, createTask('first')),
        enqueue(q, createTask('second')),
        enqueue(q, createTask('third')),
      ]);

      expect(order).toEqual(['first', 'second', 'third']);
    });
  });

  describe('timeout handling', () => {
    it('cancels slow tasks', async () => {
      const q = createQueue({ maxConcurrent: 1, timeout: 50 });

      const slowTask = {
        id: 'slow',
        execute: () => new Promise(r => setTimeout(r, 200)),
      };

      await expect(enqueue(q, slowTask)).rejects.toThrow(/timeout/i);
    });
  });

  describe('getStatus', () => {
    it('returns queue length', () => {
      const status = getStatus(queue);
      expect(typeof status.pending).toBe('number');
    });

    it('returns running count', () => {
      const status = getStatus(queue);
      expect(typeof status.running).toBe('number');
    });

    it('returns completed count', () => {
      const status = getStatus(queue);
      expect(typeof status.completed).toBe('number');
    });

    it('updates after task completion', async () => {
      const task = { id: 't1', execute: vi.fn().mockResolvedValue('done') };

      await enqueue(queue, task);
      const status = getStatus(queue);

      expect(status.completed).toBeGreaterThanOrEqual(1);
    });
  });

  describe('priority levels', () => {
    it('urgent goes first', async () => {
      const q = createQueue({ maxConcurrent: 1 });
      const order = [];

      // Pause processing
      let resolver;
      const blocker = {
        id: 'blocker',
        execute: () => new Promise(r => { resolver = r; }),
      };
      const blockerPromise = enqueue(q, blocker);

      // Queue tasks with different priorities
      const normalPromise = enqueue(q, {
        id: 'normal',
        priority: PRIORITY.NORMAL,
        execute: async () => { order.push('normal'); return 'normal'; },
      });

      const urgentPromise = enqueue(q, {
        id: 'urgent',
        priority: PRIORITY.URGENT,
        execute: async () => { order.push('urgent'); return 'urgent'; },
      });

      // Release blocker
      resolver('done');
      await blockerPromise;
      await Promise.all([normalPromise, urgentPromise]);

      // Urgent should have been processed before normal
      expect(order[0]).toBe('urgent');
    });

    it('low priority goes last', async () => {
      const q = createQueue({ maxConcurrent: 1 });
      const order = [];

      let resolver;
      const blocker = {
        id: 'blocker',
        execute: () => new Promise(r => { resolver = r; }),
      };
      const blockerPromise = enqueue(q, blocker);

      const lowPromise = enqueue(q, {
        id: 'low',
        priority: PRIORITY.LOW,
        execute: async () => { order.push('low'); return 'low'; },
      });

      const normalPromise = enqueue(q, {
        id: 'normal',
        priority: PRIORITY.NORMAL,
        execute: async () => { order.push('normal'); return 'normal'; },
      });

      resolver('done');
      await blockerPromise;
      await Promise.all([lowPromise, normalPromise]);

      expect(order[order.length - 1]).toBe('low');
    });
  });

  describe('clearQueue', () => {
    it('removes all pending tasks', async () => {
      const q = createQueue({ maxConcurrent: 1 });

      // Block the queue
      let resolver;
      enqueue(q, {
        id: 'blocker',
        execute: () => new Promise(r => { resolver = r; }),
      });

      // Add pending tasks
      const pending1 = enqueue(q, { id: 'p1', execute: vi.fn() });
      const pending2 = enqueue(q, { id: 'p2', execute: vi.fn() });

      clearQueue(q);
      resolver('done');

      // Pending tasks should be rejected
      await expect(pending1).rejects.toThrow(/cleared/i);
      await expect(pending2).rejects.toThrow(/cleared/i);
    });
  });

  describe('drainQueue', () => {
    it('waits for all tasks to complete', async () => {
      const q = createQueue({ maxConcurrent: 2 });
      const completed = [];

      enqueue(q, {
        id: 't1',
        execute: async () => {
          await new Promise(r => setTimeout(r, 30));
          completed.push('t1');
        },
      });

      enqueue(q, {
        id: 't2',
        execute: async () => {
          await new Promise(r => setTimeout(r, 20));
          completed.push('t2');
        },
      });

      await drainQueue(q);

      expect(completed).toContain('t1');
      expect(completed).toContain('t2');
    });

    it('resolves immediately if queue is empty', async () => {
      const q = createQueue();

      const start = Date.now();
      await drainQueue(q);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
    });
  });

  describe('PRIORITY constants', () => {
    it('exports URGENT', () => {
      expect(PRIORITY.URGENT).toBeDefined();
    });

    it('exports NORMAL', () => {
      expect(PRIORITY.NORMAL).toBeDefined();
    });

    it('exports LOW', () => {
      expect(PRIORITY.LOW).toBeDefined();
    });

    it('URGENT > NORMAL > LOW', () => {
      expect(PRIORITY.URGENT).toBeGreaterThan(PRIORITY.NORMAL);
      expect(PRIORITY.NORMAL).toBeGreaterThan(PRIORITY.LOW);
    });
  });
});
