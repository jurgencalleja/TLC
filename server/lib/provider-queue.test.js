import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ProviderQueue,
  Priority,
} from './provider-queue.js';

describe('Provider Queue', () => {
  let queue;

  beforeEach(() => {
    queue = new ProviderQueue({ maxConcurrent: 3 });
  });

  describe('enqueue', () => {
    it('adds task to queue', () => {
      const task = { id: '1', prompt: 'test' };
      queue.enqueue(task);
      
      expect(queue.getStatus().pending).toBe(1);
    });

    it('returns task id', () => {
      const taskId = queue.enqueue({ prompt: 'test' });
      expect(taskId).toBeDefined();
    });
  });

  describe('dequeue', () => {
    it('respects maxConcurrent', async () => {
      const tasks = [];
      for (let i = 0; i < 5; i++) {
        tasks.push(queue.enqueue({
          prompt: `test ${i}`,
          execute: () => new Promise(r => setTimeout(r, 100)),
        }));
      }

      // Start processing
      queue.process();

      // Should have max 3 running
      expect(queue.getStatus().running).toBeLessThanOrEqual(3);
    });

    it('processes FIFO', async () => {
      const order = [];
      
      queue.enqueue({
        id: 'first',
        execute: async () => { order.push('first'); },
      });
      queue.enqueue({
        id: 'second',
        execute: async () => { order.push('second'); },
      });
      queue.enqueue({
        id: 'third',
        execute: async () => { order.push('third'); },
      });

      await queue.drainQueue();

      expect(order).toEqual(['first', 'second', 'third']);
    });
  });

  describe('timeout', () => {
    it('cancels slow tasks', async () => {
      const slowQueue = new ProviderQueue({ maxConcurrent: 1, timeout: 50 });
      
      const taskId = slowQueue.enqueue({
        execute: () => new Promise(r => setTimeout(r, 1000)),
      });

      slowQueue.process();
      await new Promise(r => setTimeout(r, 100));

      const status = slowQueue.getTaskStatus(taskId);
      expect(status).toBe('cancelled');
    });
  });

  describe('getStatus', () => {
    it('returns queue length', () => {
      queue.enqueue({ prompt: 'test 1' });
      queue.enqueue({ prompt: 'test 2' });

      const status = queue.getStatus();
      expect(status.pending).toBe(2);
    });

    it('returns running count', async () => {
      queue.enqueue({
        execute: () => new Promise(r => setTimeout(r, 100)),
      });

      queue.process();

      const status = queue.getStatus();
      expect(status.running).toBe(1);
    });
  });

  describe('priority', () => {
    it('urgent goes first', async () => {
      const order = [];

      queue.enqueue({
        priority: Priority.LOW,
        execute: async () => { order.push('low'); },
      });
      queue.enqueue({
        priority: Priority.URGENT,
        execute: async () => { order.push('urgent'); },
      });
      queue.enqueue({
        priority: Priority.NORMAL,
        execute: async () => { order.push('normal'); },
      });

      await queue.drainQueue();

      expect(order[0]).toBe('urgent');
    });

    it('affects ordering', async () => {
      const order = [];

      queue.enqueue({
        priority: Priority.LOW,
        execute: async () => { order.push('low'); },
      });
      queue.enqueue({
        priority: Priority.NORMAL,
        execute: async () => { order.push('normal'); },
      });

      await queue.drainQueue();

      expect(order.indexOf('normal')).toBeLessThan(order.indexOf('low'));
    });
  });

  describe('clearQueue', () => {
    it('removes all pending', () => {
      queue.enqueue({ prompt: 'test 1' });
      queue.enqueue({ prompt: 'test 2' });
      queue.enqueue({ prompt: 'test 3' });

      queue.clearQueue();

      expect(queue.getStatus().pending).toBe(0);
    });
  });

  describe('drainQueue', () => {
    it('waits for completion', async () => {
      let completed = false;

      queue.enqueue({
        execute: async () => {
          await new Promise(r => setTimeout(r, 50));
          completed = true;
        },
      });

      await queue.drainQueue();

      expect(completed).toBe(true);
    });
  });
});

describe('Priority', () => {
  it('exports URGENT constant', () => {
    expect(Priority.URGENT).toBe('urgent');
  });

  it('exports NORMAL constant', () => {
    expect(Priority.NORMAL).toBe('normal');
  });

  it('exports LOW constant', () => {
    expect(Priority.LOW).toBe('low');
  });
});
