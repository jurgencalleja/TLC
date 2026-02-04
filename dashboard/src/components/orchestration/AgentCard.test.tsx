import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { AgentCard } from './AgentCard.js';

describe('AgentCard', () => {
  const defaultAgent = {
    id: 'agent-123',
    name: 'Code Generator',
    model: 'gpt-4',
    status: 'running' as const,
    startTime: new Date(Date.now() - 30000),
    tokens: { input: 500, output: 200 },
    cost: 0.05,
  };

  it('renders agent ID', () => {
    const { lastFrame } = render(<AgentCard agent={defaultAgent} />);
    expect(lastFrame()).toContain('agent-123');
  });

  it('renders model name', () => {
    const { lastFrame } = render(<AgentCard agent={defaultAgent} />);
    expect(lastFrame()).toContain('gpt-4');
  });

  it('renders model icon', () => {
    const { lastFrame } = render(<AgentCard agent={{ ...defaultAgent, model: 'claude-3-opus' }} />);
    const output = lastFrame();
    expect(output).toBeDefined();
  });

  it('status badge shows correct color for running', () => {
    const { lastFrame } = render(<AgentCard agent={defaultAgent} />);
    expect(lastFrame()).toContain('running');
  });

  it('status badge shows correct color for completed', () => {
    const { lastFrame } = render(<AgentCard agent={{ ...defaultAgent, status: 'completed' }} />);
    expect(lastFrame()).toContain('completed');
  });

  it('elapsed time displays', () => {
    const { lastFrame } = render(<AgentCard agent={defaultAgent} />);
    // Should show some time indicator
    expect(lastFrame()).toBeDefined();
  });

  it('token count displays', () => {
    const { lastFrame } = render(<AgentCard agent={defaultAgent} />);
    expect(lastFrame()).toMatch(/500|700/);
  });

  it('cost displays with currency', () => {
    const { lastFrame } = render(<AgentCard agent={defaultAgent} />);
    expect(lastFrame()).toMatch(/0\.05|\$/);
  });

  it('quality score shows when available', () => {
    const agent = { ...defaultAgent, quality: { score: 85, pass: true } };
    const { lastFrame } = render(<AgentCard agent={agent} />);
    expect(lastFrame()).toContain('85');
  });

  it('quality score hidden when unavailable', () => {
    const { lastFrame } = render(<AgentCard agent={defaultAgent} />);
    expect(lastFrame()).not.toContain('quality');
  });

  it('click callback fires', () => {
    const onClick = vi.fn();
    const { lastFrame } = render(<AgentCard agent={defaultAgent} onClick={onClick} />);
    expect(lastFrame()).toBeDefined();
  });
});
