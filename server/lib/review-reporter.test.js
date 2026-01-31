import { describe, it, expect } from 'vitest';
import { generateReport, generateMarkdown, generateJSON, generateHTML } from './review-reporter.js';

const sampleResults = {
  files: ['src/index.js', 'src/utils.js'],
  models: ['claude', 'openai', 'deepseek'],
  totalIssues: 5,
  averageConfidence: 0.85,
  totalCost: 0.0234,
  consensusIssues: [
    { id: 'A', message: 'Unused variable', voters: ['claude', 'openai'], confidence: 0.67 },
    { id: 'B', message: 'Missing error handling', voters: ['claude', 'openai', 'deepseek'], confidence: 1.0 },
  ],
  fileResults: [
    {
      file: 'src/index.js',
      issues: [
        { line: 10, severity: 'high', message: 'SQL injection vulnerability', confidence: 1.0 },
        { line: 25, severity: 'medium', message: 'Unused variable x', confidence: 0.67 },
      ],
    },
    {
      file: 'src/utils.js',
      issues: [
        { line: 5, severity: 'low', message: 'Consider using const', confidence: 0.33 },
        { line: 15, severity: 'high', message: 'Missing null check', confidence: 1.0 },
        { line: 30, severity: 'medium', message: 'Complex function', confidence: 0.67 },
      ],
    },
  ],
  costs: {
    byModel: { claude: 0.01, openai: 0.012, deepseek: 0.0014 },
    total: 0.0234,
  },
  modelAgreement: true,
};

describe('Review Reporter', () => {
  describe('generateMarkdown', () => {
    it('generates markdown header', () => {
      const md = generateMarkdown(sampleResults);
      expect(md).toContain('# Code Review Report');
      expect(md).toContain('**Files Reviewed:** 2');
      expect(md).toContain('**Models Used:** claude, openai, deepseek');
    });

    it('includes summary table', () => {
      const md = generateMarkdown(sampleResults);
      expect(md).toContain('## Summary');
      expect(md).toContain('| Total Issues | 5 |');
      expect(md).toContain('| High Severity | 2 |');
      expect(md).toContain('| Medium Severity | 2 |');
      expect(md).toContain('| Low Severity | 1 |');
    });

    it('includes average confidence', () => {
      const md = generateMarkdown(sampleResults);
      expect(md).toContain('| Average Confidence | 85% |');
    });

    it('includes cost summary', () => {
      const md = generateMarkdown(sampleResults);
      expect(md).toContain('| Total Cost | $0.0234 |');
    });

    it('includes model agreement section', () => {
      const md = generateMarkdown(sampleResults);
      expect(md).toContain('## Model Agreement');
      expect(md).toContain('Missing error handling');
      expect(md).toContain('claude, openai, deepseek');
    });

    it('includes issues by file', () => {
      const md = generateMarkdown(sampleResults);
      expect(md).toContain('### src/index.js');
      expect(md).toContain('SQL injection vulnerability');
      expect(md).toContain('### src/utils.js');
    });

    it('includes cost breakdown', () => {
      const md = generateMarkdown(sampleResults);
      expect(md).toContain('## Cost Breakdown');
      expect(md).toContain('| claude | $0.0100 |');
      expect(md).toContain('| openai | $0.0120 |');
    });

    it('escapes pipe characters in messages', () => {
      const results = {
        fileResults: [{
          file: 'test.js',
          issues: [{ message: 'Use | instead of ||', severity: 'low', confidence: 0.5 }],
        }],
      };
      const md = generateMarkdown(results);
      expect(md).toContain('Use \\| instead of \\|\\|');
    });

    it('handles empty results', () => {
      const md = generateMarkdown({});
      expect(md).toContain('# Code Review Report');
      expect(md).toContain('**Files Reviewed:** 0');
      expect(md).toContain('| Total Issues | 0 |');
    });
  });

  describe('generateJSON', () => {
    it('returns valid JSON', () => {
      const json = generateJSON(sampleResults);
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('includes meta information', () => {
      const json = generateJSON(sampleResults);
      const parsed = JSON.parse(json);
      expect(parsed.meta.filesReviewed).toBe(2);
      expect(parsed.meta.modelsUsed).toEqual(['claude', 'openai', 'deepseek']);
    });

    it('includes summary with severity breakdown', () => {
      const json = generateJSON(sampleResults);
      const parsed = JSON.parse(json);
      expect(parsed.summary.totalIssues).toBe(5);
      expect(parsed.summary.bySeverity.high).toBe(2);
      expect(parsed.summary.bySeverity.medium).toBe(2);
      expect(parsed.summary.bySeverity.low).toBe(1);
    });

    it('includes costs', () => {
      const json = generateJSON(sampleResults);
      const parsed = JSON.parse(json);
      expect(parsed.costs.total).toBe(0.0234);
      expect(parsed.costs.byModel.claude).toBe(0.01);
    });

    it('includes file results', () => {
      const json = generateJSON(sampleResults);
      const parsed = JSON.parse(json);
      expect(parsed.fileResults).toHaveLength(2);
      expect(parsed.fileResults[0].file).toBe('src/index.js');
    });

    it('handles empty results', () => {
      const json = generateJSON({});
      const parsed = JSON.parse(json);
      expect(parsed.summary.totalIssues).toBe(0);
      expect(parsed.fileResults).toEqual([]);
    });
  });

  describe('generateHTML', () => {
    it('generates valid HTML document', () => {
      const html = generateHTML(sampleResults);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
    });

    it('includes title', () => {
      const html = generateHTML(sampleResults);
      expect(html).toContain('<title>Code Review Report</title>');
    });

    it('includes summary cards', () => {
      const html = generateHTML(sampleResults);
      expect(html).toContain('Total Issues');
      expect(html).toContain('High Severity');
      expect(html).toContain('Avg Confidence');
    });

    it('includes CSS styling', () => {
      const html = generateHTML(sampleResults);
      expect(html).toContain('<style>');
      expect(html).toContain('.severity-high');
      expect(html).toContain('.severity-medium');
    });

    it('includes file issues tables', () => {
      const html = generateHTML(sampleResults);
      expect(html).toContain('src/index.js');
      expect(html).toContain('SQL injection vulnerability');
    });

    it('includes cost breakdown table', () => {
      const html = generateHTML(sampleResults);
      expect(html).toContain('Cost Breakdown');
      expect(html).toContain('claude');
    });

    it('escapes HTML in messages', () => {
      const results = {
        fileResults: [{
          file: 'test.js',
          issues: [{ message: '<script>alert("xss")</script>', severity: 'high', confidence: 1.0 }],
        }],
      };
      const html = generateHTML(results);
      expect(html).toContain('&lt;script&gt;');
      expect(html).not.toContain('<script>alert');
    });

    it('handles empty results', () => {
      const html = generateHTML({});
      expect(html).toContain('Code Review Report');
      expect(html).toContain('Files Reviewed:</strong> 0');
    });
  });

  describe('generateReport', () => {
    it('defaults to markdown format', () => {
      const report = generateReport(sampleResults);
      expect(report).toContain('# Code Review Report');
    });

    it('generates markdown with md format', () => {
      const report = generateReport(sampleResults, 'md');
      expect(report).toContain('# Code Review Report');
    });

    it('generates markdown with markdown format', () => {
      const report = generateReport(sampleResults, 'markdown');
      expect(report).toContain('# Code Review Report');
    });

    it('generates JSON with json format', () => {
      const report = generateReport(sampleResults, 'json');
      expect(() => JSON.parse(report)).not.toThrow();
    });

    it('generates HTML with html format', () => {
      const report = generateReport(sampleResults, 'html');
      expect(report).toContain('<!DOCTYPE html>');
    });

    it('is case insensitive', () => {
      expect(generateReport(sampleResults, 'JSON')).toContain('"meta"');
      expect(generateReport(sampleResults, 'HTML')).toContain('<!DOCTYPE html>');
      expect(generateReport(sampleResults, 'MD')).toContain('# Code Review Report');
    });
  });
});
