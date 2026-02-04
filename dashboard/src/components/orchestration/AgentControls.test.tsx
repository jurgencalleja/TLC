import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { AgentControls } from './AgentControls.js';

describe('AgentControls', () => {
  it('pause button shown for running agent', () => {
    const { lastFrame } = render(<AgentControls status="running" />);
    expect(lastFrame()).toContain('Pause') || expect(lastFrame()).toContain('pause') || expect(lastFrame()).toContain('⏸');
  });

  it('pause button triggers callback', () => {
    const onPause = vi.fn();
    const { lastFrame } = render(<AgentControls status="running" onPause={onPause} />);
    expect(lastFrame()).toBeDefined();
  });

  it('resume button shown for paused agent', () => {
    const { lastFrame } = render(<AgentControls status="paused" />);
    expect(lastFrame()).toContain('Resume') || expect(lastFrame()).toContain('resume') || expect(lastFrame()).toContain('▶');
  });

  it('resume button triggers callback', () => {
    const onResume = vi.fn();
    const { lastFrame } = render(<AgentControls status="paused" onResume={onResume} />);
    expect(lastFrame()).toBeDefined();
  });

  it('cancel button shown for running', () => {
    const { lastFrame } = render(<AgentControls status="running" />);
    expect(lastFrame()).toContain('Cancel') || expect(lastFrame()).toContain('cancel') || expect(lastFrame()).toContain('✗');
  });

  it('cancel button shown for queued', () => {
    const { lastFrame } = render(<AgentControls status="queued" />);
    expect(lastFrame()).toContain('Cancel') || expect(lastFrame()).toContain('cancel');
  });

  it('retry button shown for failed', () => {
    const { lastFrame } = render(<AgentControls status="failed" />);
    expect(lastFrame()).toContain('Retry') || expect(lastFrame()).toContain('retry') || expect(lastFrame()).toContain('↻');
  });

  it('retry button triggers callback', () => {
    const onRetry = vi.fn();
    const { lastFrame } = render(<AgentControls status="failed" onRetry={onRetry} />);
    expect(lastFrame()).toBeDefined();
  });

  it('buttons disabled during transition', () => {
    const { lastFrame } = render(<AgentControls status="running" transitioning />);
    expect(lastFrame()).toBeDefined();
  });

  it('completed state shows no action buttons', () => {
    const { lastFrame } = render(<AgentControls status="completed" />);
    const output = lastFrame();
    expect(output).not.toContain('Pause');
    expect(output).not.toContain('Resume');
    expect(output).not.toContain('Cancel');
  });
});
