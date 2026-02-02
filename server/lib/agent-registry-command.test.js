import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('./agent-registry.js', () => ({
  default: {
    listAgents: vi.fn(),
    getAgent: vi.fn(),
    removeAgent: vi.fn(),
  },
}));

vi.mock('./agent-state.js', () => ({
  transitionTo: vi.fn(),
  STATES: {
    PENDING: 'pending',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
  },
}));

vi.mock('./agent-cleanup.js', () => ({
  cleanupOrphans: vi.fn(),
  getCleanupStats: vi.fn(),
}));

vi.mock('./agent-hooks.js', () => ({
  triggerHook: vi.fn(),
}));

import {
  execute,
  formatAgentList,
  formatAgentDetails,
  parseArgs,
} from './agent-registry-command.js';
import registry from './agent-registry.js';
import { transitionTo, STATES } from './agent-state.js';
import { cleanupOrphans, getCleanupStats } from './agent-cleanup.js';
import { triggerHook } from './agent-hooks.js';

describe('agent-registry-command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('execute list', () => {
    it('shows all agents', async () => {
      const agents = [
        { id: 'agent-1', name: 'test-1', state: { current: 'running' }, metadata: { model: 'claude' } },
        { id: 'agent-2', name: 'test-2', state: { current: 'completed' }, metadata: { model: 'gpt-4' } },
      ];
      registry.listAgents.mockReturnValue(agents);

      const result = await execute(['list']);

      expect(registry.listAgents).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data).toEqual(agents);
    });

    it('filters by status', async () => {
      const agents = [
        { id: 'agent-1', name: 'test-1', state: { current: 'running' }, metadata: { model: 'claude' } },
      ];
      registry.listAgents.mockReturnValue(agents);

      const result = await execute(['list', '--status', 'running']);

      expect(registry.listAgents).toHaveBeenCalledWith({ status: 'running' });
      expect(result.success).toBe(true);
    });

    it('filters by model', async () => {
      const agents = [
        { id: 'agent-1', name: 'test-1', state: { current: 'running' }, metadata: { model: 'claude' } },
      ];
      registry.listAgents.mockReturnValue(agents);

      const result = await execute(['list', '--model', 'claude']);

      expect(registry.listAgents).toHaveBeenCalledWith({ model: 'claude' });
      expect(result.success).toBe(true);
    });

    it('combines filters', async () => {
      registry.listAgents.mockReturnValue([]);

      const result = await execute(['list', '--status', 'running', '--model', 'claude']);

      expect(registry.listAgents).toHaveBeenCalledWith({ status: 'running', model: 'claude' });
      expect(result.success).toBe(true);
    });
  });

  describe('execute get', () => {
    it('shows agent details', async () => {
      const agent = {
        id: 'agent-123',
        name: 'test-agent',
        state: { current: 'running', history: [] },
        metadata: { model: 'claude', tokens: { input: 100, output: 50 } },
        createdAt: new Date().toISOString(),
      };
      registry.getAgent.mockReturnValue(agent);

      const result = await execute(['get', 'agent-123']);

      expect(registry.getAgent).toHaveBeenCalledWith('agent-123');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(agent);
    });

    it('shows error for missing agent', async () => {
      registry.getAgent.mockReturnValue(null);

      const result = await execute(['get', 'unknown-id']);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('requires agent ID', async () => {
      const result = await execute(['get']);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Agent ID required');
    });
  });

  describe('execute cancel', () => {
    it('cancels running agent', async () => {
      const agent = {
        id: 'agent-123',
        name: 'test-agent',
        state: { current: 'running' },
      };
      registry.getAgent.mockReturnValue(agent);
      transitionTo.mockReturnValue({ current: 'cancelled' });

      const result = await execute(['cancel', 'agent-123']);

      expect(registry.getAgent).toHaveBeenCalledWith('agent-123');
      expect(transitionTo).toHaveBeenCalledWith(agent.state, STATES.CANCELLED, expect.any(Object));
      expect(triggerHook).toHaveBeenCalledWith('onCancel', agent);
      expect(result.success).toBe(true);
      expect(result.message).toContain('cancelled');
    });

    it('shows error for missing agent', async () => {
      registry.getAgent.mockReturnValue(null);

      const result = await execute(['cancel', 'unknown-id']);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('shows error for already completed agent', async () => {
      const agent = {
        id: 'agent-123',
        state: { current: 'completed' },
      };
      registry.getAgent.mockReturnValue(agent);

      const result = await execute(['cancel', 'agent-123']);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot cancel');
    });

    it('requires agent ID', async () => {
      const result = await execute(['cancel']);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Agent ID required');
    });
  });

  describe('execute cleanup', () => {
    it('runs cleanup and shows stats', async () => {
      cleanupOrphans.mockResolvedValue({ cleaned: ['agent-1', 'agent-2'], errors: [] });
      getCleanupStats.mockReturnValue({ totalCleaned: 5, cleanupRuns: 3, lastCleanupAt: new Date() });

      const result = await execute(['cleanup']);

      expect(cleanupOrphans).toHaveBeenCalled();
      expect(getCleanupStats).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data.cleaned).toHaveLength(2);
      expect(result.data.stats.totalCleaned).toBe(5);
    });

    it('reports cleanup errors', async () => {
      cleanupOrphans.mockResolvedValue({ cleaned: [], errors: [{ id: 'agent-1', error: 'failed' }] });
      getCleanupStats.mockReturnValue({ totalCleaned: 0, cleanupRuns: 1 });

      const result = await execute(['cleanup']);

      expect(result.success).toBe(true);
      expect(result.data.errors).toHaveLength(1);
    });
  });

  describe('formatAgentList', () => {
    it('creates readable table', () => {
      const agents = [
        { id: 'agent-123', name: 'task-1', state: { current: 'running' }, metadata: { model: 'claude' }, createdAt: '2025-01-01T00:00:00Z' },
        { id: 'agent-456', name: 'task-2', state: { current: 'completed' }, metadata: { model: 'gpt-4' }, createdAt: '2025-01-01T00:01:00Z' },
      ];

      const output = formatAgentList(agents);

      expect(output).toContain('agent-123');
      expect(output).toContain('running');
      expect(output).toContain('claude');
      expect(output).toContain('agent-456');
      expect(output).toContain('completed');
    });

    it('handles empty list', () => {
      const output = formatAgentList([]);

      expect(output).toContain('No agents');
    });

    it('truncates long names', () => {
      const agents = [
        { id: 'agent-123', name: 'this-is-a-very-long-agent-name-that-should-be-truncated', state: { current: 'running' }, metadata: { model: 'claude' } },
      ];

      const output = formatAgentList(agents);

      expect(output.length).toBeLessThan(agents[0].name.length + 200);
    });
  });

  describe('formatAgentDetails', () => {
    it('shows all agent fields', () => {
      const agent = {
        id: 'agent-123',
        name: 'test-agent',
        state: { current: 'running', history: [{ state: 'pending', timestamp: '2025-01-01T00:00:00Z' }] },
        metadata: { model: 'claude', tokens: { input: 100, output: 50 }, cost: 0.0015 },
        createdAt: '2025-01-01T00:00:00Z',
      };

      const output = formatAgentDetails(agent);

      expect(output).toContain('agent-123');
      expect(output).toContain('test-agent');
      expect(output).toContain('running');
      expect(output).toContain('claude');
      expect(output).toContain('100');
      expect(output).toContain('50');
    });

    it('shows state history', () => {
      const agent = {
        id: 'agent-123',
        name: 'test',
        state: {
          current: 'completed',
          history: [
            { state: 'pending', timestamp: '2025-01-01T00:00:00Z' },
            { state: 'running', timestamp: '2025-01-01T00:00:01Z' },
            { state: 'completed', timestamp: '2025-01-01T00:00:10Z' },
          ],
        },
        metadata: { model: 'claude' },
      };

      const output = formatAgentDetails(agent);

      expect(output).toContain('pending');
      expect(output).toContain('running');
      expect(output).toContain('completed');
    });
  });

  describe('parseArgs', () => {
    it('parses command', () => {
      const parsed = parseArgs(['list']);
      expect(parsed.command).toBe('list');
    });

    it('parses command with flags', () => {
      const parsed = parseArgs(['list', '--status', 'running']);
      expect(parsed.command).toBe('list');
      expect(parsed.flags.status).toBe('running');
    });

    it('parses command with positional arg', () => {
      const parsed = parseArgs(['get', 'agent-123']);
      expect(parsed.command).toBe('get');
      expect(parsed.args).toContain('agent-123');
    });

    it('handles multiple flags', () => {
      const parsed = parseArgs(['list', '--status', 'running', '--model', 'claude', '--json']);
      expect(parsed.flags.status).toBe('running');
      expect(parsed.flags.model).toBe('claude');
      expect(parsed.flags.json).toBe(true);
    });

    it('returns help for empty args', () => {
      const parsed = parseArgs([]);
      expect(parsed.command).toBe('help');
    });
  });

  describe('unknown command', () => {
    it('shows error for unknown command', async () => {
      const result = await execute(['unknown']);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown command');
    });
  });

  describe('help command', () => {
    it('shows usage information', async () => {
      const result = await execute(['help']);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Usage');
      expect(result.message).toContain('list');
      expect(result.message).toContain('get');
      expect(result.message).toContain('cancel');
      expect(result.message).toContain('cleanup');
    });
  });
});
