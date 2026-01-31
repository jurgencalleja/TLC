import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ReviewOrchestrator } from './review-orchestrator.js';

// Create mock adapter
const createMockAdapter = (name, issues = [], options = {}) => ({
  name,
  canAfford: vi.fn(() => options.canAfford !== false),
  getUsage: vi.fn(() => options.usage || { daily: 0, monthly: 0, requests: 0 }),
  review: vi.fn(() => Promise.resolve({
    issues,
    suggestions: options.suggestions || [],
    score: options.score || 80,
    model: name,
    tokensUsed: 100,
    cost: options.cost || 0.01,
  })),
});

describe('ReviewOrchestrator', () => {
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-review-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('initializes with adapters', () => {
      const adapters = [createMockAdapter('claude')];
      const orchestrator = new ReviewOrchestrator(adapters);
      expect(orchestrator.adapters).toHaveLength(1);
    });

    it('accepts options', () => {
      const adapters = [createMockAdapter('claude')];
      const orchestrator = new ReviewOrchestrator(adapters, { consensusType: 'unanimous' });
      expect(orchestrator.options.consensusType).toBe('unanimous');
    });
  });

  describe('reviewFile', () => {
    it('reviews a single file', async () => {
      const filePath = path.join(testDir, 'test.js');
      fs.writeFileSync(filePath, 'const x = 1;');

      const adapters = [createMockAdapter('claude', [{ id: 'A', severity: 'high', message: 'Issue' }])];
      const orchestrator = new ReviewOrchestrator(adapters, { requireMinimum: 1 });

      const result = await orchestrator.reviewFile(filePath);

      expect(result.file).toBe(filePath);
      expect(result.issues).toHaveLength(1);
    });

    it('returns error for non-existent file', async () => {
      const adapters = [createMockAdapter('claude')];
      const orchestrator = new ReviewOrchestrator(adapters);

      const result = await orchestrator.reviewFile('/nonexistent/file.js');

      expect(result.error).toBeTruthy();
      expect(result.issues).toEqual([]);
    });

    it('skips files over size limit', async () => {
      const filePath = path.join(testDir, 'large.js');
      fs.writeFileSync(filePath, 'x'.repeat(200 * 1024)); // 200KB

      const adapters = [createMockAdapter('claude')];
      const orchestrator = new ReviewOrchestrator(adapters, { maxFileSizeKB: 100 });

      const result = await orchestrator.reviewFile(filePath);

      expect(result.warning).toContain('too large');
      expect(result.issues).toEqual([]);
    });

    it('tracks costs', async () => {
      const filePath = path.join(testDir, 'test.js');
      fs.writeFileSync(filePath, 'const x = 1;');

      const adapters = [
        createMockAdapter('claude', [], { cost: 0.01 }),
        createMockAdapter('openai', [], { cost: 0.02 }),
      ];
      const orchestrator = new ReviewOrchestrator(adapters, { requireMinimum: 1 });

      const result = await orchestrator.reviewFile(filePath);

      expect(result.costs.total).toBeCloseTo(0.03, 2);
    });

    it('includes models used', async () => {
      const filePath = path.join(testDir, 'test.js');
      fs.writeFileSync(filePath, 'const x = 1;');

      const adapters = [
        createMockAdapter('claude'),
        createMockAdapter('openai'),
      ];
      const orchestrator = new ReviewOrchestrator(adapters, { requireMinimum: 1 });

      const result = await orchestrator.reviewFile(filePath);

      expect(result.models).toContain('claude');
      expect(result.models).toContain('openai');
    });
  });

  describe('reviewFiles', () => {
    it('reviews multiple files', async () => {
      fs.writeFileSync(path.join(testDir, 'a.js'), 'code a');
      fs.writeFileSync(path.join(testDir, 'b.js'), 'code b');

      const adapters = [createMockAdapter('claude', [{ id: 'A', message: 'Issue' }])];
      const orchestrator = new ReviewOrchestrator(adapters, { requireMinimum: 1 });

      const result = await orchestrator.reviewFiles([
        path.join(testDir, 'a.js'),
        path.join(testDir, 'b.js'),
      ]);

      expect(result.files).toHaveLength(2);
      expect(result.fileResults).toHaveLength(2);
    });

    it('aggregates costs across files', async () => {
      fs.writeFileSync(path.join(testDir, 'a.js'), 'code');
      fs.writeFileSync(path.join(testDir, 'b.js'), 'code');

      const adapters = [createMockAdapter('claude', [], { cost: 0.01 })];
      const orchestrator = new ReviewOrchestrator(adapters, { requireMinimum: 1 });

      const result = await orchestrator.reviewFiles([
        path.join(testDir, 'a.js'),
        path.join(testDir, 'b.js'),
      ]);

      expect(result.totalCost).toBeCloseTo(0.02, 2);
    });

    it('counts total issues', async () => {
      fs.writeFileSync(path.join(testDir, 'a.js'), 'code');
      fs.writeFileSync(path.join(testDir, 'b.js'), 'code');

      const adapters = [createMockAdapter('claude', [
        { id: 'A', message: 'Issue A' },
        { id: 'B', message: 'Issue B' },
      ])];
      const orchestrator = new ReviewOrchestrator(adapters, { requireMinimum: 1 });

      const result = await orchestrator.reviewFiles([
        path.join(testDir, 'a.js'),
        path.join(testDir, 'b.js'),
      ]);

      expect(result.totalIssues).toBe(4); // 2 issues per file
    });
  });

  describe('reviewDirectory', () => {
    it('reviews all files in directory', async () => {
      fs.writeFileSync(path.join(testDir, 'a.js'), 'code');
      fs.writeFileSync(path.join(testDir, 'b.js'), 'code');

      const adapters = [createMockAdapter('claude')];
      const orchestrator = new ReviewOrchestrator(adapters, { requireMinimum: 1 });

      const result = await orchestrator.reviewDirectory(testDir);

      expect(result.files).toHaveLength(2);
    });

    it('returns error for invalid directory', async () => {
      const adapters = [createMockAdapter('claude')];
      const orchestrator = new ReviewOrchestrator(adapters);

      const result = await orchestrator.reviewDirectory('/nonexistent');

      expect(result.error).toBeTruthy();
    });

    it('returns warning for empty directory', async () => {
      const adapters = [createMockAdapter('claude')];
      const orchestrator = new ReviewOrchestrator(adapters);

      const result = await orchestrator.reviewDirectory(testDir);

      expect(result.warning).toContain('No files');
    });

    it('respects extension filter', async () => {
      fs.writeFileSync(path.join(testDir, 'a.js'), 'code');
      fs.writeFileSync(path.join(testDir, 'b.ts'), 'code');
      fs.writeFileSync(path.join(testDir, 'c.css'), 'code');

      const adapters = [createMockAdapter('claude')];
      const orchestrator = new ReviewOrchestrator(adapters, { requireMinimum: 1 });

      const result = await orchestrator.reviewDirectory(testDir, { extensions: ['.js'] });

      expect(result.files).toHaveLength(1);
    });
  });

  describe('summarizeResults', () => {
    it('calculates average confidence', () => {
      const adapters = [createMockAdapter('claude')];
      const orchestrator = new ReviewOrchestrator(adapters);

      // Provide pre-formed results with known confidence values
      const fileResults = [
        {
          file: 'a.js',
          issues: [
            { id: 'A', message: 'Issue', confidence: 0.8 },
            { id: 'B', message: 'Issue 2', confidence: 0.6 },
          ],
        },
      ];

      const summary = orchestrator.summarizeResults(fileResults, ['claude'], { byModel: {}, total: 0 });

      expect(summary.averageConfidence).toBeCloseTo(0.7, 1);
    });

    it('handles files with no issues', () => {
      const adapters = [createMockAdapter('claude')];
      const orchestrator = new ReviewOrchestrator(adapters);

      const fileResults = [{ file: 'a.js', issues: [] }];
      const summary = orchestrator.summarizeResults(fileResults, ['claude'], { byModel: {}, total: 0 });

      expect(summary.averageConfidence).toBe(0);
    });
  });

  describe('getAvailableModels', () => {
    it('returns all models when budgetAware is false', () => {
      const adapters = [
        createMockAdapter('claude', [], { canAfford: false }),
        createMockAdapter('openai', [], { canAfford: true }),
      ];
      const orchestrator = new ReviewOrchestrator(adapters, { budgetAware: false });

      const models = orchestrator.getAvailableModels();
      expect(models).toEqual(['claude', 'openai']);
    });

    it('returns only affordable models when budgetAware is true', () => {
      const adapters = [
        createMockAdapter('claude', [], { canAfford: false }),
        createMockAdapter('openai', [], { canAfford: true }),
      ];
      const orchestrator = new ReviewOrchestrator(adapters, { budgetAware: true });

      const models = orchestrator.getAvailableModels();
      expect(models).toEqual(['openai']);
    });
  });

  describe('getUsageSummary', () => {
    it('returns usage for all adapters', () => {
      const adapters = [
        createMockAdapter('claude', [], { usage: { daily: 1, monthly: 10, requests: 5 } }),
        createMockAdapter('openai', [], { usage: { daily: 2, monthly: 20, requests: 10 } }),
      ];
      const orchestrator = new ReviewOrchestrator(adapters);

      const usage = orchestrator.getUsageSummary();

      expect(usage.claude.daily).toBe(1);
      expect(usage.openai.daily).toBe(2);
    });
  });

  describe('aggregateSuggestions', () => {
    it('combines unique suggestions', () => {
      const adapters = [createMockAdapter('claude')];
      const orchestrator = new ReviewOrchestrator(adapters);

      const reviews = [
        { suggestions: ['A', 'B'] },
        { suggestions: ['B', 'C'] },
      ];

      const suggestions = orchestrator.aggregateSuggestions(reviews);
      expect(suggestions).toHaveLength(3);
      expect(suggestions).toContain('A');
      expect(suggestions).toContain('B');
      expect(suggestions).toContain('C');
    });
  });
});
