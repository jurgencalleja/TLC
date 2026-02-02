import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AgentState,
  createAgentState,
  STATES,
  VALID_TRANSITIONS,
} from './agent-state.js';

describe('AgentState', () => {
  let state;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
  });

  describe('createAgentState', () => {
    it('starts in pending state', () => {
      state = createAgentState();

      expect(state.getState()).toBe(STATES.PENDING);
    });

    it('accepts optional agent ID', () => {
      state = createAgentState({ agentId: 'agent-123' });

      expect(state.getAgentId()).toBe('agent-123');
    });

    it('generates ID if not provided', () => {
      state = createAgentState();

      expect(state.getAgentId()).toBeDefined();
      expect(state.getAgentId()).toMatch(/^state-/);
    });
  });

  describe('valid transitions', () => {
    beforeEach(() => {
      state = createAgentState();
    });

    it('transition from pending to running succeeds', () => {
      const result = state.transition(STATES.RUNNING);

      expect(result.success).toBe(true);
      expect(state.getState()).toBe(STATES.RUNNING);
    });

    it('transition from running to completed succeeds', () => {
      state.transition(STATES.RUNNING);

      const result = state.transition(STATES.COMPLETED);

      expect(result.success).toBe(true);
      expect(state.getState()).toBe(STATES.COMPLETED);
    });

    it('transition from running to failed succeeds', () => {
      state.transition(STATES.RUNNING);

      const result = state.transition(STATES.FAILED, { error: 'Task error' });

      expect(result.success).toBe(true);
      expect(state.getState()).toBe(STATES.FAILED);
    });

    it('transition from running to cancelled succeeds', () => {
      state.transition(STATES.RUNNING);

      const result = state.transition(STATES.CANCELLED, { reason: 'User cancelled' });

      expect(result.success).toBe(true);
      expect(state.getState()).toBe(STATES.CANCELLED);
    });

    it('transition from pending to cancelled succeeds', () => {
      const result = state.transition(STATES.CANCELLED, { reason: 'Never started' });

      expect(result.success).toBe(true);
      expect(state.getState()).toBe(STATES.CANCELLED);
    });
  });

  describe('invalid transitions', () => {
    beforeEach(() => {
      state = createAgentState();
    });

    it('transition from pending to completed fails', () => {
      const result = state.transition(STATES.COMPLETED);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid transition');
      expect(state.getState()).toBe(STATES.PENDING);
    });

    it('transition from completed to running fails', () => {
      state.transition(STATES.RUNNING);
      state.transition(STATES.COMPLETED);

      const result = state.transition(STATES.RUNNING);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid transition');
      expect(state.getState()).toBe(STATES.COMPLETED);
    });

    it('transition from failed to running fails', () => {
      state.transition(STATES.RUNNING);
      state.transition(STATES.FAILED);

      const result = state.transition(STATES.RUNNING);

      expect(result.success).toBe(false);
      expect(state.getState()).toBe(STATES.FAILED);
    });

    it('transition from cancelled to running fails', () => {
      state.transition(STATES.CANCELLED);

      const result = state.transition(STATES.RUNNING);

      expect(result.success).toBe(false);
      expect(state.getState()).toBe(STATES.CANCELLED);
    });

    it('transition to unknown state fails', () => {
      const result = state.transition('unknown-state');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown state');
      expect(state.getState()).toBe(STATES.PENDING);
    });
  });

  describe('onTransition callback', () => {
    beforeEach(() => {
      state = createAgentState();
    });

    it('fires on state change', () => {
      const callback = vi.fn();
      state.onTransition(callback);

      state.transition(STATES.RUNNING);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          from: STATES.PENDING,
          to: STATES.RUNNING,
        })
      );
    });

    it('does not fire on failed transition', () => {
      const callback = vi.fn();
      state.onTransition(callback);

      state.transition(STATES.COMPLETED); // Invalid from pending

      expect(callback).not.toHaveBeenCalled();
    });

    it('supports multiple callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      state.onTransition(callback1);
      state.onTransition(callback2);

      state.transition(STATES.RUNNING);

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('returns unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = state.onTransition(callback);

      unsubscribe();
      state.transition(STATES.RUNNING);

      expect(callback).not.toHaveBeenCalled();
    });

    it('passes metadata in callback', () => {
      const callback = vi.fn();
      state.onTransition(callback);

      state.transition(STATES.RUNNING, { taskId: 'task-456' });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { taskId: 'task-456' },
        })
      );
    });
  });

  describe('getHistory', () => {
    beforeEach(() => {
      state = createAgentState();
    });

    it('returns all transitions', () => {
      state.transition(STATES.RUNNING);
      vi.advanceTimersByTime(1000);
      state.transition(STATES.COMPLETED);

      const history = state.getHistory();

      expect(history).toHaveLength(2);
      expect(history[0].from).toBe(STATES.PENDING);
      expect(history[0].to).toBe(STATES.RUNNING);
      expect(history[1].from).toBe(STATES.RUNNING);
      expect(history[1].to).toBe(STATES.COMPLETED);
    });

    it('includes timestamps for each transition', () => {
      const startTime = Date.now();
      state.transition(STATES.RUNNING);
      vi.advanceTimersByTime(5000);
      state.transition(STATES.COMPLETED);

      const history = state.getHistory();

      expect(history[0].timestamp).toBe(startTime);
      expect(history[1].timestamp).toBe(startTime + 5000);
    });

    it('includes metadata in history', () => {
      state.transition(STATES.RUNNING, { taskId: 'task-789' });
      state.transition(STATES.FAILED, { error: 'Something went wrong' });

      const history = state.getHistory();

      expect(history[0].metadata).toEqual({ taskId: 'task-789' });
      expect(history[1].metadata).toEqual({ error: 'Something went wrong' });
    });

    it('returns empty array when no transitions', () => {
      const history = state.getHistory();

      expect(history).toEqual([]);
    });

    it('does not include failed transition attempts', () => {
      state.transition(STATES.COMPLETED); // Invalid - should fail
      state.transition(STATES.RUNNING); // Valid

      const history = state.getHistory();

      expect(history).toHaveLength(1);
      expect(history[0].to).toBe(STATES.RUNNING);
    });
  });

  describe('getElapsedTime', () => {
    beforeEach(() => {
      state = createAgentState();
    });

    it('calculates duration from creation', () => {
      vi.advanceTimersByTime(3000);

      const elapsed = state.getElapsedTime();

      expect(elapsed).toBe(3000);
    });

    it('calculates duration in specific state', () => {
      state.transition(STATES.RUNNING);
      vi.advanceTimersByTime(5000);

      const runningTime = state.getElapsedTime(STATES.RUNNING);

      expect(runningTime).toBe(5000);
    });

    it('returns 0 for state never entered', () => {
      const failedTime = state.getElapsedTime(STATES.FAILED);

      expect(failedTime).toBe(0);
    });

    it('calculates completed state duration', () => {
      state.transition(STATES.RUNNING);
      vi.advanceTimersByTime(2000);
      state.transition(STATES.COMPLETED);
      vi.advanceTimersByTime(1000);

      const runningTime = state.getElapsedTime(STATES.RUNNING);

      expect(runningTime).toBe(2000);
    });

    it('returns total elapsed when no state specified', () => {
      state.transition(STATES.RUNNING);
      vi.advanceTimersByTime(2000);
      state.transition(STATES.COMPLETED);
      vi.advanceTimersByTime(3000);

      const totalTime = state.getElapsedTime();

      expect(totalTime).toBe(5000);
    });
  });

  describe('isTerminal', () => {
    it('returns false for pending', () => {
      state = createAgentState();

      expect(state.isTerminal()).toBe(false);
    });

    it('returns false for running', () => {
      state = createAgentState();
      state.transition(STATES.RUNNING);

      expect(state.isTerminal()).toBe(false);
    });

    it('returns true for completed', () => {
      state = createAgentState();
      state.transition(STATES.RUNNING);
      state.transition(STATES.COMPLETED);

      expect(state.isTerminal()).toBe(true);
    });

    it('returns true for failed', () => {
      state = createAgentState();
      state.transition(STATES.RUNNING);
      state.transition(STATES.FAILED);

      expect(state.isTerminal()).toBe(true);
    });

    it('returns true for cancelled', () => {
      state = createAgentState();
      state.transition(STATES.CANCELLED);

      expect(state.isTerminal()).toBe(true);
    });
  });

  describe('STATES constants', () => {
    it('exports all state values', () => {
      expect(STATES.PENDING).toBe('pending');
      expect(STATES.RUNNING).toBe('running');
      expect(STATES.COMPLETED).toBe('completed');
      expect(STATES.FAILED).toBe('failed');
      expect(STATES.CANCELLED).toBe('cancelled');
    });
  });

  describe('VALID_TRANSITIONS', () => {
    it('exports transition map', () => {
      expect(VALID_TRANSITIONS).toBeDefined();
      expect(VALID_TRANSITIONS[STATES.PENDING]).toContain(STATES.RUNNING);
      expect(VALID_TRANSITIONS[STATES.PENDING]).toContain(STATES.CANCELLED);
      expect(VALID_TRANSITIONS[STATES.RUNNING]).toContain(STATES.COMPLETED);
      expect(VALID_TRANSITIONS[STATES.RUNNING]).toContain(STATES.FAILED);
      expect(VALID_TRANSITIONS[STATES.RUNNING]).toContain(STATES.CANCELLED);
    });

    it('terminal states have no valid transitions', () => {
      expect(VALID_TRANSITIONS[STATES.COMPLETED]).toEqual([]);
      expect(VALID_TRANSITIONS[STATES.FAILED]).toEqual([]);
      expect(VALID_TRANSITIONS[STATES.CANCELLED]).toEqual([]);
    });
  });
});
