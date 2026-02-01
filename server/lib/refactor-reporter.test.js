/**
 * Refactor Reporter Tests
 */

import { describe, it, expect } from 'vitest';

describe('RefactorReporter', () => {
  describe('plain English summaries', () => {
    it('generates plain English: Extracted X from Y', async () => {
      const { RefactorReporter } = await import('./refactor-reporter.js');
      const reporter = new RefactorReporter();

      const summary = reporter.describeChange({
        type: 'extract',
        name: 'validateEmail',
        source: 'createUser',
        lines: 15,
      });

      expect(summary).toContain('Extracted');
      expect(summary).toContain('validateEmail');
      expect(summary).toContain('createUser');
    });

    it('generates summary for rename', async () => {
      const { RefactorReporter } = await import('./refactor-reporter.js');
      const reporter = new RefactorReporter();

      const summary = reporter.describeChange({
        type: 'rename',
        oldName: 'x',
        newName: 'userCount',
        filesAffected: 3,
      });

      expect(summary).toContain('Renamed');
      expect(summary).toContain('x');
      expect(summary).toContain('userCount');
      expect(summary).toContain('3');
    });

    it('generates summary for split', async () => {
      const { RefactorReporter } = await import('./refactor-reporter.js');
      const reporter = new RefactorReporter();

      const summary = reporter.describeChange({
        type: 'split',
        source: 'handlers.js',
        targets: ['userHandlers.js', 'authHandlers.js'],
      });

      expect(summary).toContain('Split');
      expect(summary).toContain('handlers.js');
      expect(summary).toContain('2');
    });
  });

  describe('diff generation', () => {
    it('generates unified diff format', async () => {
      const { RefactorReporter } = await import('./refactor-reporter.js');
      const reporter = new RefactorReporter();

      const diff = reporter.generateDiff({
        file: 'test.js',
        before: 'const x = 1;',
        after: 'const count = 1;',
      });

      expect(diff).toContain('--- a/test.js');
      expect(diff).toContain('+++ b/test.js');
      expect(diff).toContain('-const x = 1;');
      expect(diff).toContain('+const count = 1;');
    });

    it('handles empty before/after', async () => {
      const { RefactorReporter } = await import('./refactor-reporter.js');
      const reporter = new RefactorReporter();

      const diff = reporter.generateDiff({
        file: 'test.js',
      });

      expect(diff).toBe('');
    });
  });

  describe('Mermaid diagrams', () => {
    it('generates Mermaid diagram for function relationships', async () => {
      const { RefactorReporter } = await import('./refactor-reporter.js');
      const reporter = new RefactorReporter();

      const diagram = reporter.generateMermaidDiagram([
        { type: 'extract', source: 'main', name: 'helper' },
        { type: 'extract', source: 'main', name: 'utils' },
      ]);

      expect(diagram).toContain('graph TD');
      expect(diagram).toContain('main --> helper');
      expect(diagram).toContain('main --> utils');
    });

    it('handles split operations', async () => {
      const { RefactorReporter } = await import('./refactor-reporter.js');
      const reporter = new RefactorReporter();

      const diagram = reporter.generateMermaidDiagram([
        { type: 'split', source: 'handlers', targets: [{ name: 'userHandlers' }, { name: 'authHandlers' }] },
      ]);

      expect(diagram).toContain('handlers --> userHandlers');
      expect(diagram).toContain('handlers --> authHandlers');
    });

    it('returns empty for non-structural changes', async () => {
      const { RefactorReporter } = await import('./refactor-reporter.js');
      const reporter = new RefactorReporter();

      const diagram = reporter.generateMermaidDiagram([
        { type: 'rename', oldName: 'x', newName: 'y' },
      ]);

      expect(diagram).toBe('');
    });
  });

  describe('Markdown output', () => {
    it('outputs valid Markdown', async () => {
      const { RefactorReporter } = await import('./refactor-reporter.js');
      const reporter = new RefactorReporter();

      const md = reporter.toMarkdown([
        { type: 'extract', source: 'main.js', name: 'helper' },
      ]);

      expect(md).toContain('# Refactoring Report');
      expect(md).toContain('## Summary');
      expect(md).toContain('## Changes');
    });

    it('includes collapsible diff sections', async () => {
      const { RefactorReporter } = await import('./refactor-reporter.js');
      const reporter = new RefactorReporter();

      const md = reporter.toMarkdown([
        { type: 'rename', oldName: 'x', newName: 'y', file: 'test.js', before: 'x', after: 'y' },
      ]);

      expect(md).toContain('<details>');
      expect(md).toContain('View Diff');
      expect(md).toContain('</details>');
    });
  });

  describe('JSON output', () => {
    it('outputs valid JSON', async () => {
      const { RefactorReporter } = await import('./refactor-reporter.js');
      const reporter = new RefactorReporter();

      const json = reporter.toJson([
        { type: 'extract', source: 'main.js', name: 'helper' },
      ]);

      const parsed = JSON.parse(json);
      expect(parsed.summary).toBeDefined();
      expect(parsed.changes).toBeDefined();
      expect(parsed.generatedAt).toBeDefined();
    });

    it('includes descriptions in JSON', async () => {
      const { RefactorReporter } = await import('./refactor-reporter.js');
      const reporter = new RefactorReporter();

      const json = reporter.toJson([
        { type: 'rename', oldName: 'x', newName: 'count' },
      ]);

      const parsed = JSON.parse(json);
      expect(parsed.changes[0].description).toContain('Renamed');
    });
  });

  describe('HTML output', () => {
    it('outputs valid HTML', async () => {
      const { RefactorReporter } = await import('./refactor-reporter.js');
      const reporter = new RefactorReporter();

      const html = reporter.toHtml([
        { type: 'extract', source: 'main.js', name: 'helper' },
      ]);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html>');
      expect(html).toContain('</html>');
      expect(html).toContain('<title>Refactoring Report</title>');
    });

    it('escapes HTML entities', async () => {
      const { RefactorReporter } = await import('./refactor-reporter.js');
      const reporter = new RefactorReporter();

      const escaped = reporter.escapeHtml('<script>alert("xss")</script>');

      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;script&gt;');
    });
  });

  describe('before/after comparisons', () => {
    it('includes before/after code blocks', async () => {
      const { RefactorReporter } = await import('./refactor-reporter.js');
      const reporter = new RefactorReporter();

      const comparison = reporter.generateComparison({
        file: 'test.js',
        type: 'rename',
        before: 'const x = 1;',
        after: 'const count = 1;',
      });

      expect(comparison.before).toBe('const x = 1;');
      expect(comparison.after).toBe('const count = 1;');
      expect(comparison.file).toBe('test.js');
    });
  });

  describe('generate method', () => {
    it('defaults to markdown format', async () => {
      const { RefactorReporter } = await import('./refactor-reporter.js');
      const reporter = new RefactorReporter();

      const output = reporter.generate([{ type: 'extract', name: 'test', source: 'main' }]);

      expect(output).toContain('# Refactoring Report');
    });

    it('respects format parameter', async () => {
      const { RefactorReporter } = await import('./refactor-reporter.js');
      const reporter = new RefactorReporter();

      const json = reporter.generate([{ type: 'extract', name: 'test', source: 'main' }], 'json');
      expect(() => JSON.parse(json)).not.toThrow();

      const html = reporter.generate([{ type: 'extract', name: 'test', source: 'main' }], 'html');
      expect(html).toContain('<!DOCTYPE html>');
    });
  });
});
