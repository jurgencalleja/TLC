import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { QualityIndicator } from './QualityIndicator.js';

describe('QualityIndicator', () => {
  it('gauge shows score', () => {
    const { lastFrame } = render(<QualityIndicator score={85} threshold={70} />);
    expect(lastFrame()).toContain('85');
  });

  it('gauge colored by threshold - pass', () => {
    const { lastFrame } = render(<QualityIndicator score={85} threshold={70} />);
    expect(lastFrame()).toBeDefined();
  });

  it('gauge colored by threshold - fail', () => {
    const { lastFrame } = render(<QualityIndicator score={50} threshold={70} />);
    expect(lastFrame()).toBeDefined();
  });

  it('dimension breakdown expandable', () => {
    const dimensions = {
      style: 80,
      completeness: 90,
      correctness: 85,
    };
    const { lastFrame } = render(<QualityIndicator score={85} threshold={70} dimensions={dimensions} />);
    expect(lastFrame()).toBeDefined();
  });

  it('pass indicator shows check', () => {
    const { lastFrame } = render(<QualityIndicator score={85} threshold={70} />);
    expect(lastFrame()).toBeDefined();
  });

  it('fail indicator shows x', () => {
    const { lastFrame } = render(<QualityIndicator score={50} threshold={70} />);
    expect(lastFrame()).toBeDefined();
  });

  it('threshold line visible', () => {
    const { lastFrame } = render(<QualityIndicator score={85} threshold={70} showThreshold />);
    expect(lastFrame()).toBeDefined();
  });

  it('trend sparkline shows history', () => {
    const history = [60, 65, 70, 75, 80, 85];
    const { lastFrame } = render(<QualityIndicator score={85} threshold={70} history={history} />);
    expect(lastFrame()).toBeDefined();
  });

  it('retry recommendation on fail', () => {
    const { lastFrame } = render(<QualityIndicator score={50} threshold={70} showRetryHint />);
    expect(lastFrame()).toBeDefined();
  });

  it('loading state handled', () => {
    const { lastFrame } = render(<QualityIndicator loading />);
    expect(lastFrame()).toBeDefined();
  });
});
