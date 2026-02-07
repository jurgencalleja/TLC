/**
 * Push Gate Tests
 *
 * Wires the static gate engine + LLM reviewer into pre-push hook.
 * Runs static first, then LLM if static passes.
 */
import { describe, it, expect, vi } from 'vitest';

const {
  runPushGate,
  mergeResults,
  createPushGate,
} = require('./push-gate.js');

describe('Push Gate', () => {
  describe('createPushGate', () => {
    it('creates push gate with default options', () => {
      const gate = createPushGate();
      expect(gate).toBeDefined();
      expect(gate.options).toBeDefined();
    });

    it('accepts custom timeout', () => {
      const gate = createPushGate({ llmTimeout: 30000 });
      expect(gate.options.llmTimeout).toBe(30000);
    });
  });

  describe('runPushGate', () => {
    it('runs static gate then LLM review', async () => {
      const callOrder = [];
      const mockStaticGate = vi.fn(async () => {
        callOrder.push('static');
        return { passed: true, findings: [], summary: { total: 0, block: 0, warn: 0, info: 0 } };
      });
      const mockLlmReview = vi.fn(async () => {
        callOrder.push('llm');
        return { findings: [], summary: 'Clean' };
      });

      const result = await runPushGate({
        staticGate: mockStaticGate,
        llmReview: mockLlmReview,
        files: [{ path: 'src/app.js', content: 'code' }],
      });

      expect(callOrder).toEqual(['static', 'llm']);
      expect(result.passed).toBe(true);
    });

    it('blocks immediately on static gate failure', async () => {
      const mockStaticGate = vi.fn(async () => ({
        passed: false,
        findings: [{ severity: 'block', rule: 'r1', file: 'x.js', message: 'Bad', fix: 'Fix' }],
        summary: { total: 1, block: 1, warn: 0, info: 0 },
      }));
      const mockLlmReview = vi.fn();

      const result = await runPushGate({
        staticGate: mockStaticGate,
        llmReview: mockLlmReview,
        files: [],
      });

      expect(result.passed).toBe(false);
      expect(mockLlmReview).not.toHaveBeenCalled();
    });

    it('blocks on LLM review critical findings', async () => {
      const mockStaticGate = vi.fn(async () => ({
        passed: true,
        findings: [],
        summary: { total: 0, block: 0, warn: 0, info: 0 },
      }));
      const mockLlmReview = vi.fn(async () => ({
        findings: [
          { severity: 'block', rule: 'logic-error', file: 'x.js', message: 'Bug', fix: 'Fix' },
        ],
      }));

      const result = await runPushGate({
        staticGate: mockStaticGate,
        llmReview: mockLlmReview,
        files: [],
      });

      expect(result.passed).toBe(false);
    });

    it('handles LLM timeout gracefully', async () => {
      const mockStaticGate = vi.fn(async () => ({
        passed: true,
        findings: [],
        summary: { total: 0, block: 0, warn: 0, info: 0 },
      }));
      const mockLlmReview = vi.fn(async () => {
        throw new Error('Timeout');
      });

      const result = await runPushGate({
        staticGate: mockStaticGate,
        llmReview: mockLlmReview,
        files: [],
      });

      // Falls back to static-only - should pass
      expect(result.passed).toBe(true);
      expect(result.llmSkipped).toBe(true);
    });

    it('passes when both static and LLM pass', async () => {
      const mockStaticGate = vi.fn(async () => ({
        passed: true,
        findings: [{ severity: 'warn', rule: 'r1', file: 'x.js', message: 'Minor', fix: 'Maybe' }],
        summary: { total: 1, block: 0, warn: 1, info: 0 },
      }));
      const mockLlmReview = vi.fn(async () => ({
        findings: [{ severity: 'info', rule: 'style', file: 'x.js', message: 'Style', fix: 'Format' }],
      }));

      const result = await runPushGate({
        staticGate: mockStaticGate,
        llmReview: mockLlmReview,
        files: [],
      });

      expect(result.passed).toBe(true);
    });

    it('records override when TLC_GATE_OVERRIDE is set', async () => {
      const mockStaticGate = vi.fn(async () => ({
        passed: false,
        findings: [{ severity: 'block', rule: 'r1', file: 'x.js', message: 'Bad', fix: 'Fix' }],
        summary: { total: 1, block: 1, warn: 0, info: 0 },
      }));

      const result = await runPushGate({
        staticGate: mockStaticGate,
        llmReview: vi.fn(),
        files: [],
        override: true,
      });

      expect(result.passed).toBe(true);
      expect(result.overridden).toBe(true);
    });
  });

  describe('mergeResults', () => {
    it('combines static and LLM findings', () => {
      const staticResult = {
        findings: [{ severity: 'warn', rule: 'r1', file: 'a.js', message: 'A' }],
        summary: { total: 1, block: 0, warn: 1, info: 0 },
      };
      const llmResult = {
        findings: [{ severity: 'block', rule: 'r2', file: 'b.js', message: 'B' }],
      };

      const merged = mergeResults(staticResult, llmResult);
      expect(merged.findings).toHaveLength(2);
      expect(merged.summary.total).toBe(2);
      expect(merged.summary.block).toBe(1);
      expect(merged.summary.warn).toBe(1);
    });

    it('handles null LLM result', () => {
      const staticResult = {
        findings: [{ severity: 'warn', rule: 'r1', file: 'a.js', message: 'A' }],
        summary: { total: 1, block: 0, warn: 1, info: 0 },
      };

      const merged = mergeResults(staticResult, null);
      expect(merged.findings).toHaveLength(1);
    });

    it('tags findings with source', () => {
      const staticResult = {
        findings: [{ severity: 'warn', rule: 'r1', file: 'a.js', message: 'A' }],
        summary: { total: 1, block: 0, warn: 1, info: 0 },
      };
      const llmResult = {
        findings: [{ severity: 'warn', rule: 'r2', file: 'b.js', message: 'B' }],
      };

      const merged = mergeResults(staticResult, llmResult);
      expect(merged.findings[0].source).toBe('static');
      expect(merged.findings[1].source).toBe('llm');
    });
  });
});
