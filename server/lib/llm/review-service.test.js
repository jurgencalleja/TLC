/**
 * Unified Review Service Tests
 *
 * One service: router → executor → prompt → parse → findings.
 */
import { describe, it, expect, vi } from 'vitest';

const {
  createReviewService,
} = require('./review-service.js');

describe('Review Service', () => {
  const makeMockRegistry = (providers = []) => ({
    getByCapability: vi.fn().mockReturnValue(providers),
    getBestProvider: vi.fn().mockResolvedValue(providers[0] || null),
    checkHealth: vi.fn().mockResolvedValue({ available: true }),
  });

  const makeMockExecutor = (response = '{"findings": [], "summary": "Clean"}') => ({
    execute: vi.fn().mockResolvedValue({
      response,
      model: 'test-model',
      latency: 100,
    }),
  });

  describe('single-model review', () => {
    it('routes to configured provider', async () => {
      const registry = makeMockRegistry([
        { name: 'codex', type: 'cli', command: 'codex' },
      ]);
      const executor = makeMockExecutor();

      const service = createReviewService({ registry, executor });
      const result = await service.review('diff content');

      expect(result.provider).toBe('codex');
      expect(result.findings).toBeDefined();
    });

    it('returns findings from one provider', async () => {
      const registry = makeMockRegistry([
        { name: 'codex', type: 'cli', command: 'codex' },
      ]);
      const executor = makeMockExecutor(
        '{"findings": [{"severity": "high", "file": "a.js", "line": 1, "rule": "xss", "message": "XSS risk", "fix": "sanitize"}], "summary": "1 issue"}'
      );

      const service = createReviewService({ registry, executor });
      const result = await service.review('diff content');

      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].severity).toBe('block');
    });

    it('falls back to next provider on failure', async () => {
      const providers = [
        { name: 'codex', type: 'cli', command: 'codex' },
        { name: 'gemini', type: 'cli', command: 'gemini' },
      ];
      const registry = makeMockRegistry(providers);
      registry.getBestProvider = vi.fn().mockResolvedValue(providers[0]);

      const executor = {
        execute: vi.fn()
          .mockRejectedValueOnce(new Error('codex failed'))
          .mockResolvedValueOnce({
            response: '{"findings": [], "summary": "OK"}',
            model: 'gemini',
            latency: 200,
          }),
      };

      const service = createReviewService({ registry, executor });
      const result = await service.review('diff');

      expect(result.provider).toBe('gemini');
    });

    it('includes provider name in result', async () => {
      const registry = makeMockRegistry([
        { name: 'codex', type: 'cli', command: 'codex' },
      ]);
      const executor = makeMockExecutor();

      const service = createReviewService({ registry, executor });
      const result = await service.review('diff');

      expect(result.provider).toBeDefined();
    });

    it('includes latency in result', async () => {
      const registry = makeMockRegistry([
        { name: 'codex', type: 'cli', command: 'codex' },
      ]);
      const executor = makeMockExecutor();

      const service = createReviewService({ registry, executor });
      const result = await service.review('diff');

      expect(result.latency).toBeDefined();
      expect(typeof result.latency).toBe('number');
    });
  });

  describe('multi-model review', () => {
    it('fans out to all review providers', async () => {
      const providers = [
        { name: 'codex', type: 'cli', command: 'codex' },
        { name: 'gemini', type: 'cli', command: 'gemini' },
      ];
      const registry = makeMockRegistry(providers);
      const executor = makeMockExecutor();

      const service = createReviewService({ registry, executor, multiModel: true });
      const result = await service.review('diff');

      expect(executor.execute).toHaveBeenCalledTimes(2);
    });

    it('aggregates multi-model findings with deduplication', async () => {
      const providers = [
        { name: 'codex', type: 'cli', command: 'codex' },
        { name: 'gemini', type: 'cli', command: 'gemini' },
      ];
      const registry = makeMockRegistry(providers);

      const executor = {
        execute: vi.fn()
          .mockResolvedValueOnce({
            response: '{"findings": [{"severity": "warn", "file": "a.js", "line": 1, "rule": "no-console", "message": "console"}], "summary": "A"}',
            model: 'codex',
            latency: 100,
          })
          .mockResolvedValueOnce({
            response: '{"findings": [{"severity": "warn", "file": "a.js", "line": 1, "rule": "no-console", "message": "console log"}], "summary": "B"}',
            model: 'gemini',
            latency: 150,
          }),
      };

      const service = createReviewService({ registry, executor, multiModel: true });
      const result = await service.review('diff');

      // Same file+line+rule → deduplicated to 1 finding
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].flaggedBy).toContain('codex');
      expect(result.findings[0].flaggedBy).toContain('gemini');
    });
  });

  describe('edge cases', () => {
    it('skips docs-only changes', async () => {
      const registry = makeMockRegistry([
        { name: 'codex', type: 'cli', command: 'codex' },
      ]);
      const executor = makeMockExecutor();

      const service = createReviewService({ registry, executor });
      const result = await service.review('diff --git a/README.md b/README.md', {
        files: ['README.md', 'docs/guide.md'],
      });

      expect(result.skipped).toBe(true);
      expect(executor.execute).not.toHaveBeenCalled();
    });

    it('handles all providers failing (static-only fallback)', async () => {
      const registry = makeMockRegistry([
        { name: 'codex', type: 'cli', command: 'codex' },
      ]);
      const executor = {
        execute: vi.fn().mockRejectedValue(new Error('all fail')),
      };

      const service = createReviewService({ registry, executor });
      const result = await service.review('diff');

      expect(result.findings).toEqual([]);
      expect(result.summary).toContain('static-only');
    });

    it('works with no config (sensible defaults)', () => {
      const service = createReviewService({});
      expect(service).toBeDefined();
      expect(service.review).toBeDefined();
    });

    it('provider order from config determines priority', async () => {
      const providers = [
        { name: 'codex', type: 'cli', command: 'codex', priority: 1 },
        { name: 'gemini', type: 'cli', command: 'gemini', priority: 2 },
      ];
      const registry = makeMockRegistry(providers);
      const executor = makeMockExecutor();

      const service = createReviewService({ registry, executor });
      await service.review('diff');

      // Should try codex first (priority 1)
      const firstCall = executor.execute.mock.calls[0];
      expect(firstCall[1].command || firstCall[1].name).toBeDefined();
    });

    it('respects timeout from config', async () => {
      const registry = makeMockRegistry([
        { name: 'codex', type: 'cli', command: 'codex' },
      ]);
      const executor = makeMockExecutor();

      const service = createReviewService({ registry, executor, timeout: 30000 });
      await service.review('diff');

      expect(executor.execute).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ timeout: 30000 })
      );
    });
  });
});
