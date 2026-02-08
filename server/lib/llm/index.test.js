/**
 * LLM Service Integration Tests
 *
 * Unified API: createLLMService(config) → { review, execute, health }
 */
import { describe, it, expect, vi } from 'vitest';

const {
  createLLMService,
} = require('./index.js');

describe('LLM Service', () => {
  const mockDeps = {
    healthCheck: vi.fn().mockResolvedValue({ available: true }),
    spawn: vi.fn().mockReturnValue({
      stdout: { on: vi.fn((ev, cb) => { if (ev === 'data') cb(Buffer.from('{"findings": [], "summary": "Clean"}')); }) },
      stderr: { on: vi.fn() },
      stdin: { write: vi.fn(), end: vi.fn() },
      on: vi.fn((ev, cb) => { if (ev === 'close') cb(0); }),
    }),
  };

  describe('createLLMService', () => {
    it('creates service with config', () => {
      const service = createLLMService({
        providers: {
          codex: { type: 'cli', command: 'codex', capabilities: ['review'] },
        },
      }, mockDeps);

      expect(service).toBeDefined();
      expect(service.review).toBeDefined();
      expect(service.execute).toBeDefined();
      expect(service.health).toBeDefined();
    });

    it('creates service with zero config (auto-detect)', () => {
      const service = createLLMService({}, mockDeps);
      expect(service).toBeDefined();
    });

    it('review() returns structured findings', async () => {
      const service = createLLMService({
        providers: {
          codex: { type: 'cli', command: 'codex', capabilities: ['review'] },
        },
      }, mockDeps);

      const result = await service.review('diff content');
      expect(result).toMatchObject({
        findings: expect.any(Array),
        summary: expect.any(String),
      });
    });

    it('execute() returns raw response', async () => {
      const service = createLLMService({
        providers: {
          codex: { type: 'cli', command: 'codex', capabilities: ['code-gen'] },
        },
      }, mockDeps);

      const result = await service.execute('Write a function');
      expect(result).toMatchObject({
        response: expect.any(String),
      });
    });

    it('health() returns provider statuses', async () => {
      const service = createLLMService({
        providers: {
          codex: { type: 'cli', command: 'codex', capabilities: ['review'] },
        },
      }, mockDeps);

      const status = await service.health();
      expect(status.providers).toBeDefined();
    });

    it('falls back through providers on failure', async () => {
      const failThenSucceed = vi.fn()
        .mockReturnValueOnce({
          stdout: { on: vi.fn() },
          stderr: { on: vi.fn((ev, cb) => { if (ev === 'data') cb(Buffer.from('err')); }) },
          stdin: { write: vi.fn(), end: vi.fn() },
          on: vi.fn((ev, cb) => { if (ev === 'close') cb(1); }),
        })
        .mockReturnValueOnce({
          stdout: { on: vi.fn((ev, cb) => { if (ev === 'data') cb(Buffer.from('{"findings": [], "summary": "OK"}')); }) },
          stderr: { on: vi.fn() },
          stdin: { write: vi.fn(), end: vi.fn() },
          on: vi.fn((ev, cb) => { if (ev === 'close') cb(0); }),
        });

      const service = createLLMService({
        providers: {
          codex: { type: 'cli', command: 'codex', capabilities: ['review'] },
          gemini: { type: 'cli', command: 'gemini', capabilities: ['review'] },
        },
      }, { ...mockDeps, spawn: failThenSucceed });

      const result = await service.review('diff');
      expect(result.findings).toBeDefined();
    });

    it('respects multi-model config', () => {
      const service = createLLMService({
        providers: {
          codex: { type: 'cli', command: 'codex', capabilities: ['review'] },
          gemini: { type: 'cli', command: 'gemini', capabilities: ['review'] },
        },
        multiModel: true,
      }, mockDeps);

      expect(service).toBeDefined();
    });

    it('works with single provider', () => {
      const service = createLLMService({
        providers: {
          codex: { type: 'cli', command: 'codex', capabilities: ['review'] },
        },
      }, mockDeps);

      expect(service).toBeDefined();
    });

    it('exports clean public API', () => {
      const service = createLLMService({}, mockDeps);
      const keys = Object.keys(service);
      expect(keys).toContain('review');
      expect(keys).toContain('execute');
      expect(keys).toContain('health');
    });

    it('config validation catches bad provider references', () => {
      // Should not throw, just log warning or skip bad providers
      const service = createLLMService({
        providers: {
          invalid: { type: 'unknown', capabilities: ['review'] },
        },
      }, mockDeps);

      expect(service).toBeDefined();
    });
  });
});
