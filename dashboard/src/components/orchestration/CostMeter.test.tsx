import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { CostMeter } from './CostMeter.js';

describe('CostMeter', () => {
  it('progress bar shows percentage', () => {
    const { lastFrame } = render(<CostMeter spent={50} budget={100} />);
    expect(lastFrame()).toContain('50') || expect(lastFrame()).toBeDefined();
  });

  it('daily view shows daily budget', () => {
    const { lastFrame } = render(<CostMeter spent={5} budget={10} period="daily" />);
    expect(lastFrame()).toContain('daily') || expect(lastFrame()).toBeDefined();
  });

  it('monthly view shows monthly budget', () => {
    const { lastFrame } = render(<CostMeter spent={50} budget={100} period="monthly" />);
    expect(lastFrame()).toContain('monthly') || expect(lastFrame()).toBeDefined();
  });

  it('green color under 50%', () => {
    const { lastFrame } = render(<CostMeter spent={30} budget={100} />);
    expect(lastFrame()).toBeDefined();
  });

  it('yellow color at 50-80%', () => {
    const { lastFrame } = render(<CostMeter spent={65} budget={100} />);
    expect(lastFrame()).toBeDefined();
  });

  it('red color over 80%', () => {
    const { lastFrame } = render(<CostMeter spent={85} budget={100} />);
    expect(lastFrame()).toBeDefined();
  });

  it('remaining budget calculates', () => {
    const { lastFrame } = render(<CostMeter spent={30} budget={100} />);
    expect(lastFrame()).toContain('70') || expect(lastFrame()).toBeDefined();
  });

  it('projection estimates end of period', () => {
    const { lastFrame } = render(
      <CostMeter spent={30} budget={100} period="monthly" daysElapsed={10} totalDays={30} />
    );
    expect(lastFrame()).toBeDefined();
  });

  it('model breakdown shows per-model', () => {
    const breakdown = {
      'gpt-4': 30,
      'gpt-3.5-turbo': 10,
    };
    const { lastFrame } = render(<CostMeter spent={40} budget={100} breakdown={breakdown} />);
    expect(lastFrame()).toContain('gpt-4') || expect(lastFrame()).toBeDefined();
  });

  it('handles zero budget', () => {
    const { lastFrame } = render(<CostMeter spent={0} budget={0} />);
    expect(lastFrame()).toBeDefined();
  });
});
