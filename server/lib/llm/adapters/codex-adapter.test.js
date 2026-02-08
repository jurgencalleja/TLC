/**
 * Codex CLI Adapter Tests
 *
 * Format prompts for Codex CLI, parse its output.
 */
import { describe, it, expect, vi } from 'vitest';

const {
  buildCommand,
  parseResponse,
  createAdapter,
} = require('./codex-adapter.js');

describe('Codex Adapter', () => {
  describe('buildCommand', () => {
    it('builds correct CLI command', () => {
      const cmd = buildCommand('Review this code', { model: 'gpt-4o' });
      expect(cmd.command).toBe('codex');
      expect(cmd.args).toContain('--quiet');
    });

    it('passes model flag from config', () => {
      const cmd = buildCommand('prompt', { model: 'o3-mini' });
      expect(cmd.args).toContain('--model');
      expect(cmd.args).toContain('o3-mini');
    });

    it('respects timeout', () => {
      const cmd = buildCommand('prompt', { timeout: 30000 });
      expect(cmd.timeout).toBe(30000);
    });
  });

  describe('parseResponse', () => {
    it('parses JSON response', () => {
      const json = JSON.stringify({ findings: [{ severity: 'high', message: 'XSS' }], summary: 'Issues found' });
      const result = parseResponse(json);
      expect(result.findings).toHaveLength(1);
    });

    it('handles non-JSON output gracefully', () => {
      const result = parseResponse('This is a plain text review response with some issues noted.');
      expect(result.raw).toBeDefined();
    });
  });

  describe('createAdapter', () => {
    it('implements execute interface', () => {
      const adapter = createAdapter({ model: 'gpt-4o' });
      expect(adapter.name).toBe('codex');
      expect(adapter.execute).toBeDefined();
    });
  });
});
