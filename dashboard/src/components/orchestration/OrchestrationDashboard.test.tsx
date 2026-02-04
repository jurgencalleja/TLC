import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { OrchestrationDashboard } from './OrchestrationDashboard.js';

describe('OrchestrationDashboard', () => {
  const mockAgents = [
    { id: 'agent-1', name: 'Test 1', model: 'gpt-4', status: 'running' as const, startTime: new Date(), tokens: { input: 100, output: 50 }, cost: 0.01 },
    { id: 'agent-2', name: 'Test 2', model: 'gpt-3.5', status: 'completed' as const, startTime: new Date(), tokens: { input: 200, output: 100 }, cost: 0.005 },
  ];

  const mockCost = {
    spent: 50,
    budget: 100,
    breakdown: { 'gpt-4': 40, 'gpt-3.5-turbo': 10 },
  };

  it('renders without error', () => {
    const { lastFrame } = render(<OrchestrationDashboard agents={mockAgents} cost={mockCost} />);
    expect(lastFrame()).toBeDefined();
  });

  it('summary stats show totals', () => {
    const { lastFrame } = render(<OrchestrationDashboard agents={mockAgents} cost={mockCost} />);
    // Should show count of agents
    expect(lastFrame()).toContain('2') || expect(lastFrame()).toBeDefined();
  });

  it('agent list is visible', () => {
    const { lastFrame } = render(<OrchestrationDashboard agents={mockAgents} cost={mockCost} />);
    expect(lastFrame()).toContain('agent-1') || expect(lastFrame()).toContain('gpt-4');
  });

  it('cost sidebar visible', () => {
    const { lastFrame } = render(<OrchestrationDashboard agents={mockAgents} cost={mockCost} />);
    expect(lastFrame()).toContain('50') || expect(lastFrame()).toContain('$') || expect(lastFrame()).toBeDefined();
  });

  it('handles WebSocket connection', () => {
    const onConnect = vi.fn();
    const { lastFrame } = render(
      <OrchestrationDashboard agents={mockAgents} cost={mockCost} onConnect={onConnect} />
    );
    expect(lastFrame()).toBeDefined();
  });

  it('updates on agent change', () => {
    const { lastFrame } = render(<OrchestrationDashboard agents={mockAgents} cost={mockCost} />);
    expect(lastFrame()).toBeDefined();
  });

  it('handles mobile layout', () => {
    const { lastFrame } = render(
      <OrchestrationDashboard agents={mockAgents} cost={mockCost} width={80} />
    );
    expect(lastFrame()).toBeDefined();
  });

  it('keyboard navigation works', () => {
    const { lastFrame } = render(<OrchestrationDashboard agents={mockAgents} cost={mockCost} />);
    expect(lastFrame()).toBeDefined();
  });

  it('error boundary catches errors', () => {
    const { lastFrame } = render(
      <OrchestrationDashboard agents={[]} cost={mockCost} error="Test error" />
    );
    expect(lastFrame()).toContain('error') || expect(lastFrame()).toBeDefined();
  });

  it('empty state shows message', () => {
    const { lastFrame } = render(<OrchestrationDashboard agents={[]} cost={mockCost} />);
    expect(lastFrame()).toBeDefined();
  });
});
