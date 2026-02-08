/**
 * Gemini CLI Adapter Tests
 *
 * Format prompts for Gemini CLI, parse its output.
 */
import { describe, it, expect, vi } from 'vitest';

const {
  buildCommand,
  parseResponse,
  createAdapter,
} = require('./gemini-adapter.js');

describe('Gemini Adapter', () => {
  describe('buildCommand', () => {
    it('builds correct CLI command', () => {
      const cmd = buildCommand('Review this code', {});
      expect(cmd.command).toBe('gemini');
    });

    it('passes model flag from config', () => {
      const cmd = buildCommand('prompt', { model: 'gemini-2.5-pro' });
      expect(cmd.args).toContain('--model');
      expect(cmd.args).toContain('gemini-2.5-pro');
    });

    it('respects timeout', () => {
      const cmd = buildCommand('prompt', { timeout: 45000 });
      expect(cmd.timeout).toBe(45000);
    });
  });

  describe('parseResponse', () => {
    it('parses markdown response', () => {
      const markdown = '## Issues\n- Line 5: XSS vulnerability\n- Line 12: Missing validation';
      const result = parseResponse(markdown);
      expect(result.raw).toContain('XSS');
    });

    it('handles structured output mode', () => {
      const json = '```json\n{"findings": [{"severity": "high", "message": "SQL injection"}]}\n```';
      const result = parseResponse(json);
      expect(result.findings).toHaveLength(1);
    });
  });

  describe('createAdapter', () => {
    it('implements execute interface', () => {
      const adapter = createAdapter({ model: 'gemini-2.5-pro' });
      expect(adapter.name).toBe('gemini');
      expect(adapter.execute).toBeDefined();
    });
  });
});
