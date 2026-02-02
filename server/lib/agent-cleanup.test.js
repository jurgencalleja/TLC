import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  findOrphanedAgents,
  cleanupOrphans,
  scheduleCleanup,
  stopCleanup,
  getCleanupStats,
  DEFAULT_TIMEOUT,
  DEFAULT_INTERVAL,
  resetCleanup,
} from './agent-cleanup.js';
import { getAgentRegistry, resetRegistry } from './agent-registry.js';
import { getAgentHooks, resetHooks } from './agent-hooks.js';
import { STATES } from './agent-state.js';

describe('agent-cleanup', () => {
  let registry;
  let hooks;

  beforeEach(() => {
    vi.useFakeTimers();
    resetRegistry();
    resetHooks();
    resetCleanup();
    registry = getAgentRegistry();
    hooks = getAgentHooks();
  });

  afterEach(() => {
    stopCleanup();
    vi.useRealTimers();
  });

  describe('findOrphanedAgents', () => {
    it('detects stuck agents', () => {
      // Register agent and set it as running with old lastActivity
      const id = registry.registerAgent({
        name: 'stuck-agent',
        model: 'claude-3',
        type: 'worker',
        status: STATES.RUNNING,
        lastActivity: Date.now() - 35 * 60 * 1000, // 35 minutes ago
      });

      const orphans = findOrphanedAgents();

      expect(orphans).toHaveLength(1);
      expect(orphans[0].id).toBe(id);
    });

    it('uses configurable timeout', () => {
      // Register agent running for 10 minutes
      const id = registry.registerAgent({
        name: 'agent',
        model: 'claude-3',
        type: 'worker',
        status: STATES.RUNNING,
        lastActivity: Date.now() - 10 * 60 * 1000, // 10 minutes ago
      });

      // With default 30 minute timeout, should not be orphaned
      expect(findOrphanedAgents()).toHaveLength(0);

      // With 5 minute timeout, should be orphaned
      const orphans = findOrphanedAgents({ timeout: 5 * 60 * 1000 });
      expect(orphans).toHaveLength(1);
      expect(orphans[0].id).toBe(id);
    });

    it('does not flag recently active agents', () => {
      registry.registerAgent({
        name: 'active-agent',
        model: 'claude-3',
        type: 'worker',
        status: STATES.RUNNING,
        lastActivity: Date.now() - 5 * 60 * 1000, // 5 minutes ago - recent
      });

      const orphans = findOrphanedAgents();

      expect(orphans).toHaveLength(0);
    });

    it('only flags running agents', () => {
      // Pending agent with old activity - should not be orphaned
      registry.registerAgent({
        name: 'pending-agent',
        model: 'claude-3',
        type: 'worker',
        status: STATES.PENDING,
        lastActivity: Date.now() - 35 * 60 * 1000,
      });

      // Completed agent with old activity - should not be orphaned
      registry.registerAgent({
        name: 'completed-agent',
        model: 'claude-3',
        type: 'worker',
        status: STATES.COMPLETED,
        lastActivity: Date.now() - 35 * 60 * 1000,
      });

      const orphans = findOrphanedAgents();

      expect(orphans).toHaveLength(0);
    });
  });

  describe('cleanupOrphans', () => {
    it('transitions to cancelled', async () => {
      const id = registry.registerAgent({
        name: 'stuck-agent',
        model: 'claude-3',
        type: 'worker',
        status: STATES.RUNNING,
        lastActivity: Date.now() - 35 * 60 * 1000,
      });

      const result = await cleanupOrphans();

      expect(result.cleaned).toHaveLength(1);
      expect(result.cleaned[0].id).toBe(id);

      const agent = registry.getAgent(id);
      expect(agent.status).toBe(STATES.CANCELLED);
    });

    it('triggers hooks', async () => {
      const onCancelHandler = vi.fn();
      hooks.registerHook('onCancel', onCancelHandler);

      registry.registerAgent({
        name: 'stuck-agent',
        model: 'claude-3',
        type: 'worker',
        status: STATES.RUNNING,
        lastActivity: Date.now() - 35 * 60 * 1000,
      });

      await cleanupOrphans();

      expect(onCancelHandler).toHaveBeenCalled();
      expect(onCancelHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'orphaned',
        })
      );
    });

    it('handles cleanup errors gracefully', async () => {
      // Register an agent that will cause error during hook execution
      registry.registerAgent({
        name: 'error-agent',
        model: 'claude-3',
        type: 'worker',
        status: STATES.RUNNING,
        lastActivity: Date.now() - 35 * 60 * 1000,
      });

      // Register a hook that throws
      hooks.registerHook('onCancel', () => {
        throw new Error('Hook error');
      });

      // Should not throw, should handle gracefully
      const result = await cleanupOrphans();

      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThanOrEqual(0);
    });

    it('respects agent grace period', async () => {
      // Agent with gracePeriod that hasn't expired
      registry.registerAgent({
        name: 'grace-agent',
        model: 'claude-3',
        type: 'worker',
        status: STATES.RUNNING,
        lastActivity: Date.now() - 35 * 60 * 1000,
        gracePeriod: 60 * 60 * 1000, // 1 hour grace period
      });

      // Agent without grace period - should be cleaned
      const id2 = registry.registerAgent({
        name: 'no-grace-agent',
        model: 'claude-3',
        type: 'worker',
        status: STATES.RUNNING,
        lastActivity: Date.now() - 35 * 60 * 1000,
      });

      const result = await cleanupOrphans();

      expect(result.cleaned).toHaveLength(1);
      expect(result.cleaned[0].id).toBe(id2);
    });

    it('logs cleanup actions', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      registry.registerAgent({
        name: 'stuck-agent',
        model: 'claude-3',
        type: 'worker',
        status: STATES.RUNNING,
        lastActivity: Date.now() - 35 * 60 * 1000,
      });

      await cleanupOrphans();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('cleanup')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('scheduleCleanup', () => {
    it('runs periodically', async () => {
      // Set up an orphan
      registry.registerAgent({
        name: 'stuck-agent',
        model: 'claude-3',
        type: 'worker',
        status: STATES.RUNNING,
        lastActivity: Date.now() - 35 * 60 * 1000,
      });

      scheduleCleanup({ interval: 1000 }); // Every 1 second for testing

      // Initially no cleanup yet
      let stats = getCleanupStats();
      expect(stats.totalCleaned).toBe(0);

      // Advance time by 1 second
      await vi.advanceTimersByTimeAsync(1000);

      stats = getCleanupStats();
      expect(stats.totalCleaned).toBe(1);
    });

    it('uses configurable interval', () => {
      const customInterval = 5 * 60 * 1000; // 5 minutes

      scheduleCleanup({ interval: customInterval });

      // Add an orphan after scheduling
      registry.registerAgent({
        name: 'stuck-agent',
        model: 'claude-3',
        type: 'worker',
        status: STATES.RUNNING,
        lastActivity: Date.now() - 35 * 60 * 1000,
      });

      // Advance 1 minute - no cleanup yet
      vi.advanceTimersByTime(60 * 1000);
      expect(getCleanupStats().totalCleaned).toBe(0);

      // Advance to 5 minutes - cleanup should run
      vi.advanceTimersByTime(4 * 60 * 1000);
      expect(getCleanupStats().totalCleaned).toBe(1);
    });
  });

  describe('stopCleanup', () => {
    it('cancels schedule', () => {
      scheduleCleanup({ interval: 1000 });

      registry.registerAgent({
        name: 'stuck-agent',
        model: 'claude-3',
        type: 'worker',
        status: STATES.RUNNING,
        lastActivity: Date.now() - 35 * 60 * 1000,
      });

      stopCleanup();

      // Advance time - cleanup should not run since stopped
      vi.advanceTimersByTime(5000);

      expect(getCleanupStats().totalCleaned).toBe(0);
    });

    it('is safe to call multiple times', () => {
      stopCleanup();
      stopCleanup();
      stopCleanup();

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('getCleanupStats', () => {
    it('returns counts', async () => {
      const id = registry.registerAgent({
        name: 'stuck-agent',
        model: 'claude-3',
        type: 'worker',
        status: STATES.RUNNING,
        lastActivity: Date.now() - 35 * 60 * 1000,
      });

      const statsBefore = getCleanupStats();
      expect(statsBefore.totalCleaned).toBe(0);
      expect(statsBefore.lastCleanupAt).toBeNull();

      await cleanupOrphans();

      const statsAfter = getCleanupStats();
      expect(statsAfter.totalCleaned).toBe(1);
      expect(statsAfter.lastCleanupAt).toBeDefined();
      expect(statsAfter.cleanupRuns).toBe(1);
    });

    it('accumulates across multiple cleanup runs', async () => {
      // First orphan
      registry.registerAgent({
        name: 'stuck-agent-1',
        model: 'claude-3',
        type: 'worker',
        status: STATES.RUNNING,
        lastActivity: Date.now() - 35 * 60 * 1000,
      });

      await cleanupOrphans();

      // Second orphan (new one)
      registry.registerAgent({
        name: 'stuck-agent-2',
        model: 'claude-3',
        type: 'worker',
        status: STATES.RUNNING,
        lastActivity: Date.now() - 35 * 60 * 1000,
      });

      await cleanupOrphans();

      const stats = getCleanupStats();
      expect(stats.totalCleaned).toBe(2);
      expect(stats.cleanupRuns).toBe(2);
    });
  });

  describe('defaults', () => {
    it('DEFAULT_TIMEOUT is 30 minutes', () => {
      expect(DEFAULT_TIMEOUT).toBe(30 * 60 * 1000);
    });

    it('DEFAULT_INTERVAL is 5 minutes', () => {
      expect(DEFAULT_INTERVAL).toBe(5 * 60 * 1000);
    });
  });
});
