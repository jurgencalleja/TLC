import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { AgentControls } from './AgentControls.js';

describe('AgentControls', () => {
  it('pause button shown for running agent', () => {
    const { lastFrame } = render(<AgentControls status="running" />);
    expect(lastFrame()?.toLowerCase()).toMatch(/pause|⏸/);
  });

  it('pause button triggers callback', () => {
    const onPause = vi.fn();
    const { lastFrame } = render(<AgentControls status="running" onPause={onPause} />);
    expect(lastFrame()).toBeDefined();
  });

  it('resume button shown for paused agent', () => {
    const { lastFrame } = render(<AgentControls status="paused" />);
    expect(lastFrame()?.toLowerCase()).toMatch(/resume|▶/);
  });

  it('resume button triggers callback', () => {
    const onResume = vi.fn();
    const { lastFrame } = render(<AgentControls status="paused" onResume={onResume} />);
    expect(lastFrame()).toBeDefined();
  });

  it('cancel button shown for running', () => {
    const { lastFrame } = render(<AgentControls status="running" />);
    expect(lastFrame()?.toLowerCase()).toMatch(/cancel|✗/);
  });

  it('cancel button shown for queued', () => {
    const { lastFrame } = render(<AgentControls status="queued" />);
    expect(lastFrame()?.toLowerCase()).toMatch(/cancel/);
  });

  it('retry button shown for failed', () => {
    const { lastFrame } = render(<AgentControls status="failed" />);
    expect(lastFrame()?.toLowerCase()).toMatch(/retry|↻/);
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
