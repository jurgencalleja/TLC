/**
 * Health Diagnostics Panel Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { HealthDiagnosticsPanel } from './HealthDiagnosticsPanel';

describe('HealthDiagnosticsPanel', () => {
  const mockHealth = {
    status: 'healthy',
    uptime: 86400,
    memory: { used: 512, total: 1024, percent: 50 },
    cpu: { percent: 25 },
    tests: { passed: 5541, failed: 0, total: 5541 }
  };

  it('renders health status', () => {
    render(<HealthDiagnosticsPanel health={mockHealth} />);
    expect(screen.getByText(/healthy/i)).toBeInTheDocument();
  });

  it('shows memory usage', () => {
    render(<HealthDiagnosticsPanel health={mockHealth} />);
    expect(screen.getByText(/memory/i)).toBeInTheDocument();
    expect(screen.getByText(/50%/)).toBeInTheDocument();
  });

  it('shows CPU usage', () => {
    render(<HealthDiagnosticsPanel health={mockHealth} />);
    expect(screen.getByText(/cpu/i)).toBeInTheDocument();
    expect(screen.getByText(/25%/)).toBeInTheDocument();
  });

  it('shows test pass rate', () => {
    render(<HealthDiagnosticsPanel health={mockHealth} />);
    expect(screen.getByText(/tests/i)).toBeInTheDocument();
    expect(screen.getByText(/5541/)).toBeInTheDocument();
  });

  it('shows uptime', () => {
    render(<HealthDiagnosticsPanel health={mockHealth} />);
    expect(screen.getByText(/uptime/i)).toBeInTheDocument();
    expect(screen.getByText(/1.*day/i)).toBeInTheDocument();
  });

  it('shows degraded status', () => {
    const degraded = { ...mockHealth, status: 'degraded', issues: ['DB slow'] };
    render(<HealthDiagnosticsPanel health={degraded} />);
    expect(screen.getByText(/degraded/i)).toBeInTheDocument();
    expect(screen.getByText(/DB slow/i)).toBeInTheDocument();
  });

  it('shows unhealthy status', () => {
    const unhealthy = { ...mockHealth, status: 'unhealthy' };
    render(<HealthDiagnosticsPanel health={unhealthy} />);
    expect(screen.getByText(/unhealthy/i)).toBeInTheDocument();
  });

  it('shows router provider status', () => {
    const withRouter = {
      ...mockHealth,
      router: {
        providers: [
          { name: 'openai', status: 'active' },
          { name: 'anthropic', status: 'error' }
        ]
      }
    };
    render(<HealthDiagnosticsPanel health={withRouter} />);
    expect(screen.getByText(/openai/i)).toBeInTheDocument();
    expect(screen.getByText(/anthropic/i)).toBeInTheDocument();
  });

  it('updates in real-time', async () => {
    const onRefresh = vi.fn().mockResolvedValue({ ...mockHealth, cpu: { percent: 30 } });
    render(<HealthDiagnosticsPanel health={mockHealth} onRefresh={onRefresh} refreshInterval={100} />);

    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalled();
    }, { timeout: 500 });
  });

  it('shows alerts on issues', () => {
    const withAlerts = {
      ...mockHealth,
      alerts: [
        { severity: 'warning', message: 'High memory usage' }
      ]
    };
    render(<HealthDiagnosticsPanel health={withAlerts} />);
    expect(screen.getByText(/High memory usage/i)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<HealthDiagnosticsPanel loading={true} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(<HealthDiagnosticsPanel error="Failed to fetch" />);
    expect(screen.getByText(/failed/i)).toBeInTheDocument();
  });

  it('renders memory graph', () => {
    render(<HealthDiagnosticsPanel health={mockHealth} showGraphs />);
    expect(screen.getByTestId('memory-graph')).toBeInTheDocument();
  });

  it('renders CPU graph', () => {
    render(<HealthDiagnosticsPanel health={mockHealth} showGraphs />);
    expect(screen.getByTestId('cpu-graph')).toBeInTheDocument();
  });
});
