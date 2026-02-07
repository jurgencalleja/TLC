import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import { ContainerSecurityPane } from './ContainerSecurityPane.js';
import type {
  DockerfileFinding,
  RuntimeFinding,
  VulnerabilitySummary,
  CisBenchmarkResult,
} from './ContainerSecurityPane.js';

describe('ContainerSecurityPane', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockDockerfileFindings: DockerfileFinding[] = [
    {
      rule: 'no-root-user',
      severity: 'high',
      line: 1,
      message: 'No USER directive found',
      fix: 'Add USER directive',
    },
    {
      rule: 'latest-tag',
      severity: 'medium',
      message: 'Using latest tag',
      fix: 'Pin to specific version',
    },
  ];

  const mockRuntimeFindings: RuntimeFinding[] = [
    {
      rule: 'privileged',
      severity: 'critical',
      service: 'web',
      message: 'Running in privileged mode',
      fix: 'Remove privileged: true',
    },
  ];

  const mockVulnerabilities: VulnerabilitySummary = {
    critical: 0,
    high: 2,
    medium: 5,
    low: 10,
    total: 17,
  };

  const mockCisBenchmark: CisBenchmarkResult = {
    level1Score: 85,
    passed: true,
    findings: [
      { cis: '4.1', severity: 'high', message: 'No non-root USER directive found.' },
    ],
  };

  const defaultProps = {
    dockerfileLintScore: 80,
    dockerfileFindings: mockDockerfileFindings,
    runtimeScore: 70,
    runtimeFindings: mockRuntimeFindings,
    networkScore: 90,
    vulnerabilities: mockVulnerabilities,
    cisBenchmark: mockCisBenchmark,
    secretsScore: 85,
  };

  it('renders container security header', () => {
    const { lastFrame } = render(<ContainerSecurityPane {...defaultProps} />);
    expect(lastFrame()).toContain('Container Security');
  });

  it('shows overall score', () => {
    const { lastFrame } = render(<ContainerSecurityPane {...defaultProps} />);
    // (80 + 70 + 90 + 85) / 4 = 81.25 => 81
    expect(lastFrame()).toContain('81%');
  });

  it('shows score bars for each category', () => {
    const { lastFrame } = render(<ContainerSecurityPane {...defaultProps} />);
    expect(lastFrame()).toContain('Dockerfile Lint');
    expect(lastFrame()).toContain('Runtime Security');
    expect(lastFrame()).toContain('Network Policy');
    expect(lastFrame()).toContain('Secrets Management');
  });

  it('shows CIS benchmark result', () => {
    const { lastFrame } = render(<ContainerSecurityPane {...defaultProps} />);
    expect(lastFrame()).toContain('CIS Docker Benchmark Level 1');
    expect(lastFrame()).toContain('85%');
    expect(lastFrame()).toContain('PASSED');
  });

  it('shows CIS benchmark failure', () => {
    const failedBenchmark: CisBenchmarkResult = {
      level1Score: 45,
      passed: false,
      findings: [],
    };
    const { lastFrame } = render(
      <ContainerSecurityPane {...defaultProps} cisBenchmark={failedBenchmark} />
    );
    expect(lastFrame()).toContain('45%');
    expect(lastFrame()).toContain('FAILED');
  });

  it('shows vulnerability summary', () => {
    const { lastFrame } = render(<ContainerSecurityPane {...defaultProps} />);
    expect(lastFrame()).toContain('Image Vulnerabilities');
    expect(lastFrame()).toContain('Critical: 0');
    expect(lastFrame()).toContain('High: 2');
    expect(lastFrame()).toContain('Medium: 5');
    expect(lastFrame()).toContain('Low: 10');
  });

  it('shows dockerfile findings', () => {
    const { lastFrame } = render(<ContainerSecurityPane {...defaultProps} />);
    expect(lastFrame()).toContain('Dockerfile Findings (2)');
    expect(lastFrame()).toContain('No USER directive found');
    expect(lastFrame()).toContain('[HIGH]');
  });

  it('shows runtime findings', () => {
    const { lastFrame } = render(<ContainerSecurityPane {...defaultProps} />);
    expect(lastFrame()).toContain('Runtime Findings (1)');
    expect(lastFrame()).toContain('Running in privileged mode');
    expect(lastFrame()).toContain('[CRITICAL]');
  });

  it('shows loading state', () => {
    const { lastFrame } = render(
      <ContainerSecurityPane {...defaultProps} loading={true} />
    );
    expect(lastFrame()).toContain('Scanning containers');
  });

  it('shows error state', () => {
    const { lastFrame } = render(
      <ContainerSecurityPane {...defaultProps} error="Docker not running" />
    );
    expect(lastFrame()).toContain('Docker not running');
  });

  it('shows rescan hint when active', () => {
    const { lastFrame } = render(
      <ContainerSecurityPane {...defaultProps} isActive={true} />
    );
    expect(lastFrame()).toContain('Press [r] to rescan');
  });

  it('hides rescan hint when not active', () => {
    const { lastFrame } = render(
      <ContainerSecurityPane {...defaultProps} isActive={false} />
    );
    expect(lastFrame()).not.toContain('Press [r] to rescan');
  });

  it('truncates findings list beyond 5', () => {
    const manyFindings: DockerfileFinding[] = Array.from({ length: 8 }, (_, i) => ({
      rule: `rule-${i}`,
      severity: 'medium' as const,
      message: `Finding ${i}`,
      fix: `Fix ${i}`,
    }));
    const { lastFrame } = render(
      <ContainerSecurityPane {...defaultProps} dockerfileFindings={manyFindings} />
    );
    expect(lastFrame()).toContain('Dockerfile Findings (8)');
    expect(lastFrame()).toContain('...and 3 more');
  });

  it('handles zero findings gracefully', () => {
    const { lastFrame } = render(
      <ContainerSecurityPane
        {...defaultProps}
        dockerfileFindings={[]}
        runtimeFindings={[]}
      />
    );
    expect(lastFrame()).toContain('Container Security');
    expect(lastFrame()).not.toContain('Dockerfile Findings');
    expect(lastFrame()).not.toContain('Runtime Findings');
  });

  it('calls onRescan when r is pressed', async () => {
    const onRescan = vi.fn();
    const { stdin } = render(
      <ContainerSecurityPane {...defaultProps} isActive={true} onRescan={onRescan} />
    );
    await vi.advanceTimersByTimeAsync(0);
    stdin.write('r');
    await vi.advanceTimersByTimeAsync(0);
    expect(onRescan).toHaveBeenCalledOnce();
  });
});
