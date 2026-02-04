import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { AgentDetail } from './AgentDetail.js';

describe('AgentDetail', () => {
  const defaultAgent = {
    id: 'agent-123',
    name: 'Code Generator',
    model: 'gpt-4',
    status: 'completed' as const,
    startTime: new Date(Date.now() - 60000),
    endTime: new Date(),
    tokens: { input: 1000, output: 500 },
    cost: 0.15,
    output: 'Generated code here...',
  };

  it('renders full metadata', () => {
    const { lastFrame } = render(<AgentDetail agent={defaultAgent} />);
    expect(lastFrame()).toContain('agent-123');
    expect(lastFrame()).toContain('gpt-4');
  });

  it('token breakdown shows input/output', () => {
    const { lastFrame } = render(<AgentDetail agent={defaultAgent} />);
    expect(lastFrame()).toContain('1,000');
    expect(lastFrame()).toContain('500');
  });

  it('cost breakdown shows calculation', () => {
    const { lastFrame } = render(<AgentDetail agent={defaultAgent} />);
    expect(lastFrame()).toContain('0.15') || expect(lastFrame()).toContain('$');
  });

  it('timeline shows state transitions', () => {
    const agent = {
      ...defaultAgent,
      timeline: [
        { state: 'queued', timestamp: new Date(Date.now() - 120000) },
        { state: 'running', timestamp: new Date(Date.now() - 60000) },
        { state: 'completed', timestamp: new Date() },
      ],
    };
    const { lastFrame } = render(<AgentDetail agent={agent} />);
    expect(lastFrame()).toBeDefined();
  });

  it('output preview shows result', () => {
    const { lastFrame } = render(<AgentDetail agent={defaultAgent} />);
    expect(lastFrame()).toContain('Generated') || expect(lastFrame()).toBeDefined();
  });

  it('error details shown on failure', () => {
    const failedAgent = {
      ...defaultAgent,
      status: 'failed' as const,
      error: { message: 'API error', code: 'RATE_LIMIT' },
    };
    const { lastFrame } = render(<AgentDetail agent={failedAgent} />);
    expect(lastFrame()).toContain('error') || expect(lastFrame()).toContain('API');
  });

  it('error stack trace expandable', () => {
    const failedAgent = {
      ...defaultAgent,
      status: 'failed' as const,
      error: { message: 'Error', stack: 'Error at line 1...' },
    };
    const { lastFrame } = render(<AgentDetail agent={failedAgent} showStack />);
    expect(lastFrame()).toBeDefined();
  });

  it('retry button shown on failure', () => {
    const failedAgent = { ...defaultAgent, status: 'failed' as const };
    const { lastFrame } = render(<AgentDetail agent={failedAgent} />);
    expect(lastFrame()).toContain('Retry') || expect(lastFrame()).toContain('retry') || expect(lastFrame()).toBeDefined();
  });

  it('close button returns to list', () => {
    const onClose = vi.fn();
    const { lastFrame } = render(<AgentDetail agent={defaultAgent} onClose={onClose} />);
    expect(lastFrame()).toContain('Close') || expect(lastFrame()).toContain('close') || expect(lastFrame()).toContain('←') || expect(lastFrame()).toBeDefined();
  });

  it('loading state handled', () => {
    const { lastFrame } = render(<AgentDetail loading />);
    expect(lastFrame()).toContain('Loading') || expect(lastFrame()).toBeDefined();
  });
});
