import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContainerSecurityPanel, type SecurityFinding, type SecurityAuditResult } from './ContainerSecurityPanel';

const mockAuditResult: SecurityAuditResult = {
  overall: {
    score: 75,
    summary: {
      critical: 1,
      high: 2,
      medium: 3,
      low: 4,
    },
    findings: [
      { severity: 'critical', message: 'Privileged mode enabled', service: 'app', cis: '5.4' },
      { severity: 'high', message: 'Missing cap_drop: ALL', service: 'app', cis: '5.3' },
      { severity: 'high', message: 'No memory limits', service: 'app', cis: '5.10' },
      { severity: 'medium', message: 'No read-only filesystem', service: 'app', cis: '5.12' },
      { severity: 'medium', message: 'No healthcheck', cis: '4.6' },
      { severity: 'medium', message: 'Missing no-new-privileges', service: 'app', cis: '5.25' },
      { severity: 'low', message: 'No PID limit', service: 'app', cis: '5.11' },
      { severity: 'low', message: 'No CPU limits', service: 'app' },
      { severity: 'low', message: 'Using latest tag', rule: 'no-latest-tag' },
      { severity: 'low', message: 'No content trust labels', cis: '4.8' },
    ],
  },
  dockerfile: {
    score: 70,
    findings: [
      { severity: 'medium', message: 'No healthcheck', cis: '4.6' },
      { severity: 'low', message: 'Using latest tag', rule: 'no-latest-tag' },
    ],
  },
  compose: {
    score: 80,
    findings: [
      { severity: 'critical', message: 'Privileged mode enabled', service: 'app', cis: '5.4' },
      { severity: 'high', message: 'Missing cap_drop: ALL', service: 'app', cis: '5.3' },
    ],
  },
};

describe('ContainerSecurityPanel', () => {
  describe('rendering', () => {
    it('renders the panel with title', () => {
      render(<ContainerSecurityPanel auditResult={mockAuditResult} />);
      expect(screen.getByText(/Container Security/i)).toBeInTheDocument();
    });

    it('displays overall security score', () => {
      render(<ContainerSecurityPanel auditResult={mockAuditResult} />);
      expect(screen.getByText('75')).toBeInTheDocument();
    });

    it('shows severity summary counts', () => {
      render(<ContainerSecurityPanel auditResult={mockAuditResult} />);
      // Check that critical and high counts are present in button text
      expect(screen.getByText(/1 Critical/i)).toBeInTheDocument();
      expect(screen.getByText(/2 High/i)).toBeInTheDocument();
    });

    it('displays critical badge for critical issues', () => {
      render(<ContainerSecurityPanel auditResult={mockAuditResult} />);
      const criticalBadges = screen.getAllByText(/critical/i);
      expect(criticalBadges.length).toBeGreaterThan(0);
    });

    it('renders findings list', () => {
      render(<ContainerSecurityPanel auditResult={mockAuditResult} />);
      expect(screen.getByText(/Privileged mode enabled/i)).toBeInTheDocument();
    });
  });

  describe('score indicator', () => {
    it('shows red color for low scores', () => {
      const lowScoreResult = {
        ...mockAuditResult,
        overall: { ...mockAuditResult.overall, score: 30 },
      };
      render(<ContainerSecurityPanel auditResult={lowScoreResult} />);
      const scoreElement = screen.getByTestId('security-score');
      expect(scoreElement).toHaveClass('text-error');
    });

    it('shows yellow color for medium scores', () => {
      const mediumScoreResult = {
        ...mockAuditResult,
        overall: { ...mockAuditResult.overall, score: 60 },
      };
      render(<ContainerSecurityPanel auditResult={mediumScoreResult} />);
      const scoreElement = screen.getByTestId('security-score');
      expect(scoreElement).toHaveClass('text-warning');
    });

    it('shows green color for high scores', () => {
      const highScoreResult = {
        ...mockAuditResult,
        overall: { ...mockAuditResult.overall, score: 90 },
      };
      render(<ContainerSecurityPanel auditResult={highScoreResult} />);
      const scoreElement = screen.getByTestId('security-score');
      expect(scoreElement).toHaveClass('text-success');
    });
  });

  describe('filtering', () => {
    it('filters findings by severity', async () => {
      render(<ContainerSecurityPanel auditResult={mockAuditResult} />);

      // Find the critical filter button in the summary badges section
      const criticalFilter = screen.getByRole('button', { name: /filter by critical severity/i });
      fireEvent.click(criticalFilter);

      await waitFor(() => {
        const visibleFindings = screen.getAllByTestId('finding-item');
        expect(visibleFindings.length).toBeLessThan(10);
      });
    });

    it('filters findings by source', async () => {
      render(<ContainerSecurityPanel auditResult={mockAuditResult} />);

      const dockerfileTab = screen.getByRole('tab', { name: /dockerfile/i });
      fireEvent.click(dockerfileTab);

      await waitFor(() => {
        expect(screen.getByText(/No healthcheck/i)).toBeInTheDocument();
      });
    });
  });

  describe('actions', () => {
    it('calls onRefresh when refresh button clicked', () => {
      const onRefresh = vi.fn();
      render(<ContainerSecurityPanel auditResult={mockAuditResult} onRefresh={onRefresh} />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      expect(onRefresh).toHaveBeenCalled();
    });

    it('calls onFix when fix button clicked', () => {
      const onFix = vi.fn();
      render(<ContainerSecurityPanel auditResult={mockAuditResult} onFix={onFix} />);

      const fixButton = screen.getByRole('button', { name: /fix/i });
      fireEvent.click(fixButton);

      expect(onFix).toHaveBeenCalled();
    });

    it('shows loading state during refresh', () => {
      render(<ContainerSecurityPanel auditResult={mockAuditResult} isLoading />);
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows success message when no findings', () => {
      const cleanResult: SecurityAuditResult = {
        overall: {
          score: 100,
          summary: { critical: 0, high: 0, medium: 0, low: 0 },
          findings: [],
        },
        dockerfile: { score: 100, findings: [] },
        compose: { score: 100, findings: [] },
      };
      render(<ContainerSecurityPanel auditResult={cleanResult} />);
      expect(screen.getByText(/no security issues/i)).toBeInTheDocument();
    });
  });

  describe('CIS benchmark reference', () => {
    it('shows CIS ID for findings with benchmark reference', () => {
      render(<ContainerSecurityPanel auditResult={mockAuditResult} />);
      expect(screen.getByText(/CIS 5.4/i)).toBeInTheDocument();
    });

    it('links to CIS documentation when clicked', () => {
      render(<ContainerSecurityPanel auditResult={mockAuditResult} showCisLinks />);
      const cisLink = screen.getByText(/CIS 5.4/i);
      expect(cisLink.closest('a')).toHaveAttribute('href');
    });
  });

  describe('accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<ContainerSecurityPanel auditResult={mockAuditResult} />);
      expect(screen.getByRole('region', { name: /container security/i })).toBeInTheDocument();
    });

    it('findings list is accessible', () => {
      render(<ContainerSecurityPanel auditResult={mockAuditResult} />);
      expect(screen.getByRole('list', { name: /security findings/i })).toBeInTheDocument();
    });
  });
});
