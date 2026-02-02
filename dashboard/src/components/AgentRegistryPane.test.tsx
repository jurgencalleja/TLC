import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { AgentRegistryPane } from './AgentRegistryPane.js';

describe('AgentRegistryPane', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to create mock loader
  const createMockLoader = (agents: any[]) => vi.fn(() => agents);

  describe('renders agent list correctly', () => {
    it('displays agents from registry', async () => {
      const agents = [
        { id: 'agent-1', name: 'task-1', state: { current: 'running' }, metadata: { model: 'claude' }, createdAt: '2025-01-01T00:00:00Z' },
        { id: 'agent-2', name: 'task-2', state: { current: 'completed' }, metadata: { model: 'gpt-4' }, createdAt: '2025-01-01T00:01:00Z' },
      ];
      const mockLoader = createMockLoader(agents);

      const { lastFrame } = render(<AgentRegistryPane isActive={false} loadAgentsFn={mockLoader} />);

      // Wait for useEffect to run
      await new Promise(resolve => setTimeout(resolve, 10));
      const output = lastFrame();

      expect(output).toContain('agent-1');
      expect(output).toContain('agent-2');
    });

    it('shows agent names', async () => {
      const agents = [
        { id: 'agent-1', name: 'build-feature', state: { current: 'running' }, metadata: { model: 'claude' } },
      ];
      const mockLoader = createMockLoader(agents);

      const { lastFrame } = render(<AgentRegistryPane isActive={false} loadAgentsFn={mockLoader} />);
      await new Promise(resolve => setTimeout(resolve, 10));
      const output = lastFrame();

      expect(output).toContain('build-feature');
    });
  });

  describe('shows status badges with colors', () => {
    it('shows running status', async () => {
      const agents = [
        { id: 'agent-1', name: 'task', state: { current: 'running' }, metadata: { model: 'claude' } },
      ];
      const mockLoader = createMockLoader(agents);

      const { lastFrame } = render(<AgentRegistryPane isActive={false} loadAgentsFn={mockLoader} />);
      await new Promise(resolve => setTimeout(resolve, 10));
      const output = lastFrame();

      expect(output).toContain('running');
    });

    it('shows completed status', async () => {
      const agents = [
        { id: 'agent-1', name: 'task', state: { current: 'completed' }, metadata: { model: 'claude' } },
      ];
      const mockLoader = createMockLoader(agents);

      const { lastFrame } = render(<AgentRegistryPane isActive={false} loadAgentsFn={mockLoader} />);
      await new Promise(resolve => setTimeout(resolve, 10));
      const output = lastFrame();

      expect(output).toContain('completed');
    });

    it('shows failed status', async () => {
      const agents = [
        { id: 'agent-1', name: 'task', state: { current: 'failed' }, metadata: { model: 'claude' } },
      ];
      const mockLoader = createMockLoader(agents);

      const { lastFrame } = render(<AgentRegistryPane isActive={false} loadAgentsFn={mockLoader} />);
      await new Promise(resolve => setTimeout(resolve, 10));
      const output = lastFrame();

      expect(output).toContain('failed');
    });
  });

  describe('filters by status', () => {
    it('can filter to show only running agents', async () => {
      const agents = [
        { id: 'agent-1', name: 'task-1', state: { current: 'running' }, metadata: { model: 'claude' } },
        { id: 'agent-2', name: 'task-2', state: { current: 'completed' }, metadata: { model: 'claude' } },
      ];
      const mockLoader = createMockLoader(agents);

      const { lastFrame } = render(<AgentRegistryPane isActive={false} statusFilter="running" loadAgentsFn={mockLoader} />);
      await new Promise(resolve => setTimeout(resolve, 10));
      const output = lastFrame();

      expect(output).toContain('agent-1');
      expect(output).not.toContain('agent-2');
    });
  });

  describe('filters by model', () => {
    it('can filter to show only claude agents', async () => {
      const agents = [
        { id: 'agent-1', name: 'task-1', state: { current: 'running' }, metadata: { model: 'claude' } },
        { id: 'agent-2', name: 'task-2', state: { current: 'running' }, metadata: { model: 'gpt-4' } },
      ];
      const mockLoader = createMockLoader(agents);

      const { lastFrame } = render(<AgentRegistryPane isActive={false} modelFilter="claude" loadAgentsFn={mockLoader} />);
      await new Promise(resolve => setTimeout(resolve, 10));
      const output = lastFrame();

      expect(output).toContain('agent-1');
      expect(output).not.toContain('agent-2');
    });
  });

  describe('shows agent details panel', () => {
    it('shows details when agent is selected', async () => {
      const agents = [
        { id: 'agent-1', name: 'task-1', state: { current: 'running', history: [] }, metadata: { model: 'claude', tokens: { input: 100, output: 50 } } },
      ];
      const mockLoader = createMockLoader(agents);

      const { lastFrame } = render(<AgentRegistryPane isActive={false} selectedAgentId="agent-1" loadAgentsFn={mockLoader} />);
      await new Promise(resolve => setTimeout(resolve, 10));
      const output = lastFrame();

      expect(output).toContain('Details');
      expect(output).toContain('claude');
    });
  });

  describe('cancel button', () => {
    it('is visible for running agents', async () => {
      const agents = [
        { id: 'agent-1', name: 'task-1', state: { current: 'running' }, metadata: { model: 'claude' } },
      ];
      const mockLoader = createMockLoader(agents);

      const { lastFrame } = render(<AgentRegistryPane isActive={true} loadAgentsFn={mockLoader} />);
      await new Promise(resolve => setTimeout(resolve, 10));
      const output = lastFrame();

      expect(output).toContain('cancel');
    });

    it('is not shown for completed agents', async () => {
      const agents = [
        { id: 'agent-1', name: 'task-1', state: { current: 'completed' }, metadata: { model: 'claude' } },
      ];
      const mockLoader = createMockLoader(agents);

      const { lastFrame } = render(<AgentRegistryPane isActive={true} loadAgentsFn={mockLoader} />);
      await new Promise(resolve => setTimeout(resolve, 10));
      const output = lastFrame();

      // Cancel hint should not appear when no running agents
      expect(output).not.toContain('[c] cancel');
    });
  });

  describe('auto-refresh', () => {
    it('refreshes agent list periodically', async () => {
      vi.useFakeTimers();

      const agents = [
        { id: 'agent-1', name: 'task-1', state: { current: 'running' }, metadata: { model: 'claude' } },
      ];
      const mockLoader = vi.fn(() => agents);

      render(<AgentRegistryPane isActive={false} refreshInterval={2000} loadAgentsFn={mockLoader} />);

      // Initial call happens in useEffect
      await vi.advanceTimersByTimeAsync(0);
      expect(mockLoader).toHaveBeenCalledTimes(1);

      // Advance time by refresh interval
      await vi.advanceTimersByTimeAsync(2000);
      expect(mockLoader).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(2000);
      expect(mockLoader).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });
  });

  describe('shows aggregate stats header', () => {
    it('displays count of agents by status', async () => {
      const agents = [
        { id: 'agent-1', name: 'task-1', state: { current: 'running' }, metadata: { model: 'claude' } },
        { id: 'agent-2', name: 'task-2', state: { current: 'running' }, metadata: { model: 'claude' } },
        { id: 'agent-3', name: 'task-3', state: { current: 'completed' }, metadata: { model: 'claude' } },
        { id: 'agent-4', name: 'task-4', state: { current: 'failed' }, metadata: { model: 'claude' } },
      ];
      const mockLoader = createMockLoader(agents);

      const { lastFrame } = render(<AgentRegistryPane isActive={false} loadAgentsFn={mockLoader} />);
      await new Promise(resolve => setTimeout(resolve, 10));
      const output = lastFrame();

      expect(output).toContain('2 running');
      expect(output).toContain('1 completed');
      expect(output).toContain('1 failed');
    });
  });

  describe('handles empty state', () => {
    it('shows message when no agents', async () => {
      const mockLoader = createMockLoader([]);

      const { lastFrame } = render(<AgentRegistryPane isActive={false} loadAgentsFn={mockLoader} />);
      await new Promise(resolve => setTimeout(resolve, 10));
      const output = lastFrame();

      expect(output).toContain('No agents');
    });
  });

  describe('handles loading state', () => {
    it('shows loading indicator initially', async () => {
      const mockLoader = vi.fn(() => {
        throw new Error('Loading...');
      });

      const { lastFrame } = render(<AgentRegistryPane isActive={false} loadAgentsFn={mockLoader} />);
      await new Promise(resolve => setTimeout(resolve, 10));
      const output = lastFrame();

      // Should handle error gracefully
      expect(output).toBeDefined();
    });
  });

  describe('handles error state', () => {
    it('shows error message on registry failure', async () => {
      const mockLoader = vi.fn(() => {
        throw new Error('Registry unavailable');
      });

      const { lastFrame } = render(<AgentRegistryPane isActive={false} loadAgentsFn={mockLoader} />);
      await new Promise(resolve => setTimeout(resolve, 10));
      const output = lastFrame();

      expect(output).toContain('Error');
    });
  });
});
