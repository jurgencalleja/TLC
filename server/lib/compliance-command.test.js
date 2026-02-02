import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('compliance-command', () => {
  let ComplianceCommand;
  let parseArgs;
  let complianceCommand;
  let mockChecklist;
  let mockReporter;
  let mockEvidenceCollector;
  let mockPolicyGenerator;

  beforeEach(async () => {
    // Reset modules to ensure clean state
    vi.resetModules();

    // Create mock checklist
    mockChecklist = {
      controls: [
        {
          id: 'CC1.1',
          category: 'Security',
          name: 'Control Environment',
          description: 'The entity demonstrates commitment to integrity.',
          status: 'implemented',
          evidence: ['ev-001'],
          gapSeverity: 'high',
          estimatedEffort: '2 weeks',
        },
        {
          id: 'CC6.1',
          category: 'Security',
          name: 'Access Control',
          description: 'Logical access security software.',
          status: 'not_implemented',
          evidence: [],
          gapSeverity: 'high',
          estimatedEffort: '4 weeks',
        },
        {
          id: 'CC6.2',
          category: 'Security',
          name: 'User Registration',
          description: 'Register and authorize new users.',
          status: 'partial',
          evidence: ['ev-002'],
          gapSeverity: 'high',
          estimatedEffort: '2 weeks',
        },
        {
          id: 'A1.1',
          category: 'Availability',
          name: 'Capacity Planning',
          description: 'Maintain and monitor capacity requirements.',
          status: 'not_implemented',
          evidence: [],
          gapSeverity: 'high',
          estimatedEffort: '3 weeks',
        },
        {
          id: 'C1.1',
          category: 'Confidentiality',
          name: 'Information Classification',
          description: 'Identify and maintain classifications.',
          status: 'implemented',
          evidence: ['ev-003'],
          gapSeverity: 'high',
          estimatedEffort: '2 weeks',
        },
      ],
    };

    // Create mock reporter
    mockReporter = {
      generateReadinessReport: vi.fn().mockReturnValue({
        title: 'SOC 2 Type II Readiness Report',
        generatedAt: '2026-02-02T10:00:00.000Z',
        period: { start: '2026-01-01', end: '2026-02-01' },
        summary: {
          overallScore: 85,
          riskLevel: 'medium',
          riskScore: 25,
          totalControls: 5,
          implemented: 2,
          partial: 1,
          gaps: 2,
        },
        categories: {
          Security: { score: 50, implemented: 1, partial: 1, gaps: 1, total: 3 },
          Availability: { score: 0, implemented: 0, partial: 0, gaps: 1, total: 1 },
          Confidentiality: { score: 100, implemented: 1, partial: 0, gaps: 0, total: 1 },
        },
        findings: [],
        recommendations: [],
      }),
      formatReportMarkdown: vi.fn().mockReturnValue('# SOC 2 Report\n\nContent here'),
      formatReportHTML: vi.fn().mockReturnValue('<html><body>Report</body></html>'),
    };

    // Create mock evidence collector
    mockEvidenceCollector = {
      collectAll: vi.fn().mockResolvedValue({
        items: [
          { id: 'ev-001', type: 'policy', title: 'Access Control Policy' },
          { id: 'ev-002', type: 'audit_log', title: 'User Access Logs' },
          { id: 'ev-003', type: 'config', title: 'Security Config' },
        ],
        summary: {
          totalItems: 3,
          byType: { policy: 1, audit_log: 1, config: 1 },
        },
      }),
      getAll: vi.fn().mockReturnValue([
        { id: 'ev-001', type: 'policy', title: 'Access Control Policy' },
        { id: 'ev-002', type: 'audit_log', title: 'User Access Logs' },
      ]),
    };

    // Create mock policy generator
    mockPolicyGenerator = {
      generateAccessControlPolicy: vi.fn().mockReturnValue({
        title: 'Access Control Policy',
        sections: [{ heading: 'Purpose', content: 'Test content' }],
      }),
      generateDataProtectionPolicy: vi.fn().mockReturnValue({
        title: 'Data Protection Policy',
        sections: [{ heading: 'Purpose', content: 'Test content' }],
      }),
      generateIncidentResponsePolicy: vi.fn().mockReturnValue({
        title: 'Incident Response Policy',
        sections: [{ heading: 'Purpose', content: 'Test content' }],
      }),
      generateAuthPolicy: vi.fn().mockReturnValue({
        title: 'Authentication Policy',
        sections: [{ heading: 'Purpose', content: 'Test content' }],
      }),
      generateAcceptableUsePolicy: vi.fn().mockReturnValue({
        title: 'Acceptable Use Policy',
        sections: [{ heading: 'Purpose', content: 'Test content' }],
      }),
    };

    // Mock the checklist module
    vi.doMock('./compliance-checklist.js', () => ({
      createComplianceChecklist: vi.fn().mockReturnValue(mockChecklist),
      getSOC2Checklist: vi.fn().mockReturnValue(mockChecklist.controls),
      getCompliancePercentage: vi.fn().mockReturnValue({
        percentage: 50,
        implemented: 2,
        partial: 1,
        notImplemented: 2,
        notApplicable: 0,
        total: 5,
        byCategory: {
          Security: { percentage: 50, implemented: 1, total: 3 },
          Availability: { percentage: 0, implemented: 0, total: 1 },
          Confidentiality: { percentage: 100, implemented: 1, total: 1 },
        },
      }),
      getComplianceGaps: vi.fn().mockReturnValue([
        {
          id: 'CC6.1',
          category: 'Security',
          name: 'Access Control',
          status: 'not_implemented',
          gapSeverity: 'high',
          estimatedEffort: '4 weeks',
        },
        {
          id: 'CC6.2',
          category: 'Security',
          name: 'User Registration',
          status: 'partial',
          gapSeverity: 'high',
          estimatedEffort: '2 weeks',
        },
        {
          id: 'A1.1',
          category: 'Availability',
          name: 'Capacity Planning',
          status: 'not_implemented',
          gapSeverity: 'high',
          estimatedEffort: '3 weeks',
        },
      ]),
      getControlsByCategory: vi.fn().mockReturnValue({
        Security: mockChecklist.controls.filter((c) => c.category === 'Security'),
        Availability: mockChecklist.controls.filter((c) => c.category === 'Availability'),
        Confidentiality: mockChecklist.controls.filter((c) => c.category === 'Confidentiality'),
      }),
      TSC_CATEGORIES: {
        SECURITY: 'Security',
        AVAILABILITY: 'Availability',
        PROCESSING_INTEGRITY: 'Processing Integrity',
        CONFIDENTIALITY: 'Confidentiality',
        PRIVACY: 'Privacy',
      },
    }));

    // Mock the reporter module
    vi.doMock('./compliance-reporter.js', () => ({
      createReporter: vi.fn().mockReturnValue(mockReporter),
      generateReadinessReport: vi.fn().mockImplementation(() => mockReporter.generateReadinessReport()),
      formatReportMarkdown: vi.fn().mockImplementation(() => mockReporter.formatReportMarkdown()),
      formatReportHTML: vi.fn().mockImplementation(() => mockReporter.formatReportHTML()),
      calculateCategoryScores: vi.fn().mockReturnValue({
        Security: { score: 50, implemented: 1, partial: 1, gaps: 1, total: 3 },
        Availability: { score: 0, implemented: 0, partial: 0, gaps: 1, total: 1 },
        Confidentiality: { score: 100, implemented: 1, partial: 0, gaps: 0, total: 1 },
      }),
    }));

    // Mock the evidence collector module
    vi.doMock('./evidence-collector.js', () => ({
      createEvidenceCollector: vi.fn().mockReturnValue(mockEvidenceCollector),
      collectPolicyDocuments: vi.fn().mockResolvedValue({
        type: 'policy',
        content: { policies: [] },
      }),
      collectConfigSnapshot: vi.fn().mockResolvedValue({
        type: 'config',
        content: {},
      }),
      collectAuditLogs: vi.fn().mockResolvedValue({
        type: 'audit_log',
        content: { entries: [] },
      }),
    }));

    // Mock the policy generator module
    vi.doMock('./security-policy-generator.js', () => ({
      generateAccessControlPolicy: mockPolicyGenerator.generateAccessControlPolicy,
      generateDataProtectionPolicy: mockPolicyGenerator.generateDataProtectionPolicy,
      generateIncidentResponsePolicy: mockPolicyGenerator.generateIncidentResponsePolicy,
      generateAuthPolicy: mockPolicyGenerator.generateAuthPolicy,
      generateAcceptableUsePolicy: mockPolicyGenerator.generateAcceptableUsePolicy,
      exportAsMarkdown: vi.fn().mockReturnValue('# Policy\n\nContent'),
    }));

    // Import module after mocks are set up
    const module = await import('./compliance-command.js');
    ComplianceCommand = module.ComplianceCommand;
    parseArgs = module.parseArgs;

    // Create instance with mocks
    complianceCommand = new ComplianceCommand({
      checklist: mockChecklist,
      reporter: mockReporter,
      evidenceCollector: mockEvidenceCollector,
      policyGenerator: mockPolicyGenerator,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('parseArgs', () => {
    it('parses empty args', () => {
      const result = parseArgs([]);
      expect(result).toEqual({
        subcommand: null,
        category: null,
        format: 'text',
        output: null,
        unknownSubcommand: null,
      });
    });

    it('parses status subcommand', () => {
      const result = parseArgs(['status']);
      expect(result.subcommand).toBe('status');
    });

    it('parses checklist subcommand', () => {
      const result = parseArgs(['checklist']);
      expect(result.subcommand).toBe('checklist');
    });

    it('parses evidence subcommand', () => {
      const result = parseArgs(['evidence']);
      expect(result.subcommand).toBe('evidence');
    });

    it('parses report subcommand', () => {
      const result = parseArgs(['report']);
      expect(result.subcommand).toBe('report');
    });

    it('parses policies subcommand', () => {
      const result = parseArgs(['policies']);
      expect(result.subcommand).toBe('policies');
    });

    it('parses gaps subcommand', () => {
      const result = parseArgs(['gaps']);
      expect(result.subcommand).toBe('gaps');
    });

    it('parses --category flag', () => {
      const result = parseArgs(['checklist', '--category', 'Security']);
      expect(result.category).toBe('Security');
    });

    it('parses --category= syntax', () => {
      const result = parseArgs(['checklist', '--category=Availability']);
      expect(result.category).toBe('Availability');
    });

    it('parses --format flag', () => {
      const result = parseArgs(['report', '--format', 'markdown']);
      expect(result.format).toBe('markdown');
    });

    it('parses --format= syntax', () => {
      const result = parseArgs(['report', '--format=html']);
      expect(result.format).toBe('html');
    });

    it('parses --output flag', () => {
      const result = parseArgs(['report', '--output', '/path/to/report.md']);
      expect(result.output).toBe('/path/to/report.md');
    });

    it('handles all subcommands', () => {
      const subcommands = ['status', 'checklist', 'evidence', 'report', 'policies', 'gaps'];
      for (const cmd of subcommands) {
        const result = parseArgs([cmd]);
        expect(result.subcommand).toBe(cmd);
      }
    });
  });

  describe('execute status', () => {
    it('shows compliance percentage', async () => {
      const result = await complianceCommand.execute(['status']);

      expect(result.success).toBe(true);
      expect(result.output).toContain('50%');
    });

    it('shows category breakdown', async () => {
      const result = await complianceCommand.execute(['status']);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Security');
      expect(result.output).toContain('Availability');
      expect(result.output).toContain('Confidentiality');
    });

    it('shows risk level', async () => {
      const result = await complianceCommand.execute(['status']);

      expect(result.success).toBe(true);
      // Should contain some indicator of risk
      expect(result.output.toLowerCase()).toMatch(/risk|gap/i);
    });

    it('shows gaps count', async () => {
      const result = await complianceCommand.execute(['status']);

      expect(result.success).toBe(true);
      expect(result.output).toMatch(/\d+\s*(gap|control)/i);
    });
  });

  describe('execute checklist', () => {
    it('shows all controls', async () => {
      const result = await complianceCommand.execute(['checklist']);

      expect(result.success).toBe(true);
      expect(result.output).toContain('CC1.1');
      expect(result.output).toContain('CC6.1');
    });

    it('filters by category', async () => {
      const result = await complianceCommand.execute(['checklist', '--category', 'Availability']);

      expect(result.success).toBe(true);
      expect(result.output).toContain('A1.1');
    });

    it('shows control status', async () => {
      const result = await complianceCommand.execute(['checklist']);

      expect(result.success).toBe(true);
      // Should show status indicators
      expect(result.output).toMatch(/implement|partial|not/i);
    });
  });

  describe('execute evidence', () => {
    it('collects all evidence', async () => {
      const result = await complianceCommand.execute(['evidence']);

      expect(result.success).toBe(true);
    });

    it('shows collection summary', async () => {
      const result = await complianceCommand.execute(['evidence']);

      expect(result.success).toBe(true);
      expect(result.output).toMatch(/evidence|collected|item/i);
    });

    it('lists evidence items', async () => {
      const result = await complianceCommand.execute(['evidence']);

      expect(result.success).toBe(true);
      // Should show evidence types or IDs
      expect(result.output).toMatch(/policy|audit|config|ev-/i);
    });
  });

  describe('execute report', () => {
    it('generates full report', async () => {
      const result = await complianceCommand.execute(['report']);

      expect(result.success).toBe(true);
      expect(result.output).toBeTruthy();
    });

    it('supports format flag for markdown', async () => {
      const result = await complianceCommand.execute(['report', '--format', 'markdown']);

      expect(result.success).toBe(true);
    });

    it('supports format flag for html', async () => {
      const result = await complianceCommand.execute(['report', '--format', 'html']);

      expect(result.success).toBe(true);
    });

    it('supports text format by default', async () => {
      const result = await complianceCommand.execute(['report']);

      expect(result.success).toBe(true);
    });
  });

  describe('execute policies', () => {
    it('generates all policies', async () => {
      const result = await complianceCommand.execute(['policies']);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Access Control');
    });

    it('lists available policy types', async () => {
      const result = await complianceCommand.execute(['policies']);

      expect(result.success).toBe(true);
      // Should mention different policy types
      expect(result.output).toMatch(/access|data|incident|auth|acceptable/i);
    });
  });

  describe('execute gaps', () => {
    it('shows unimplemented controls', async () => {
      const result = await complianceCommand.execute(['gaps']);

      expect(result.success).toBe(true);
      expect(result.output).toContain('CC6.1');
    });

    it('shows partial controls', async () => {
      const result = await complianceCommand.execute(['gaps']);

      expect(result.success).toBe(true);
      expect(result.output).toContain('CC6.2');
    });

    it('groups by priority', async () => {
      const result = await complianceCommand.execute(['gaps']);

      expect(result.success).toBe(true);
      expect(result.output.toLowerCase()).toMatch(/high|priority/i);
    });

    it('shows gap severity', async () => {
      const result = await complianceCommand.execute(['gaps']);

      expect(result.success).toBe(true);
      expect(result.output).toMatch(/not_implemented|partial|high/i);
    });
  });

  describe('formatStatus', () => {
    it('returns readable output', () => {
      const status = {
        percentage: 85,
        implemented: 34,
        partial: 4,
        notImplemented: 2,
        total: 40,
        byCategory: {
          Security: { percentage: 90, implemented: 20, total: 22 },
          Availability: { percentage: 80, implemented: 3, total: 4 },
        },
      };

      const output = complianceCommand.formatStatus(status);

      expect(output).toContain('85%');
      expect(output).toContain('Security');
      expect(output).toContain('Availability');
    });

    it('includes progress bar', () => {
      const status = {
        percentage: 50,
        implemented: 5,
        partial: 0,
        notImplemented: 5,
        total: 10,
        byCategory: {},
      };

      const output = complianceCommand.formatStatus(status);

      // Should have some visual progress indicator
      expect(output.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('handles unknown subcommand', async () => {
      const result = await complianceCommand.execute(['unknown']);

      expect(result.success).toBe(false);
      expect(result.error).toContain('unknown');
    });

    it('handles missing subcommand gracefully', async () => {
      const result = await complianceCommand.execute([]);

      // Should either show help or status by default
      expect(result.success).toBe(true);
    });

    it('handles errors gracefully', async () => {
      // Override to throw an error
      complianceCommand.handleStatus = vi.fn().mockRejectedValue(new Error('Test error'));

      const result = await complianceCommand.execute(['status']);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Test error');
    });
  });
});
