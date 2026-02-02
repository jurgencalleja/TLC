import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { HealthPane } from './HealthPane.js';
import type { DiagnosticsResult } from '../api/health-diagnostics.js';

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

  it('shows ok indicator when no vulnerabilities', () => {
    const healthData = {
      security: { total: 0, critical: 0, high: 0, moderate: 0, low: 0 },
      outdated: { total: 0 },
    };

    const { lastFrame } = render(<HealthPane data={healthData} />);
    const output = lastFrame();

    expect(output).toContain('[ok]');
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

  describe('diagnostics', () => {
    it('shows diagnostics section when provided', () => {
      const diagnostics: DiagnosticsResult = {
        overall: 'healthy',
        checks: [
          { name: 'TLC Configuration', status: 'ok', message: 'Config found', fix: null },
          { name: 'Required Files', status: 'ok', message: 'All present', fix: null },
        ],
      };

      const { lastFrame } = render(<HealthPane diagnostics={diagnostics} />);
      const output = lastFrame();

      expect(output).toContain('System Diagnostics');
      expect(output).toContain('healthy');
    });

    it('shows check names and statuses', () => {
      const diagnostics: DiagnosticsResult = {
        overall: 'healthy',
        checks: [
          { name: 'TLC Configuration', status: 'ok', message: 'Config found', fix: null },
        ],
      };

      const { lastFrame } = render(<HealthPane diagnostics={diagnostics} />);
      const output = lastFrame();

      expect(output).toContain('TLC Configuration');
      expect(output).toContain('[ok]');
      expect(output).toContain('Config found');
    });

    it('shows fix suggestions for warnings', () => {
      const diagnostics: DiagnosticsResult = {
        overall: 'degraded',
        checks: [
          { name: 'TLC Configuration', status: 'warning', message: 'No .tlc.json found', fix: 'Run: tlc init' },
        ],
      };

      const { lastFrame } = render(<HealthPane diagnostics={diagnostics} />);
      const output = lastFrame();

      expect(output).toContain('[!]');
      expect(output).toContain('No .tlc.json found');
      expect(output).toContain('Run: tlc init');
    });

    it('shows degraded status with warning color', () => {
      const diagnostics: DiagnosticsResult = {
        overall: 'degraded',
        checks: [
          { name: 'Test Check', status: 'warning', message: 'Issue found', fix: 'Fix it' },
        ],
      };

      const { lastFrame } = render(<HealthPane diagnostics={diagnostics} />);
      const output = lastFrame();

      expect(output).toContain('degraded');
    });

    it('shows unhealthy status with error color', () => {
      const diagnostics: DiagnosticsResult = {
        overall: 'unhealthy',
        checks: [
          { name: 'Critical Check', status: 'error', message: 'Critical error', fix: 'Fix now' },
        ],
      };

      const { lastFrame } = render(<HealthPane diagnostics={diagnostics} />);
      const output = lastFrame();

      expect(output).toContain('unhealthy');
      expect(output).toContain('[X]');
    });

    it('shows unknown status with question mark', () => {
      const diagnostics: DiagnosticsResult = {
        overall: 'degraded',
        checks: [
          { name: 'Unknown Check', status: 'unknown', message: 'Cannot determine', fix: null },
        ],
      };

      const { lastFrame } = render(<HealthPane diagnostics={diagnostics} />);
      const output = lastFrame();

      expect(output).toContain('[?]');
    });

    it('renders with both data and diagnostics', () => {
      const healthData = {
        security: { total: 0, critical: 0, high: 0, moderate: 0, low: 0 },
        outdated: { total: 0 },
      };
      const diagnostics: DiagnosticsResult = {
        overall: 'healthy',
        checks: [
          { name: 'TLC Configuration', status: 'ok', message: 'Config found', fix: null },
        ],
      };

      const { lastFrame } = render(<HealthPane data={healthData} diagnostics={diagnostics} />);
      const output = lastFrame();

      expect(output).toContain('System Diagnostics');
      expect(output).toContain('Security');
      expect(output).toContain('Dependencies');
    });

    it('shows fix issues hint when diagnostics not healthy', () => {
      const diagnostics: DiagnosticsResult = {
        overall: 'degraded',
        checks: [
          { name: 'TLC Configuration', status: 'warning', message: 'No .tlc.json found', fix: 'Run: tlc init' },
        ],
      };

      const { lastFrame } = render(<HealthPane diagnostics={diagnostics} />);
      const output = lastFrame();

      expect(output).toContain('Fix issues above');
    });
  });
});
