/**
 * Multi-Model Reviewer Tests
 *
 * Sends code reviews to 2+ LLM models and aggregates findings.
 * Different models catch different bugs.
 */
import { describe, it, expect, vi } from 'vitest';

const {
  createMultiModelReviewer,
  sendToModels,
  aggregateFindings,
  deduplicateFindings,
  calculateConsensus,
  mergeSummaries,
} = require('./multi-model-reviewer.js');

describe('Multi-Model Reviewer', () => {
  describe('sendToModels', () => {
    it('sends to multiple models in parallel', async () => {
      const mockReviewFn = vi.fn()
        .mockResolvedValueOnce({
          findings: [{ severity: 'warn', file: 'a.js', line: 1, rule: 'no-console', message: 'Remove console' }],
          summary: 'Model A review',
        })
        .mockResolvedValueOnce({
          findings: [{ severity: 'warn', file: 'b.js', line: 5, rule: 'no-unused', message: 'Unused var' }],
          summary: 'Model B review',
        });

      const results = await sendToModels('diff content', ['model-a', 'model-b'], {
        reviewFn: mockReviewFn,
      });

      expect(mockReviewFn).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
    });

    it('falls back when one model fails', async () => {
      const mockReviewFn = vi.fn()
        .mockResolvedValueOnce({
          findings: [{ severity: 'warn', file: 'a.js', line: 1, rule: 'test', message: 'Issue' }],
          summary: 'Model A OK',
        })
        .mockRejectedValueOnce(new Error('Model B timeout'));

      const results = await sendToModels('diff', ['model-a', 'model-b'], {
        reviewFn: mockReviewFn,
      });

      expect(results).toHaveLength(1);
      expect(results[0].model).toBe('model-a');
    });

    it('returns empty when all models fail', async () => {
      const mockReviewFn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'));

      const results = await sendToModels('diff', ['a', 'b'], {
        reviewFn: mockReviewFn,
      });

      expect(results).toHaveLength(0);
    });

    it('single model mode still works', async () => {
      const mockReviewFn = vi.fn().mockResolvedValue({
        findings: [{ severity: 'block', file: 'x.js', line: 1, rule: 'sec', message: 'XSS' }],
        summary: 'Single model review',
      });

      const results = await sendToModels('diff', ['only-model'], {
        reviewFn: mockReviewFn,
      });

      expect(results).toHaveLength(1);
      expect(results[0].findings).toHaveLength(1);
    });

    it('timeout applies per-model', async () => {
      const mockReviewFn = vi.fn().mockImplementation((diff, model) => {
        if (model === 'slow-model') {
          return new Promise((resolve) => setTimeout(resolve, 10000));
        }
        return Promise.resolve({ findings: [], summary: 'OK' });
      });

      const results = await sendToModels('diff', ['fast-model', 'slow-model'], {
        reviewFn: mockReviewFn,
        timeout: 50,
      });

      // fast-model should succeed, slow-model should timeout
      expect(results.some(r => r.model === 'fast-model')).toBe(true);
    });
  });

  describe('aggregateFindings', () => {
    it('aggregates findings from 2 models', () => {
      const modelResults = [
        {
          model: 'model-a',
          findings: [
            { severity: 'warn', file: 'a.js', line: 1, rule: 'no-console', message: 'Console' },
          ],
          summary: 'A review',
        },
        {
          model: 'model-b',
          findings: [
            { severity: 'block', file: 'b.js', line: 5, rule: 'security', message: 'XSS' },
          ],
          summary: 'B review',
        },
      ];

      const result = aggregateFindings(modelResults);
      expect(result.findings).toHaveLength(2);
    });

    it('tracks flaggedBy for each finding', () => {
      const modelResults = [
        {
          model: 'model-a',
          findings: [
            { severity: 'warn', file: 'a.js', line: 1, rule: 'no-console', message: 'Console' },
          ],
        },
        {
          model: 'model-b',
          findings: [
            { severity: 'warn', file: 'a.js', line: 1, rule: 'no-console', message: 'Console log' },
          ],
        },
      ];

      const result = aggregateFindings(modelResults);
      // Both flagged same file+line+rule, so should be deduplicated
      const finding = result.findings.find(f => f.rule === 'no-console');
      expect(finding.flaggedBy).toContain('model-a');
      expect(finding.flaggedBy).toContain('model-b');
    });

    it('higher severity wins on conflict', () => {
      const modelResults = [
        {
          model: 'model-a',
          findings: [
            { severity: 'warn', file: 'a.js', line: 1, rule: 'test-rule', message: 'Issue' },
          ],
        },
        {
          model: 'model-b',
          findings: [
            { severity: 'block', file: 'a.js', line: 1, rule: 'test-rule', message: 'Serious issue' },
          ],
        },
      ];

      const result = aggregateFindings(modelResults);
      const finding = result.findings.find(f => f.rule === 'test-rule');
      expect(finding.severity).toBe('block');
    });
  });

  describe('deduplicateFindings', () => {
    it('deduplicates identical findings by file+line+rule', () => {
      const findings = [
        { severity: 'warn', file: 'a.js', line: 1, rule: 'no-console', message: 'Console', flaggedBy: ['model-a'] },
        { severity: 'warn', file: 'a.js', line: 1, rule: 'no-console', message: 'Console log', flaggedBy: ['model-b'] },
      ];

      const deduped = deduplicateFindings(findings);
      expect(deduped).toHaveLength(1);
      expect(deduped[0].flaggedBy).toContain('model-a');
      expect(deduped[0].flaggedBy).toContain('model-b');
    });
  });

  describe('calculateConsensus', () => {
    it('calculates consensus percentage', () => {
      const finding = { flaggedBy: ['model-a', 'model-b'] };
      const totalModels = 3;

      const consensus = calculateConsensus(finding, totalModels);
      // 2/3 = ~66.7%
      expect(consensus).toBeCloseTo(66.7, 0);
    });
  });

  describe('mergeSummaries', () => {
    it('merges summaries from all models', () => {
      const modelResults = [
        { model: 'model-a', summary: 'Found 1 issue' },
        { model: 'model-b', summary: 'Code looks mostly clean' },
      ];

      const merged = mergeSummaries(modelResults);
      expect(merged).toContain('model-a');
      expect(merged).toContain('model-b');
      expect(merged).toContain('Found 1 issue');
      expect(merged).toContain('Code looks mostly clean');
    });
  });

  describe('createMultiModelReviewer', () => {
    it('respects model list from config', () => {
      const reviewer = createMultiModelReviewer({
        models: ['gpt-4', 'claude-3'],
        reviewFn: vi.fn(),
      });
      expect(reviewer).toBeDefined();
      expect(reviewer.models).toEqual(['gpt-4', 'claude-3']);
    });
  });
});
