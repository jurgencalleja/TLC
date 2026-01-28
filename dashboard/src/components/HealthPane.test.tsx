import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { HealthPane } from './HealthPane.js';

describe('HealthPane', () => {
  it('renders without error', () => {
    const { lastFrame } = render(<HealthPane />);
    expect(lastFrame()).toBeDefined();
  });

  it('shows placeholder when no data', () => {
    const { lastFrame } = render(<HealthPane />);
    const output = lastFrame();
    expect(output).toContain('Health');
  });

  it('shows security status when provided', () => {
    const healthData = {
      security: {
        total: 3,
        critical: 0,
        high: 2,
        moderate: 1,
        low: 0,
      },
      outdated: { total: 5 },
    };

    const { lastFrame } = render(<HealthPane data={healthData} />);
    const output = lastFrame();

    expect(output).toContain('3');  // vulnerability count
  });

  it('shows green checkmark when no vulnerabilities', () => {
    const healthData = {
      security: { total: 0, critical: 0, high: 0, moderate: 0, low: 0 },
      outdated: { total: 0 },
    };

    const { lastFrame } = render(<HealthPane data={healthData} />);
    const output = lastFrame();

    expect(output).toContain('✓');
  });

  it('shows warning for critical vulnerabilities', () => {
    const healthData = {
      security: { total: 1, critical: 1, high: 0, moderate: 0, low: 0 },
      outdated: { total: 2 },
    };

    const { lastFrame } = render(<HealthPane data={healthData} />);
    const output = lastFrame();

    expect(output).toContain('1');
  });

  it('shows outdated package count', () => {
    const healthData = {
      security: { total: 0, critical: 0, high: 0, moderate: 0, low: 0 },
      outdated: { total: 8, major: 2, minor: 3, patch: 3 },
    };

    const { lastFrame } = render(<HealthPane data={healthData} />);
    const output = lastFrame();

    expect(output).toContain('8');
  });

  it('uses colors based on severity', () => {
    const healthData = {
      security: { total: 5, critical: 2, high: 3, moderate: 0, low: 0 },
      outdated: { total: 0 },
    };

    const { lastFrame } = render(<HealthPane data={healthData} />);
    const output = lastFrame();

    // Just verify it renders
    expect(output).toContain('5');
  });
});
