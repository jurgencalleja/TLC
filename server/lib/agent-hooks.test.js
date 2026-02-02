import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AgentHooks,
  getAgentHooks,
  resetHooks,
  HOOK_TYPES,
} from './agent-hooks.js';

describe('AgentHooks', () => {
  let hooks;

  beforeEach(() => {
    resetHooks();
    hooks = new AgentHooks();
  });

  describe('registerHook', () => {
    it('adds handler to hook type', () => {
      const handler = vi.fn();

      hooks.registerHook('onStart', handler);

      const handlers = hooks.getHandlers('onStart');
      expect(handlers).toHaveLength(1);
      expect(handlers[0]).toBe(handler);
    });

    it('validates hook type', () => {
      const handler = vi.fn();

      expect(() => hooks.registerHook('invalidHook', handler)).toThrow();
    });

    it('returns unregister function', () => {
      const handler = vi.fn();

      const unregister = hooks.registerHook('onStart', handler);

      expect(typeof unregister).toBe('function');
    });

    it('allows multiple handlers per hook', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      hooks.registerHook('onComplete', handler1);
      hooks.registerHook('onComplete', handler2);
      hooks.registerHook('onComplete', handler3);

      const handlers = hooks.getHandlers('onComplete');
      expect(handlers).toHaveLength(3);
    });
  });

  describe('triggerHook', () => {
    it('calls all handlers for hook type', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      hooks.registerHook('onStart', handler1);
      hooks.registerHook('onStart', handler2);

      await hooks.triggerHook('onStart', {});

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('passes agent context to handlers', async () => {
      const handler = vi.fn();
      const context = {
        agentId: 'agent-123',
        taskId: 'task-456',
        phase: 'build',
      };

      hooks.registerHook('onStart', handler);

      await hooks.triggerHook('onStart', context);

      expect(handler).toHaveBeenCalledWith(context);
    });

    it('awaits async handlers', async () => {
      const order = [];
      const asyncHandler = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        order.push('async');
      });
      const syncHandler = vi.fn(() => {
        order.push('sync');
      });

      hooks.registerHook('onComplete', asyncHandler);
      hooks.registerHook('onComplete', syncHandler);

      await hooks.triggerHook('onComplete', {});

      expect(asyncHandler).toHaveBeenCalled();
      expect(syncHandler).toHaveBeenCalled();
      // Both should complete before triggerHook returns
      expect(order).toContain('async');
      expect(order).toContain('sync');
    });

    it('continues on handler error', async () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Handler failed');
      });
      const successHandler = vi.fn();

      hooks.registerHook('onError', errorHandler);
      hooks.registerHook('onError', successHandler);

      // Should not throw
      await expect(hooks.triggerHook('onError', {})).resolves.not.toThrow();

      // Both should have been called
      expect(errorHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();
    });

    it('returns results from all handlers', async () => {
      const handler1 = vi.fn(() => 'result1');
      const handler2 = vi.fn(() => 'result2');

      hooks.registerHook('onComplete', handler1);
      hooks.registerHook('onComplete', handler2);

      const results = await hooks.triggerHook('onComplete', {});

      expect(results).toHaveLength(2);
      expect(results).toContain('result1');
      expect(results).toContain('result2');
    });

    it('returns empty array for no handlers', async () => {
      const results = await hooks.triggerHook('onStart', {});

      expect(results).toEqual([]);
    });
  });

  describe('removeHook', () => {
    it('removes specific handler', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      hooks.registerHook('onStart', handler1);
      const unregister = hooks.registerHook('onStart', handler2);

      unregister();

      const handlers = hooks.getHandlers('onStart');
      expect(handlers).toHaveLength(1);
      expect(handlers[0]).toBe(handler1);
    });

    it('does not affect other handlers', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      hooks.registerHook('onComplete', handler1);
      const unregister = hooks.registerHook('onComplete', handler2);
      hooks.registerHook('onComplete', handler3);

      unregister();

      await hooks.triggerHook('onComplete', {});

      expect(handler1).toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
      expect(handler3).toHaveBeenCalled();
    });
  });

  describe('clearHooks', () => {
    it('removes all handlers for a hook type', () => {
      hooks.registerHook('onStart', vi.fn());
      hooks.registerHook('onStart', vi.fn());
      hooks.registerHook('onStart', vi.fn());

      hooks.clearHooks('onStart');

      expect(hooks.getHandlers('onStart')).toHaveLength(0);
    });

    it('removes all handlers when no type specified', () => {
      hooks.registerHook('onStart', vi.fn());
      hooks.registerHook('onComplete', vi.fn());
      hooks.registerHook('onError', vi.fn());
      hooks.registerHook('onCancel', vi.fn());

      hooks.clearHooks();

      expect(hooks.getHandlers('onStart')).toHaveLength(0);
      expect(hooks.getHandlers('onComplete')).toHaveLength(0);
      expect(hooks.getHandlers('onError')).toHaveLength(0);
      expect(hooks.getHandlers('onCancel')).toHaveLength(0);
    });
  });

  describe('hooks execute in registration order', () => {
    it('calls handlers in order registered', async () => {
      const order = [];

      hooks.registerHook('onStart', () => order.push(1));
      hooks.registerHook('onStart', () => order.push(2));
      hooks.registerHook('onStart', () => order.push(3));

      await hooks.triggerHook('onStart', {});

      expect(order).toEqual([1, 2, 3]);
    });

    it('maintains order with async handlers', async () => {
      const order = [];

      hooks.registerHook('onComplete', async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        order.push(1);
      });
      hooks.registerHook('onComplete', () => order.push(2));
      hooks.registerHook('onComplete', async () => {
        await new Promise(resolve => setTimeout(resolve, 1));
        order.push(3);
      });

      await hooks.triggerHook('onComplete', {});

      // Each handler completes in sequence
      expect(order).toEqual([1, 2, 3]);
    });
  });

  describe('onStart receives task config', () => {
    it('passes full task config to onStart handlers', async () => {
      const handler = vi.fn();
      const taskConfig = {
        agentId: 'agent-001',
        taskId: 'task-001',
        phase: 'build',
        plan: '01-setup',
        taskNumber: 1,
        taskName: 'Initialize project',
        workingDir: '/project',
        timeout: 30000,
      };

      hooks.registerHook('onStart', handler);

      await hooks.triggerHook('onStart', taskConfig);

      expect(handler).toHaveBeenCalledWith(taskConfig);
      const passedConfig = handler.mock.calls[0][0];
      expect(passedConfig.agentId).toBe('agent-001');
      expect(passedConfig.taskName).toBe('Initialize project');
      expect(passedConfig.timeout).toBe(30000);
    });
  });

  describe('HOOK_TYPES constant', () => {
    it('exports valid hook types', () => {
      expect(HOOK_TYPES).toContain('onStart');
      expect(HOOK_TYPES).toContain('onComplete');
      expect(HOOK_TYPES).toContain('onError');
      expect(HOOK_TYPES).toContain('onCancel');
    });
  });

  describe('singleton pattern', () => {
    it('returns same instance across calls', () => {
      const instance1 = getAgentHooks();
      const instance2 = getAgentHooks();

      expect(instance1).toBe(instance2);
    });

    it('shares state across imports', () => {
      const instance1 = getAgentHooks();
      const handler = vi.fn();
      instance1.registerHook('onStart', handler);

      const instance2 = getAgentHooks();
      const handlers = instance2.getHandlers('onStart');

      expect(handlers).toHaveLength(1);
      expect(handlers[0]).toBe(handler);
    });

    it('resetHooks clears singleton', () => {
      const instance1 = getAgentHooks();
      instance1.registerHook('onStart', vi.fn());

      resetHooks();

      const instance2 = getAgentHooks();
      expect(instance2.getHandlers('onStart')).toHaveLength(0);
    });
  });
});
