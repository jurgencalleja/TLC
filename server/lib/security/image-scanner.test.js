/**
 * Image Scanner (Trivy) Tests
 */
import { describe, it, expect, vi } from 'vitest';
import {
  parseTrixyOutput,
  filterBySeverity,
  shouldBlockBuild,
  createImageScanner,
  SEVERITY,
} from './image-scanner.js';

describe('image-scanner', () => {
  const mockTrivyOutput = {
    Results: [{
      Target: 'node:20-alpine',
      Vulnerabilities: [
        { VulnerabilityID: 'CVE-2024-0001', Severity: 'CRITICAL', Title: 'Critical vuln' },
        { VulnerabilityID: 'CVE-2024-0002', Severity: 'HIGH', Title: 'High vuln' },
        { VulnerabilityID: 'CVE-2024-0003', Severity: 'MEDIUM', Title: 'Medium vuln' },
        { VulnerabilityID: 'CVE-2024-0004', Severity: 'LOW', Title: 'Low vuln' },
      ],
    }],
  };

  describe('parseTrixyOutput', () => {
    it('parses Trivy JSON output', () => {
      const result = parseTrixyOutput(JSON.stringify(mockTrivyOutput));
      expect(result.vulnerabilities).toHaveLength(4);
      expect(result.summary.critical).toBe(1);
      expect(result.summary.high).toBe(1);
    });

    it('handles empty results', () => {
      const result = parseTrixyOutput(JSON.stringify({ Results: [] }));
      expect(result.vulnerabilities).toHaveLength(0);
    });

    it('handles null vulnerabilities', () => {
      const result = parseTrixyOutput(JSON.stringify({ Results: [{ Target: 'test', Vulnerabilities: null }] }));
      expect(result.vulnerabilities).toHaveLength(0);
    });
  });

  describe('filterBySeverity', () => {
    it('filters by minimum severity', () => {
      const parsed = parseTrixyOutput(JSON.stringify(mockTrivyOutput));
      const filtered = filterBySeverity(parsed.vulnerabilities, 'HIGH');
      expect(filtered).toHaveLength(2);
    });

    it('returns all for LOW severity', () => {
      const parsed = parseTrixyOutput(JSON.stringify(mockTrivyOutput));
      const filtered = filterBySeverity(parsed.vulnerabilities, 'LOW');
      expect(filtered).toHaveLength(4);
    });

    it('returns only critical for CRITICAL', () => {
      const parsed = parseTrixyOutput(JSON.stringify(mockTrivyOutput));
      const filtered = filterBySeverity(parsed.vulnerabilities, 'CRITICAL');
      expect(filtered).toHaveLength(1);
    });
  });

  describe('shouldBlockBuild', () => {
    it('blocks on critical vulnerabilities', () => {
      const parsed = parseTrixyOutput(JSON.stringify(mockTrivyOutput));
      expect(shouldBlockBuild(parsed, { blockOn: 'CRITICAL' })).toBe(true);
    });

    it('blocks on high when threshold is HIGH', () => {
      const parsed = parseTrixyOutput(JSON.stringify(mockTrivyOutput));
      expect(shouldBlockBuild(parsed, { blockOn: 'HIGH' })).toBe(true);
    });

    it('passes when no critical vulns', () => {
      const noVulns = { Results: [{ Target: 'clean', Vulnerabilities: [] }] };
      const parsed = parseTrixyOutput(JSON.stringify(noVulns));
      expect(shouldBlockBuild(parsed, { blockOn: 'CRITICAL' })).toBe(false);
    });
  });

  describe('createImageScanner', () => {
    it('creates scanner with config', () => {
      const scanner = createImageScanner({ blockOn: 'HIGH' });
      expect(scanner).toBeDefined();
      expect(scanner.scan).toBeDefined();
    });

    it('generates compliance report', () => {
      const scanner = createImageScanner();
      const parsed = parseTrixyOutput(JSON.stringify(mockTrivyOutput));
      const report = scanner.generateReport(parsed);
      expect(report.passed).toBe(false);
      expect(report.summary).toBeDefined();
    });

    it('scanner returns structured results', async () => {
      const mockExec = vi.fn().mockResolvedValue(JSON.stringify(mockTrivyOutput));
      const scanner = createImageScanner({ exec: mockExec });
      const result = await scanner.scan('node:20-alpine');
      expect(result.image).toBe('node:20-alpine');
      expect(result.vulnerabilities).toBeDefined();
    });
  });
});
