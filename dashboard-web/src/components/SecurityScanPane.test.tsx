/**
 * SecurityScanPane Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SecurityScanPane } from './SecurityScanPane';

describe('SecurityScanPane', () => {
  const mockFindings = [
    { id: '1', type: 'sast', rule: 'xss', severity: 'high', file: 'app.js', line: 10 },
    { id: '2', type: 'dast', rule: 'sqli', severity: 'critical', url: '/api/users' },
    { id: '3', type: 'deps', package: 'lodash', severity: 'medium', version: '4.17.20' }
  ];

  it('renders security scan pane', () => {
    render(<SecurityScanPane />);
    expect(screen.getByText(/Security Scan/i)).toBeInTheDocument();
  });

  it('displays scan types', () => {
    render(<SecurityScanPane />);
    expect(screen.getByText(/SAST/i)).toBeInTheDocument();
    expect(screen.getByText(/DAST/i)).toBeInTheDocument();
    expect(screen.getByText(/Dependencies/i)).toBeInTheDocument();
    expect(screen.getByText(/Secrets/i)).toBeInTheDocument();
  });

  it('shows findings list', () => {
    render(<SecurityScanPane findings={mockFindings} />);
    expect(screen.getByText(/xss/i)).toBeInTheDocument();
    expect(screen.getByText(/sqli/i)).toBeInTheDocument();
    expect(screen.getByText(/lodash/i)).toBeInTheDocument();
  });

  it('filters findings by severity', async () => {
    render(<SecurityScanPane findings={mockFindings} />);

    const severityFilter = screen.getByLabelText(/Severity/i);
    fireEvent.change(severityFilter, { target: { value: 'critical' } });

    await waitFor(() => {
      expect(screen.queryByText(/xss/i)).not.toBeInTheDocument();
      expect(screen.getByText(/sqli/i)).toBeInTheDocument();
    });
  });

  it('filters findings by type', async () => {
    render(<SecurityScanPane findings={mockFindings} />);

    const typeFilter = screen.getByLabelText(/Type/i);
    fireEvent.change(typeFilter, { target: { value: 'sast' } });

    await waitFor(() => {
      expect(screen.getByText(/xss/i)).toBeInTheDocument();
      expect(screen.queryByText(/sqli/i)).not.toBeInTheDocument();
    });
  });

  it('shows risk score', () => {
    render(<SecurityScanPane findings={mockFindings} riskScore={75} />);
    expect(screen.getByText(/75/)).toBeInTheDocument();
    expect(screen.getByText(/Risk Score/i)).toBeInTheDocument();
  });

  it('triggers scan on button click', async () => {
    const onScan = vi.fn();
    render(<SecurityScanPane onScan={onScan} />);

    const scanButton = screen.getByRole('button', { name: /Run Scan/i });
    fireEvent.click(scanButton);

    expect(onScan).toHaveBeenCalled();
  });

  it('shows scan progress', () => {
    render(<SecurityScanPane scanning={true} scanProgress={50} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText(/50%/)).toBeInTheDocument();
  });

  it('displays severity breakdown', () => {
    render(<SecurityScanPane findings={mockFindings} />);
    expect(screen.getByText(/Critical: 1/i)).toBeInTheDocument();
    expect(screen.getByText(/High: 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Medium: 1/i)).toBeInTheDocument();
  });

  it('shows finding details on click', async () => {
    render(<SecurityScanPane findings={mockFindings} />);

    const finding = screen.getByText(/xss/i);
    fireEvent.click(finding);

    await waitFor(() => {
      expect(screen.getByText(/app.js:10/i)).toBeInTheDocument();
    });
  });

  it('exports findings', async () => {
    const onExport = vi.fn();
    render(<SecurityScanPane findings={mockFindings} onExport={onExport} />);

    const exportButton = screen.getByRole('button', { name: /Export/i });
    fireEvent.click(exportButton);

    expect(onExport).toHaveBeenCalledWith(expect.objectContaining({
      format: expect.any(String)
    }));
  });

  it('shows gate status', () => {
    render(<SecurityScanPane gateStatus={{ passed: false, reason: 'Critical findings' }} />);
    expect(screen.getByText(/Gate: Failed/i)).toBeInTheDocument();
    expect(screen.getByText(/Critical findings/i)).toBeInTheDocument();
  });
});
