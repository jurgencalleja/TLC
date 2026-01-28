import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  DEFAULT_OUTPUT_DIR,
  simpleGlob,
  formatSize,
  runDocsCommand,
  parseArgs,
  getHelpText,
  docsCommand,
} from './docs-command.js';

describe('docs-command', () => {
  describe('DEFAULT_OUTPUT_DIR', () => {
    it('has default value', () => {
      expect(DEFAULT_OUTPUT_DIR).toBe('docs/api');
    });
  });

  describe('formatSize', () => {
    it('formats bytes', () => {
      expect(formatSize(500)).toBe('500 B');
    });

    it('formats kilobytes', () => {
      expect(formatSize(2048)).toBe('2.0 KB');
    });

    it('formats megabytes', () => {
      expect(formatSize(2 * 1024 * 1024)).toBe('2.0 MB');
    });
  });

  describe('parseArgs', () => {
    it('parses empty args', () => {
      const options = parseArgs('');
      expect(options).toEqual({});
    });

    it('parses output dir', () => {
      expect(parseArgs('--output api-docs').outputDir).toBe('api-docs');
      expect(parseArgs('-o api-docs').outputDir).toBe('api-docs');
    });

    it('parses format', () => {
      expect(parseArgs('--format yaml').format).toBe('yaml');
      expect(parseArgs('-f json').format).toBe('json');
    });

    it('parses title', () => {
      expect(parseArgs('--title MyAPI').title).toBe('MyAPI');
      expect(parseArgs('-t MyAPI').title).toBe('MyAPI');
    });

    it('parses version', () => {
      expect(parseArgs('--version 2.0.0').version).toBe('2.0.0');
      expect(parseArgs('-v 2.0.0').version).toBe('2.0.0');
    });

    it('parses base URL', () => {
      expect(parseArgs('--base-url https://api.example.com').baseUrl).toBe('https://api.example.com');
      expect(parseArgs('-b https://api.example.com').baseUrl).toBe('https://api.example.com');
    });

    it('parses verbose', () => {
      expect(parseArgs('--verbose').verbose).toBe(true);
    });

    it('parses help', () => {
      expect(parseArgs('--help').help).toBe(true);
      expect(parseArgs('-h').help).toBe(true);
    });

    it('parses multiple options', () => {
      const options = parseArgs('-o output -f yaml -t API -v 1.0.0');
      expect(options.outputDir).toBe('output');
      expect(options.format).toBe('yaml');
      expect(options.title).toBe('API');
      expect(options.version).toBe('1.0.0');
    });
  });

  describe('getHelpText', () => {
    it('returns help text', () => {
      const help = getHelpText();
      expect(help).toContain('/tlc:docs');
      expect(help).toContain('--output');
      expect(help).toContain('--format');
      expect(help).toContain('Examples');
    });

    it('documents all options', () => {
      const help = getHelpText();
      expect(help).toContain('-o');
      expect(help).toContain('-f');
      expect(help).toContain('-t');
      expect(help).toContain('-v');
      expect(help).toContain('-b');
      expect(help).toContain('-h');
    });
  });

  describe('simpleGlob', () => {
    it('returns empty for non-existent directory', async () => {
      const results = await simpleGlob('**/*.js', { cwd: '/nonexistent-path-12345' });
      expect(results).toEqual([]);
    });
  });

  describe('docsCommand', () => {
    it('returns help when --help flag', async () => {
      const result = await docsCommand('--help');
      expect(result.success).toBe(true);
      expect(result.message).toContain('/tlc:docs');
    });

    it('returns help when -h flag', async () => {
      const result = await docsCommand('-h');
      expect(result.success).toBe(true);
      expect(result.message).toContain('Usage');
    });
  });

  describe('runDocsCommand', () => {
    const testDir = '/tmp/tlc-docs-test-' + Date.now();

    beforeEach(() => {
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }
    });

    afterEach(() => {
      try {
        fs.rmSync(testDir, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    });

    it('generates docs in output directory', async () => {
      const outputDir = path.join(testDir, 'api-docs');

      const result = await runDocsCommand({
        baseDir: testDir,
        outputDir,
      });

      expect(result.success).toBe(true);
      expect(result.files.length).toBeGreaterThan(0);
      expect(fs.existsSync(outputDir)).toBe(true);
    });

    it('creates openapi.json', async () => {
      const outputDir = path.join(testDir, 'docs');

      await runDocsCommand({
        baseDir: testDir,
        outputDir,
        format: 'json',
      });

      expect(fs.existsSync(path.join(outputDir, 'openapi.json'))).toBe(true);
    });

    it('creates openapi.yaml', async () => {
      const outputDir = path.join(testDir, 'docs');

      await runDocsCommand({
        baseDir: testDir,
        outputDir,
        format: 'yaml',
      });

      expect(fs.existsSync(path.join(outputDir, 'openapi.yaml'))).toBe(true);
    });

    it('creates examples.json', async () => {
      const outputDir = path.join(testDir, 'docs');

      await runDocsCommand({
        baseDir: testDir,
        outputDir,
      });

      expect(fs.existsSync(path.join(outputDir, 'examples.json'))).toBe(true);
    });

    it('creates docs-report.json', async () => {
      const outputDir = path.join(testDir, 'docs');

      await runDocsCommand({
        baseDir: testDir,
        outputDir,
      });

      expect(fs.existsSync(path.join(outputDir, 'docs-report.json'))).toBe(true);
    });

    it('uses custom title', async () => {
      const outputDir = path.join(testDir, 'docs');

      await runDocsCommand({
        baseDir: testDir,
        outputDir,
        title: 'My Custom API',
        format: 'json',
      });

      const spec = JSON.parse(fs.readFileSync(path.join(outputDir, 'openapi.json'), 'utf-8'));
      expect(spec.info.title).toBe('My Custom API');
    });

    it('uses custom version', async () => {
      const outputDir = path.join(testDir, 'docs');

      await runDocsCommand({
        baseDir: testDir,
        outputDir,
        version: '2.5.0',
        format: 'json',
      });

      const spec = JSON.parse(fs.readFileSync(path.join(outputDir, 'openapi.json'), 'utf-8'));
      expect(spec.info.version).toBe('2.5.0');
    });

    it('uses custom base URL', async () => {
      const outputDir = path.join(testDir, 'docs');

      await runDocsCommand({
        baseDir: testDir,
        outputDir,
        baseUrl: 'https://api.example.com',
        format: 'json',
      });

      const spec = JSON.parse(fs.readFileSync(path.join(outputDir, 'openapi.json'), 'utf-8'));
      expect(spec.servers[0].url).toBe('https://api.example.com');
    });

    it('returns report with stats', async () => {
      const outputDir = path.join(testDir, 'docs');

      const result = await runDocsCommand({
        baseDir: testDir,
        outputDir,
      });

      expect(result.report).toBeDefined();
      expect(result.report.totalRoutes).toBeDefined();
      expect(result.report.routeFiles).toBeDefined();
    });

    it('includes message with summary', async () => {
      const outputDir = path.join(testDir, 'docs');

      const result = await runDocsCommand({
        baseDir: testDir,
        outputDir,
      });

      expect(result.message).toContain('Generated');
      expect(result.message).toContain('Routes');
      expect(result.message).toContain('Output');
    });
  });
});
