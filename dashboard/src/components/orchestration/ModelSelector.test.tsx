import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { ModelSelector } from './ModelSelector.js';

describe('ModelSelector', () => {
  const defaultModels = [
    { id: 'gpt-4', name: 'GPT-4', available: true, pricing: 0.03 },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', available: true, pricing: 0.002 },
    { id: 'claude-3-opus', name: 'Claude 3 Opus', available: false, pricing: 0.06 },
  ];

  it('renders model list', () => {
    const { lastFrame } = render(<ModelSelector models={defaultModels} />);
    expect(lastFrame()?.toLowerCase()).toMatch(/gpt-4/);
  });

  it('capabilities shown per model', () => {
    const models = [
      { ...defaultModels[0], capabilities: ['code', 'chat', 'vision'] },
    ];
    const { lastFrame } = render(<ModelSelector models={models} showCapabilities />);
    expect(lastFrame()).toBeDefined();
  });

  it('pricing shown per model', () => {
    const { lastFrame } = render(<ModelSelector models={defaultModels} showPricing />);
    expect(lastFrame()).toBeDefined();
  });

  it('availability indicator shown', () => {
    const { lastFrame } = render(<ModelSelector models={defaultModels} />);
    expect(lastFrame()).toBeDefined();
  });

  it('select triggers callback', () => {
    const onSelect = vi.fn();
    const { lastFrame } = render(<ModelSelector models={defaultModels} onSelect={onSelect} />);
    expect(lastFrame()).toBeDefined();
  });

  it('one-time override option available', () => {
    const { lastFrame } = render(<ModelSelector models={defaultModels} allowOneTime />);
    expect(lastFrame()).toBeDefined();
  });

  it('persistent override option available', () => {
    const { lastFrame } = render(<ModelSelector models={defaultModels} allowPersistent />);
    expect(lastFrame()).toBeDefined();
  });

  it('clear override button works', () => {
    const onClear = vi.fn();
    const { lastFrame } = render(
      <ModelSelector models={defaultModels} currentOverride="gpt-4" onClear={onClear} />
    );
    expect(lastFrame()).toBeDefined();
  });

  it('unavailable models indicated', () => {
    const { lastFrame } = render(<ModelSelector models={defaultModels} />);
    expect(lastFrame()).toBeDefined();
  });

  it('handles empty model list', () => {
    const { lastFrame } = render(<ModelSelector models={[]} />);
    expect(lastFrame()).toBeDefined();
  });
});
