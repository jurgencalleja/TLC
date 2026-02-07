/**
 * LLM Reviewer Tests
 *
 * Mandatory LLM code review before every push, using multi-model router.
 * Collects diff, sends to LLM, parses structured review result.
 */
import { describe, it, expect, vi } from 'vitest';

const {
  createReviewer,
  buildReviewPrompt,
  parseReviewResponse,
  collectDiff,
  shouldSkipReview,
  storeReviewResult,
} = require('./llm-reviewer.js');

describe('LLM Reviewer', () => {
  describe('createReviewer', () => {
    it('creates reviewer with default options', () => {
      const reviewer = createReviewer();
      expect(reviewer).toBeDefined();
      expect(reviewer.options.timeout).toBeDefined();
    });

    it('accepts custom timeout', () => {
      const reviewer = createReviewer({ timeout: 30000 });
      expect(reviewer.options.timeout).toBe(30000);
    });
  });

  describe('buildReviewPrompt', () => {
    it('includes diff in prompt', () => {
      const prompt = buildReviewPrompt('--- a/file.js\n+++ b/file.js\n+const x = 1;', '');
      expect(prompt).toContain('file.js');
      expect(prompt).toContain('const x = 1');
    });

    it('includes coding standards in prompt', () => {
      const standards = '# Coding Standards\n- No hardcoded URLs';
      const prompt = buildReviewPrompt('diff content', standards);
      expect(prompt).toContain('No hardcoded URLs');
    });

    it('instructs strict review', () => {
      const prompt = buildReviewPrompt('diff', '');
      expect(prompt.toLowerCase()).toContain('strict');
    });

    it('requests structured JSON output', () => {
      const prompt = buildReviewPrompt('diff', '');
      expect(prompt).toContain('JSON');
    });
  });

  describe('parseReviewResponse', () => {
    it('parses valid JSON review', () => {
      const response = JSON.stringify({
        findings: [
          { severity: 'high', file: 'src/app.js', line: 10, rule: 'security', message: 'XSS risk', fix: 'Sanitize' },
        ],
        summary: 'Found 1 issue',
      });
      const result = parseReviewResponse(response);
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].severity).toBe('block'); // high normalizes to block
    });

    it('handles response with JSON in markdown code block', () => {
      const response = '```json\n{"findings": [], "summary": "All clear"}\n```';
      const result = parseReviewResponse(response);
      expect(result.findings).toEqual([]);
    });

    it('returns error finding on unparseable response', () => {
      const result = parseReviewResponse('I could not review this code because...');
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].severity).toBe('warn');
      expect(result.findings[0].rule).toBe('llm-parse-error');
    });

    it('normalizes severity levels', () => {
      const response = JSON.stringify({
        findings: [
          { severity: 'critical', file: 'x.js', message: 'Bad', fix: 'Fix' },
          { severity: 'low', file: 'y.js', message: 'Minor', fix: 'Maybe' },
        ],
      });
      const result = parseReviewResponse(response);
      // critical and high map to 'block', medium and low map to 'warn'
      expect(result.findings[0].severity).toBe('block');
      expect(result.findings[1].severity).toBe('info');
    });
  });

  describe('collectDiff', () => {
    it('returns diff from exec', async () => {
      const mockExec = vi.fn().mockResolvedValue('diff --git a/file.js\n+line');
      const diff = await collectDiff({ exec: mockExec });
      expect(diff).toContain('file.js');
      expect(mockExec).toHaveBeenCalled();
    });

    it('returns empty string when no changes', async () => {
      const mockExec = vi.fn().mockResolvedValue('');
      const diff = await collectDiff({ exec: mockExec });
      expect(diff).toBe('');
    });
  });

  describe('shouldSkipReview', () => {
    it('skips docs-only changes', () => {
      const files = ['README.md', 'docs/guide.md', 'CHANGELOG.md'];
      expect(shouldSkipReview(files)).toBe(true);
    });

    it('does not skip code changes', () => {
      const files = ['src/app.js', 'README.md'];
      expect(shouldSkipReview(files)).toBe(false);
    });

    it('does not skip config changes', () => {
      const files = ['package.json', '.env.example'];
      expect(shouldSkipReview(files)).toBe(false);
    });
  });

  describe('storeReviewResult', () => {
    it('writes review to .tlc/reviews/{hash}.json', () => {
      let writtenPath = '';
      let writtenData = '';
      const mockFs = {
        existsSync: vi.fn().mockReturnValue(true),
        mkdirSync: vi.fn(),
        writeFileSync: vi.fn((path, data) => {
          writtenPath = path;
          writtenData = data;
        }),
      };

      const result = { findings: [], summary: 'Clean' };
      storeReviewResult('abc123', result, { fs: mockFs });

      expect(writtenPath).toContain('abc123.json');
      expect(writtenPath).toContain('reviews');
      const parsed = JSON.parse(writtenData);
      expect(parsed.summary).toBe('Clean');
    });

    it('creates reviews directory if missing', () => {
      const mockFs = {
        existsSync: vi.fn().mockReturnValue(false),
        mkdirSync: vi.fn(),
        writeFileSync: vi.fn(),
      };

      storeReviewResult('xyz', { findings: [] }, { fs: mockFs });
      expect(mockFs.mkdirSync).toHaveBeenCalled();
    });
  });
});
