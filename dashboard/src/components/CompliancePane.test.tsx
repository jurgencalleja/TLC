import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import { CompliancePane } from './CompliancePane.js';
import type { CategoryScore, Gap, EvidenceItem, TimelineEvent } from './CompliancePane.js';

describe('CompliancePane', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockCategories: CategoryScore[] = [
    { name: 'Security', score: 92, gapCount: 2 },
    { name: 'Availability', score: 88, gapCount: 3 },
    { name: 'Confidentiality', score: 95, gapCount: 1 },
    { name: 'Processing Integrity', score: 78, gapCount: 5 },
    { name: 'Privacy', score: 85, gapCount: 4 },
  ];

  const mockEvidence: EvidenceItem[] = [
    {
      id: 'ev-1',
      name: 'Access Control Policy',
      collectedAt: '2024-01-15T10:30:00.000Z',
      status: 'valid',
    },
    {
      id: 'ev-2',
      name: 'Encryption Audit',
      collectedAt: '2024-01-14T14:00:00.000Z',
      status: 'valid',
    },
    {
      id: 'ev-3',
      name: 'Network Security Scan',
      collectedAt: '2024-01-13T09:00:00.000Z',
      status: 'expired',
    },
  ];

  const mockGaps: Gap[] = [
    { id: 'gap-1', name: 'Missing encryption at rest', severity: 'high', status: 'open' },
    { id: 'gap-2', name: 'Incomplete backup policy', severity: 'medium', status: 'in-progress' },
    { id: 'gap-3', name: 'Outdated password policy', severity: 'low', status: 'open' },
  ];

  const mockTimeline: TimelineEvent[] = [
    { id: 'tl-1', date: '2024-03-15', event: 'SOC 2 Type II Audit', status: 'upcoming' },
    { id: 'tl-2', date: '2024-01-10', event: 'Internal Review', status: 'completed' },
    { id: 'tl-3', date: '2023-09-20', event: 'SOC 2 Type I Certification', status: 'completed' },
  ];

  describe('renders compliance score correctly', () => {
    it('renders compliance score correctly', () => {
      const { lastFrame } = render(
        <CompliancePane
          score={87}
          riskLevel="low"
          categories={[]}
          evidence={[]}
          gaps={[]}
        />
      );
      const output = lastFrame();

      expect(output).toContain('Compliance');
      expect(output).toContain('87');
    });

    it('shows score with progress bar', () => {
      const { lastFrame } = render(
        <CompliancePane
          score={75}
          riskLevel="medium"
          categories={[]}
          evidence={[]}
          gaps={[]}
        />
      );
      const output = lastFrame();

      // Should have some kind of visual indicator
      expect(output).toContain('75');
    });
  });

  describe('renders category breakdown chart', () => {
    it('renders category breakdown chart', () => {
      const { lastFrame } = render(
        <CompliancePane
          score={87}
          riskLevel="low"
          categories={mockCategories}
          evidence={[]}
          gaps={[]}
        />
      );
      const output = lastFrame();

      expect(output).toContain('Security');
      expect(output).toContain('92');
      expect(output).toContain('Availability');
      expect(output).toContain('88');
      expect(output).toContain('Privacy');
      expect(output).toContain('85');
    });

    it('shows gap counts per category', () => {
      const { lastFrame } = render(
        <CompliancePane
          score={87}
          riskLevel="low"
          categories={mockCategories}
          evidence={[]}
          gaps={[]}
        />
      );
      const output = lastFrame();

      // Categories should show their gap counts
      expect(output).toMatch(/Security.*2|2.*Security/);
    });
  });

  describe('renders evidence collection list', () => {
    it('renders evidence collection list', () => {
      const { lastFrame } = render(
        <CompliancePane
          score={87}
          riskLevel="low"
          categories={[]}
          evidence={mockEvidence}
          gaps={[]}
        />
      );
      const output = lastFrame();

      expect(output).toContain('Evidence');
      expect(output).toContain('Access Control Policy');
      expect(output).toContain('Encryption Audit');
    });

    it('shows evidence status', () => {
      const { lastFrame } = render(
        <CompliancePane
          score={87}
          riskLevel="low"
          categories={[]}
          evidence={mockEvidence}
          gaps={[]}
        />
      );
      const output = lastFrame();

      // Should indicate valid vs expired
      expect(output).toMatch(/valid|expired/i);
    });
  });

  describe('renders gap count with severity', () => {
    it('renders gap count with severity', () => {
      const { lastFrame } = render(
        <CompliancePane
          score={87}
          riskLevel="low"
          categories={[]}
          evidence={[]}
          gaps={mockGaps}
        />
      );
      const output = lastFrame();

      expect(output).toContain('Gap');
      expect(output).toContain('Missing encryption at rest');
    });

    it('shows severity indicators', () => {
      const { lastFrame } = render(
        <CompliancePane
          score={87}
          riskLevel="low"
          categories={[]}
          evidence={[]}
          gaps={mockGaps}
        />
      );
      const output = lastFrame();

      expect(output).toMatch(/high|medium|low/i);
    });

    it('shows gap status', () => {
      const { lastFrame } = render(
        <CompliancePane
          score={87}
          riskLevel="low"
          categories={[]}
          evidence={[]}
          gaps={mockGaps}
        />
      );
      const output = lastFrame();

      expect(output).toMatch(/open|in-progress/i);
    });
  });

  describe('download report button works', () => {
    it('download report button shows when handler provided', () => {
      const onDownloadReport = vi.fn();
      const { lastFrame } = render(
        <CompliancePane
          score={87}
          riskLevel="low"
          categories={[]}
          evidence={[]}
          gaps={[]}
          onDownloadReport={onDownloadReport}
          isActive={true}
        />
      );
      const output = lastFrame();

      expect(output).toMatch(/\[d\]|download|report/i);
    });
  });

  describe('shows audit timeline', () => {
    it('shows audit timeline', () => {
      const { lastFrame } = render(
        <CompliancePane
          score={87}
          riskLevel="low"
          categories={[]}
          evidence={[]}
          gaps={[]}
          auditTimeline={mockTimeline}
        />
      );
      const output = lastFrame();

      expect(output).toContain('Timeline');
      expect(output).toContain('SOC 2 Type II Audit');
      expect(output).toContain('Internal Review');
    });

    it('shows timeline event status', () => {
      const { lastFrame } = render(
        <CompliancePane
          score={87}
          riskLevel="low"
          categories={[]}
          evidence={[]}
          gaps={[]}
          auditTimeline={mockTimeline}
        />
      );
      const output = lastFrame();

      expect(output).toMatch(/upcoming|completed/i);
    });
  });

  describe('handles loading state', () => {
    it('handles loading state', () => {
      const { lastFrame } = render(
        <CompliancePane
          score={0}
          riskLevel="low"
          categories={[]}
          evidence={[]}
          gaps={[]}
          loading={true}
        />
      );
      const output = lastFrame();

      expect(output).toMatch(/loading|fetching/i);
    });
  });

  describe('handles error state', () => {
    it('handles error state', () => {
      const { lastFrame } = render(
        <CompliancePane
          score={0}
          riskLevel="low"
          categories={[]}
          evidence={[]}
          gaps={[]}
          error="Failed to fetch compliance data"
        />
      );
      const output = lastFrame();

      expect(output).toMatch(/error|failed/i);
      expect(output).toContain('Failed to fetch compliance data');
    });
  });

  describe('refresh button reloads data', () => {
    it('refresh button shows when handler provided', () => {
      const onRefresh = vi.fn();
      const { lastFrame } = render(
        <CompliancePane
          score={87}
          riskLevel="low"
          categories={[]}
          evidence={[]}
          gaps={[]}
          onRefresh={onRefresh}
          isActive={true}
        />
      );
      const output = lastFrame();

      expect(output).toMatch(/\[r\]|refresh|reload/i);
    });
  });

  describe('shows last report date', () => {
    it('shows last report date', () => {
      const { lastFrame } = render(
        <CompliancePane
          score={87}
          riskLevel="low"
          categories={[]}
          evidence={[]}
          gaps={[]}
          lastReportDate="2024-01-15"
        />
      );
      const output = lastFrame();

      expect(output).toContain('2024-01-15');
    });
  });

  describe('risk level indicator', () => {
    it('shows risk level low', () => {
      const { lastFrame } = render(
        <CompliancePane
          score={90}
          riskLevel="low"
          categories={[]}
          evidence={[]}
          gaps={[]}
        />
      );
      const output = lastFrame();

      expect(output).toMatch(/low/i);
    });

    it('shows risk level high', () => {
      const { lastFrame } = render(
        <CompliancePane
          score={45}
          riskLevel="high"
          categories={[]}
          evidence={[]}
          gaps={[]}
        />
      );
      const output = lastFrame();

      expect(output).toMatch(/high/i);
    });

    it('shows risk level critical', () => {
      const { lastFrame } = render(
        <CompliancePane
          score={25}
          riskLevel="critical"
          categories={[]}
          evidence={[]}
          gaps={[]}
        />
      );
      const output = lastFrame();

      expect(output).toMatch(/critical/i);
    });
  });
});
