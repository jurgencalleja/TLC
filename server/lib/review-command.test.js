import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { executeReview, parseArgs, createAdapters, formatSummary } from './review-command.js';

describe('Review Command', () => {
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-review-cmd-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('parseArgs', () => {
    it('parses --file option', () => {
      const options = parseArgs('--file src/index.js');
      expect(options.file).toBe('src/index.js');
    });

    it('parses -f shorthand', () => {
      const options = parseArgs('-f src/index.js');
      expect(options.file).toBe('src/index.js');
    });

    it('parses --dir option', () => {
      const options = parseArgs('--dir src');
      expect(options.dir).toBe('src');
    });

    it('parses -d shorthand', () => {
      const options = parseArgs('-d src');
      expect(options.dir).toBe('src');
    });

    it('parses --format option', () => {
      const options = parseArgs('--format json');
      expect(options.format).toBe('json');
    });

    it('parses --output option', () => {
      const options = parseArgs('--output report.md');
      expect(options.output).toBe('report.md');
    });

    it('parses --models option', () => {
      const options = parseArgs('--models claude,openai');
      expect(options.models).toEqual(['claude', 'openai']);
    });

    it('parses --ext option', () => {
      const options = parseArgs('--ext .js,.ts');
      expect(options.extensions).toEqual(['.js', '.ts']);
    });

    it('parses --consensus option', () => {
      const options = parseArgs('--consensus unanimous');
      expect(options.consensusType).toBe('unanimous');
    });

    it('parses --verbose option', () => {
      const options = parseArgs('--verbose');
      expect(options.verbose).toBe(true);
    });

    it('parses positional file argument', () => {
      const filePath = path.join(testDir, 'test.js');
      fs.writeFileSync(filePath, 'code');

      const options = parseArgs(filePath);
      expect(options.file).toBe(filePath);
    });

    it('parses positional directory argument', () => {
      const options = parseArgs(testDir);
      expect(options.dir).toBe(testDir);
    });

    it('returns defaults for empty args', () => {
      const options = parseArgs('');
      expect(options.format).toBe('md');
      expect(options.models).toEqual(['claude', 'openai', 'deepseek']);
    });

    it('handles multiple options', () => {
      const options = parseArgs('--file test.js --format json --models claude -v');
      expect(options.file).toBe('test.js');
      expect(options.format).toBe('json');
      expect(options.models).toEqual(['claude']);
      expect(options.verbose).toBe(true);
    });
  });

  describe('createAdapters', () => {
    it('creates claude adapter', () => {
      const adapters = createAdapters(['claude']);
      expect(adapters).toHaveLength(1);
      expect(adapters[0].name).toBe('claude');
    });

    it('creates openai adapter', () => {
      const adapters = createAdapters(['openai']);
      expect(adapters).toHaveLength(1);
      expect(adapters[0].name).toBe('openai');
    });

    it('creates deepseek adapter', () => {
      const adapters = createAdapters(['deepseek']);
      expect(adapters).toHaveLength(1);
      expect(adapters[0].name).toBe('deepseek');
    });

    it('creates multiple adapters', () => {
      const adapters = createAdapters(['claude', 'openai', 'deepseek']);
      expect(adapters).toHaveLength(3);
    });

    it('skips unknown models', () => {
      const adapters = createAdapters(['claude', 'unknown', 'openai']);
      expect(adapters).toHaveLength(2);
    });

    it('is case insensitive', () => {
      const adapters = createAdapters(['CLAUDE', 'OpenAI']);
      expect(adapters).toHaveLength(2);
    });
  });

  describe('executeReview', () => {
    it('returns error when no target specified', async () => {
      const result = await executeReview('');
      expect(result.success).toBe(false);
      expect(result.error).toContain('No target specified');
    });

    it('reviews single file', async () => {
      const filePath = path.join(testDir, 'test.js');
      fs.writeFileSync(filePath, 'const x = 1;');

      const result = await executeReview(`--file ${filePath} --models claude`);
      expect(result.success).toBe(true);
      expect(result.summary.files).toBe(1);
    });

    it('reviews directory', async () => {
      fs.writeFileSync(path.join(testDir, 'a.js'), 'code');
      fs.writeFileSync(path.join(testDir, 'b.js'), 'code');

      const result = await executeReview(`--dir ${testDir} --models claude`);
      expect(result.success).toBe(true);
      expect(result.summary.files).toBe(2);
    });

    it('generates markdown report by default', async () => {
      const filePath = path.join(testDir, 'test.js');
      fs.writeFileSync(filePath, 'const x = 1;');

      const result = await executeReview(`--file ${filePath} --models claude`);
      expect(result.report).toContain('# Code Review Report');
    });

    it('generates JSON report when requested', async () => {
      const filePath = path.join(testDir, 'test.js');
      fs.writeFileSync(filePath, 'const x = 1;');

      const result = await executeReview(`--file ${filePath} --format json --models claude`);
      expect(() => JSON.parse(result.report)).not.toThrow();
    });

    it('generates HTML report when requested', async () => {
      const filePath = path.join(testDir, 'test.js');
      fs.writeFileSync(filePath, 'const x = 1;');

      const result = await executeReview(`--file ${filePath} --format html --models claude`);
      expect(result.report).toContain('<!DOCTYPE html>');
    });

    it('saves report to file when --output specified', async () => {
      const filePath = path.join(testDir, 'test.js');
      const outputPath = path.join(testDir, 'report.md');
      fs.writeFileSync(filePath, 'const x = 1;');

      const result = await executeReview(`--file ${filePath} --output ${outputPath} --models claude`);

      expect(result.success).toBe(true);
      expect(fs.existsSync(outputPath)).toBe(true);
    });

    it('returns summary with cost', async () => {
      const filePath = path.join(testDir, 'test.js');
      fs.writeFileSync(filePath, 'const x = 1;');

      const result = await executeReview(`--file ${filePath} --models claude`);
      expect(result.summary).toHaveProperty('cost');
      expect(result.summary).toHaveProperty('models');
    });

    it('filters by extension', async () => {
      fs.writeFileSync(path.join(testDir, 'a.js'), 'code');
      fs.writeFileSync(path.join(testDir, 'b.ts'), 'code');

      const result = await executeReview(`--dir ${testDir} --ext .js --models claude`);
      expect(result.summary.files).toBe(1);
    });

    it('uses specified models only', async () => {
      const filePath = path.join(testDir, 'test.js');
      fs.writeFileSync(filePath, 'const x = 1;');

      const result = await executeReview(`--file ${filePath} --models openai`);
      expect(result.summary.models).toContain('openai');
      expect(result.summary.models).not.toContain('claude');
    });

    it('returns error for invalid models', async () => {
      const filePath = path.join(testDir, 'test.js');
      fs.writeFileSync(filePath, 'code');

      const result = await executeReview(`--file ${filePath} --models unknown`);
      expect(result.success).toBe(false);
      expect(result.error).toContain('No valid models');
    });
  });

  describe('formatSummary', () => {
    it('formats summary for display', () => {
      const summary = {
        files: 5,
        issues: 10,
        models: ['claude', 'openai'],
        cost: 0.0234,
      };

      const formatted = formatSummary(summary);

      expect(formatted).toContain('Files reviewed:  5');
      expect(formatted).toContain('Issues found:    10');
      expect(formatted).toContain('claude, openai');
      expect(formatted).toContain('$0.0234');
    });
  });
});
