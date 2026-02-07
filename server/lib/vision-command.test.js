/**
 * Vision Command Tests
 *
 * CLI commands for vision operations
 */

import { describe, it, beforeEach } from 'vitest';
const assert = require('node:assert');

const {
  VisionCommand,
  parseArgs,
  formatAnalysis,
  formatComparison,
  formatAccessibilityReport,
} = require('./vision-command.js');

describe('Vision Command', () => {
  let command;
  let mockClient;

  beforeEach(() => {
    mockClient = {
      _call: async () => ({ text: 'Mock response' }),
    };

    command = new VisionCommand({
      client: mockClient,
    });
  });

  describe('execute analyze', () => {
    it('analyzes screenshot', async () => {
      mockClient._call = async () => ({
        description: 'A login form with email and password inputs.',
        elements: ['input', 'button'],
      });

      const result = await command.execute('analyze /path/to/screenshot.png');

      assert.ok(result.success);
      assert.ok(result.output);
      assert.ok(result.analysis);
    });

    it('accepts custom prompt', async () => {
      let receivedPrompt;
      mockClient._call = async (prompt) => {
        receivedPrompt = prompt;
        return { description: 'Custom analysis' };
      };

      await command.execute('analyze /path/to/image.png --prompt "Find all buttons"');

      assert.ok(receivedPrompt.includes('buttons'));
    });
  });

  describe('execute compare', () => {
    it('compares before/after images', async () => {
      mockClient._call = async () => ({
        differences: [
          { type: 'changed', description: 'Header color changed' },
        ],
        similarity: 0.92,
      });

      const result = await command.execute('compare /path/to/before.png /path/to/after.png');

      assert.ok(result.success);
      assert.ok(result.comparison);
      assert.ok(result.comparison.differences);
    });

    it('reports when identical', async () => {
      mockClient._call = async () => ({
        differences: [],
        similarity: 1.0,
      });

      const result = await command.execute('compare /path/to/a.png /path/to/b.png');

      assert.ok(result.output.includes('identical') || result.output.includes('no diff'));
    });
  });

  describe('execute a11y', () => {
    it('runs accessibility audit', async () => {
      mockClient._call = async () => ({
        issues: [
          { type: 'contrast', severity: 'high', description: 'Low contrast text' },
        ],
        score: 75,
      });

      const result = await command.execute('a11y /path/to/ui.png');

      assert.ok(result.success);
      assert.ok(result.audit);
      assert.ok(result.audit.issues);
      assert.ok(result.audit.score !== undefined);
    });

    it('formats issues by severity', async () => {
      mockClient._call = async () => ({
        issues: [
          { type: 'contrast', severity: 'high', description: 'Issue 1' },
          { type: 'touch', severity: 'low', description: 'Issue 2' },
        ],
        score: 80,
      });

      const result = await command.execute('a11y /path/to/ui.png');

      assert.ok(result.output.includes('high') || result.output.includes('HIGH'));
    });
  });

  describe('execute extract', () => {
    it('extracts components from mockup', async () => {
      mockClient._call = async () => ({
        components: [
          { type: 'button', label: 'Submit' },
          { type: 'input', placeholder: 'Email' },
        ],
      });

      const result = await command.execute('extract /path/to/mockup.png');

      assert.ok(result.success);
      assert.ok(result.components);
      assert.ok(result.components.length > 0);
    });

    it('filters by component type', async () => {
      mockClient._call = async () => ({
        components: [
          { type: 'button', label: 'Submit' },
        ],
      });

      const result = await command.execute('extract /path/to/mockup.png --type button');

      result.components.forEach(c => {
        assert.strictEqual(c.type, 'button');
      });
    });
  });

  describe('parseArgs', () => {
    it('parses analyze command', () => {
      const parsed = parseArgs('analyze /path/to/image.png');

      assert.strictEqual(parsed.command, 'analyze');
      assert.strictEqual(parsed.imagePath, '/path/to/image.png');
    });

    it('parses compare command', () => {
      const parsed = parseArgs('compare /path/to/before.png /path/to/after.png');

      assert.strictEqual(parsed.command, 'compare');
      assert.strictEqual(parsed.beforeImage, '/path/to/before.png');
      assert.strictEqual(parsed.afterImage, '/path/to/after.png');
    });

    it('parses a11y command', () => {
      const parsed = parseArgs('a11y /path/to/ui.png');

      assert.strictEqual(parsed.command, 'a11y');
      assert.strictEqual(parsed.imagePath, '/path/to/ui.png');
    });

    it('parses prompt flag', () => {
      const parsed = parseArgs('analyze /image.png --prompt "Find buttons"');

      assert.strictEqual(parsed.prompt, 'Find buttons');
    });

    it('parses type filter', () => {
      const parsed = parseArgs('extract /mockup.png --type button');

      assert.strictEqual(parsed.type, 'button');
    });
  });

  describe('formatAnalysis', () => {
    it('creates readable output', () => {
      const analysis = {
        description: 'A login form with two input fields and a button.',
        elements: ['input:email', 'input:password', 'button:submit'],
      };

      const formatted = formatAnalysis(analysis);

      assert.ok(typeof formatted === 'string');
      assert.ok(formatted.includes('login') || formatted.includes('Login'));
    });
  });

  describe('formatComparison', () => {
    it('formats differences', () => {
      const comparison = {
        differences: [
          { type: 'changed', description: 'Button color changed' },
          { type: 'added', description: 'New icon added' },
        ],
        similarity: 0.85,
      };

      const formatted = formatComparison(comparison);

      assert.ok(formatted.includes('changed') || formatted.includes('Changed'));
      assert.ok(formatted.includes('85%') || formatted.includes('0.85'));
    });

    it('handles no differences', () => {
      const comparison = {
        differences: [],
        similarity: 1.0,
      };

      const formatted = formatComparison(comparison);

      assert.ok(formatted.includes('identical') || formatted.includes('100%'));
    });
  });

  describe('formatAccessibilityReport', () => {
    it('formats issues with severity', () => {
      const audit = {
        issues: [
          { type: 'contrast', severity: 'high', description: 'Low contrast' },
          { type: 'touch', severity: 'medium', description: 'Small button' },
        ],
        score: 70,
      };

      const formatted = formatAccessibilityReport(audit);

      assert.ok(formatted.includes('70') || formatted.includes('Score'));
      assert.ok(formatted.includes('contrast') || formatted.includes('Contrast'));
    });

    it('shows passing score', () => {
      const audit = {
        issues: [],
        score: 100,
      };

      const formatted = formatAccessibilityReport(audit);

      assert.ok(formatted.includes('100') || formatted.includes('pass'));
    });
  });
});
