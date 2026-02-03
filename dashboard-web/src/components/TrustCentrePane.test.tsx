/**
 * TrustCentrePane Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TrustCentrePane } from './TrustCentrePane';

describe('TrustCentrePane', () => {
  const mockComplianceStatus = {
    'pci-dss': { score: 85, gaps: 5, compliant: true },
    'hipaa': { score: 90, gaps: 3, compliant: true },
    'iso27001': { score: 78, gaps: 10, compliant: false },
    'gdpr': { score: 82, gaps: 7, compliant: true }
  };

  it('renders trust centre pane', () => {
    render(<TrustCentrePane />);
    expect(screen.getByText(/Trust Centre/i)).toBeInTheDocument();
  });

  it('displays framework compliance cards', () => {
    render(<TrustCentrePane status={mockComplianceStatus} />);
    expect(screen.getByText(/PCI DSS/i)).toBeInTheDocument();
    expect(screen.getByText(/HIPAA/i)).toBeInTheDocument();
    expect(screen.getByText(/ISO 27001/i)).toBeInTheDocument();
    expect(screen.getByText(/GDPR/i)).toBeInTheDocument();
  });

  it('shows compliance scores', () => {
    render(<TrustCentrePane status={mockComplianceStatus} />);
    expect(screen.getByText(/85%/)).toBeInTheDocument();
    expect(screen.getByText(/90%/)).toBeInTheDocument();
  });

  it('highlights non-compliant frameworks', () => {
    render(<TrustCentrePane status={mockComplianceStatus} />);
    const iso = screen.getByTestId('framework-iso27001');
    expect(iso).toHaveClass('non-compliant');
  });

  it('shows overall compliance score', () => {
    render(<TrustCentrePane status={mockComplianceStatus} />);
    expect(screen.getByText(/Overall/i)).toBeInTheDocument();
    expect(screen.getByTestId('overall-score')).toBeInTheDocument();
  });

  it('displays gap summary', () => {
    render(<TrustCentrePane status={mockComplianceStatus} />);
    expect(screen.getByText(/25 gaps/i)).toBeInTheDocument();
  });

  it('filters by framework', async () => {
    render(<TrustCentrePane status={mockComplianceStatus} />);

    const filter = screen.getByLabelText(/Framework/i);
    fireEvent.change(filter, { target: { value: 'pci-dss' } });

    await waitFor(() => {
      expect(screen.getByText(/PCI DSS/i)).toBeInTheDocument();
      expect(screen.queryByText(/HIPAA/i)).not.toBeInTheDocument();
    });
  });

  it('shows framework details on click', async () => {
    render(<TrustCentrePane status={mockComplianceStatus} />);

    const pciCard = screen.getByText(/PCI DSS/i);
    fireEvent.click(pciCard);

    await waitFor(() => {
      expect(screen.getByText(/Controls/i)).toBeInTheDocument();
      expect(screen.getByText(/Evidence/i)).toBeInTheDocument();
    });
  });

  it('triggers compliance scan', async () => {
    const onScan = vi.fn();
    render(<TrustCentrePane onScan={onScan} />);

    const scanButton = screen.getByRole('button', { name: /Scan/i });
    fireEvent.click(scanButton);

    expect(onScan).toHaveBeenCalled();
  });

  it('exports compliance report', async () => {
    const onExport = vi.fn();
    render(<TrustCentrePane status={mockComplianceStatus} onExport={onExport} />);

    const exportButton = screen.getByRole('button', { name: /Export/i });
    fireEvent.click(exportButton);

    expect(onExport).toHaveBeenCalledWith(expect.objectContaining({
      format: expect.any(String)
    }));
  });

  it('shows control mapping view', async () => {
    render(<TrustCentrePane status={mockComplianceStatus} />);

    const mappingTab = screen.getByRole('tab', { name: /Mapping/i });
    fireEvent.click(mappingTab);

    await waitFor(() => {
      expect(screen.getByText(/Cross-Reference/i)).toBeInTheDocument();
    });
  });

  it('shows evidence linking view', async () => {
    render(<TrustCentrePane status={mockComplianceStatus} />);

    const evidenceTab = screen.getByRole('tab', { name: /Evidence/i });
    fireEvent.click(evidenceTab);

    await waitFor(() => {
      expect(screen.getByText(/Linked Evidence/i)).toBeInTheDocument();
    });
  });

  it('displays compliance trend', () => {
    const trendData = [
      { date: '2024-01', score: 70 },
      { date: '2024-02', score: 75 },
      { date: '2024-03', score: 82 }
    ];
    render(<TrustCentrePane status={mockComplianceStatus} trend={trendData} />);
    expect(screen.getByTestId('compliance-trend')).toBeInTheDocument();
  });

  it('shows gap remediation tasks', async () => {
    const gaps = [
      { framework: 'pci-dss', control: 'req-3.4', description: 'Missing encryption' }
    ];
    render(<TrustCentrePane status={mockComplianceStatus} gaps={gaps} />);

    const gapsTab = screen.getByRole('tab', { name: /Gaps/i });
    fireEvent.click(gapsTab);

    await waitFor(() => {
      expect(screen.getByText(/Missing encryption/i)).toBeInTheDocument();
    });
  });
});
