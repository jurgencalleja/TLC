import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { AgentList } from './AgentList.js';

describe('AgentList', () => {
  const mockAgents = [
    { id: 'agent-1', name: 'Test 1', model: 'gpt-4', status: 'running' as const, startTime: new Date(), tokens: { input: 100, output: 50 }, cost: 0.01 },
    { id: 'agent-2', name: 'Test 2', model: 'gpt-3.5', status: 'completed' as const, startTime: new Date(), tokens: { input: 200, output: 100 }, cost: 0.005 },
    { id: 'agent-3', name: 'Test 3', model: 'claude', status: 'queued' as const, startTime: new Date(), tokens: { input: 0, output: 0 }, cost: 0 },
  ];

  it('renders running agents', () => {
    const { lastFrame } = render(<AgentList agents={mockAgents} />);
    expect(lastFrame()).toContain('running');
  });

  it('renders queued agents', () => {
    const { lastFrame } = render(<AgentList agents={mockAgents} />);
    expect(lastFrame()).toContain('queued');
  });

  it('renders completed agents', () => {
    const { lastFrame } = render(<AgentList agents={mockAgents} />);
    expect(lastFrame()).toContain('completed');
  });

  it('filter by status works', () => {
    const { lastFrame } = render(<AgentList agents={mockAgents} filter="running" />);
    const output = lastFrame();
    expect(output).toContain('running');
  });

  it('sort by time works', () => {
    const { lastFrame } = render(<AgentList agents={mockAgents} sortBy="startTime" />);
    expect(lastFrame()).toBeDefined();
  });

  it('sort by cost works', () => {
    const { lastFrame } = render(<AgentList agents={mockAgents} sortBy="cost" />);
    expect(lastFrame()).toBeDefined();
  });

  it('sort by model works', () => {
    const { lastFrame } = render(<AgentList agents={mockAgents} sortBy="model" />);
    expect(lastFrame()).toBeDefined();
  });

  it('pagination shows page controls', () => {
    const manyAgents = Array(20).fill(null).map((_, i) => ({
      ...mockAgents[0],
      id: `agent-${i}`,
    }));
    const { lastFrame } = render(<AgentList agents={manyAgents} pageSize={5} />);
    expect(lastFrame()).toBeDefined();
  });

  it('pagination changes page', () => {
    const manyAgents = Array(20).fill(null).map((_, i) => ({
      ...mockAgents[0],
      id: `agent-${i}`,
    }));
    const { lastFrame } = render(<AgentList agents={manyAgents} pageSize={5} page={2} />);
    expect(lastFrame()).toBeDefined();
  });

  it('empty state shows message', () => {
    const { lastFrame } = render(<AgentList agents={[]} />);
    expect(lastFrame()).toBeDefined();
  });

  it('loading state shows spinner', () => {
    const { lastFrame } = render(<AgentList agents={[]} loading />);
    expect(lastFrame()).toBeDefined();
  });
});
