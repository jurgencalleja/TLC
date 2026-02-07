/**
 * Visual Testing Tests
 *
 * Automated visual regression testing
 */

import { describe, it, beforeEach } from 'vitest';
const assert = require('node:assert');

const {
  createVisualTester,
  captureScreenshot,
  compareScreenshots,
  analyzeVisualDiff,
  createBaseline,
  updateBaseline,
  getBaseline,
  runVisualTest,
  formatVisualReport,
} = require('./visual-testing.js');

describe('Visual Testing', () => {
  let tester;
  let mockVisionClient;

  beforeEach(() => {
    mockVisionClient = {
      _call: async () => ({
        differences: [],
        similarity: 1.0,
      }),
    };

    tester = createVisualTester({
      visionClient: mockVisionClient,
      baselineDir: '/baselines',
    });
  });

  describe('createVisualTester', () => {
    it('creates tester with config', () => {
      assert.ok(tester);
      assert.ok(tester.baselineDir);
    });

    it('accepts threshold option', () => {
      const customTester = createVisualTester({
        visionClient: mockVisionClient,
        threshold: 0.05,
      });

      assert.strictEqual(customTester.threshold, 0.05);
    });
  });

  describe('captureScreenshot', () => {
    it('captures URL screenshot', async () => {
      // Mock browser capture
      tester._capture = async (url) => ({
        data: 'base64imagedata',
        width: 1920,
        height: 1080,
      });

      const result = await captureScreenshot(tester, {
        url: 'http://localhost:3000',
      });

      assert.ok(result.data);
      assert.ok(result.width);
    });

    it('captures with viewport size', async () => {
      let capturedViewport;
      tester._capture = async (url, options) => {
        capturedViewport = options.viewport;
        return { data: 'base64', width: 768, height: 1024 };
      };

      await captureScreenshot(tester, {
        url: 'http://localhost:3000',
        viewport: { width: 768, height: 1024 },
      });

      assert.strictEqual(capturedViewport.width, 768);
    });

    it('captures element only', async () => {
      let capturedSelector;
      tester._capture = async (url, options) => {
        capturedSelector = options.selector;
        return { data: 'base64', width: 200, height: 100 };
      };

      await captureScreenshot(tester, {
        url: 'http://localhost:3000',
        selector: '.hero-section',
      });

      assert.strictEqual(capturedSelector, '.hero-section');
    });
  });

  describe('compareScreenshots', () => {
    it('returns similarity score', async () => {
      const result = await compareScreenshots(tester, {
        baseline: 'baseline.png',
        current: 'current.png',
      });

      assert.ok(result.similarity !== undefined);
      assert.ok(result.similarity >= 0 && result.similarity <= 1);
    });

    it('identifies pixel differences', async () => {
      mockVisionClient._call = async () => ({
        differences: [
          { x: 100, y: 200, width: 50, height: 30 },
        ],
        similarity: 0.95,
      });

      const result = await compareScreenshots(tester, {
        baseline: 'baseline.png',
        current: 'current.png',
      });

      assert.ok(result.differences);
      assert.ok(result.differences.length > 0);
    });

    it('reports pass when identical', async () => {
      mockVisionClient._call = async () => ({
        differences: [],
        similarity: 1.0,
      });

      const result = await compareScreenshots(tester, {
        baseline: 'baseline.png',
        current: 'current.png',
      });

      assert.strictEqual(result.pass, true);
    });
  });

  describe('analyzeVisualDiff', () => {
    it('classifies meaningful changes', async () => {
      mockVisionClient._call = async () => ({
        analysis: [
          { type: 'content', description: 'Text changed', severity: 'high' },
          { type: 'style', description: 'Color adjusted', severity: 'low' },
        ],
      });

      const result = await analyzeVisualDiff(tester, {
        baseline: 'baseline.png',
        current: 'current.png',
      });

      assert.ok(result.analysis);
      assert.ok(result.analysis.some(a => a.type === 'content'));
    });

    it('filters noise', async () => {
      mockVisionClient._call = async () => ({
        analysis: [
          { type: 'noise', description: 'Anti-aliasing difference', severity: 'none' },
        ],
        meaningfulChanges: 0,
      });

      const result = await analyzeVisualDiff(tester, {
        baseline: 'baseline.png',
        current: 'current.png',
      });

      assert.strictEqual(result.meaningfulChanges, 0);
    });
  });

  describe('createBaseline', () => {
    it('saves baseline image', async () => {
      let savedPath;
      tester._saveFile = async (path, data) => {
        savedPath = path;
      };
      tester._capture = async () => ({ data: 'base64', width: 1920, height: 1080 });

      await createBaseline(tester, {
        name: 'homepage',
        url: 'http://localhost:3000',
      });

      assert.ok(savedPath.includes('homepage'));
    });

    it('stores metadata', async () => {
      let savedMetadata;
      tester._saveFile = async (path, data) => {
        if (path.includes('.json')) {
          savedMetadata = JSON.parse(data);
        }
      };
      tester._capture = async () => ({ data: 'base64', width: 1920, height: 1080 });

      await createBaseline(tester, {
        name: 'homepage',
        url: 'http://localhost:3000',
        viewport: { width: 1920, height: 1080 },
      });

      assert.ok(savedMetadata);
      assert.ok(savedMetadata.viewport);
    });
  });

  describe('updateBaseline', () => {
    it('replaces existing baseline', async () => {
      let updatedPath;
      tester._saveFile = async (path, data) => {
        updatedPath = path;
      };
      tester._readFile = async () => JSON.stringify({ url: 'http://localhost:3000' });
      tester._capture = async () => ({ data: 'newbase64', width: 1920, height: 1080 });

      await updateBaseline(tester, {
        name: 'homepage',
      });

      assert.ok(updatedPath.includes('homepage'));
    });
  });

  describe('getBaseline', () => {
    it('loads baseline data', async () => {
      tester._readFile = async (path) => {
        if (path.includes('.json')) {
          return JSON.stringify({ url: 'http://localhost:3000', created: '2025-01-01' });
        }
        return 'base64imagedata';
      };

      const baseline = await getBaseline(tester, { name: 'homepage' });

      assert.ok(baseline);
      assert.ok(baseline.metadata);
    });

    it('returns null for missing baseline', async () => {
      tester._readFile = async () => {
        throw new Error('File not found');
      };

      const baseline = await getBaseline(tester, { name: 'nonexistent' });

      assert.strictEqual(baseline, null);
    });
  });

  describe('runVisualTest', () => {
    it('compares against baseline', async () => {
      tester._readFile = async (path) => {
        if (path.includes('.json')) {
          return JSON.stringify({ url: 'http://localhost:3000', viewport: { width: 1920, height: 1080 } });
        }
        return 'base64baselinedata';
      };
      tester._capture = async () => ({ data: 'base64currentdata', width: 1920, height: 1080 });
      mockVisionClient._call = async () => ({
        differences: [],
        similarity: 1.0,
      });

      const result = await runVisualTest(tester, {
        name: 'homepage',
        url: 'http://localhost:3000',
      });

      assert.ok(result.pass);
    });

    it('fails on significant difference', async () => {
      tester._readFile = async () => 'base64baselinedata';
      tester._capture = async () => ({ data: 'differentdata', width: 1920, height: 1080 });
      mockVisionClient._call = async () => ({
        differences: [{ x: 0, y: 0, width: 100, height: 100 }],
        similarity: 0.7,
      });
      tester.threshold = 0.95;

      const result = await runVisualTest(tester, {
        name: 'homepage',
        url: 'http://localhost:3000',
      });

      assert.strictEqual(result.pass, false);
    });

    it('creates baseline if missing', async () => {
      let created = false;
      tester._readFile = async () => {
        throw new Error('Not found');
      };
      tester._capture = async () => ({ data: 'base64', width: 1920, height: 1080 });
      tester._saveFile = async () => {
        created = true;
      };

      const result = await runVisualTest(tester, {
        name: 'new-page',
        url: 'http://localhost:3000/new',
        createIfMissing: true,
      });

      assert.ok(created);
      assert.ok(result.baselineCreated);
    });
  });

  describe('formatVisualReport', () => {
    it('formats passing tests', () => {
      const results = [
        { name: 'homepage', pass: true, similarity: 1.0 },
        { name: 'login', pass: true, similarity: 0.99 },
      ];

      const report = formatVisualReport(results);

      assert.ok(report.includes('homepage'));
      assert.ok(report.includes('PASS') || report.includes('pass'));
    });

    it('formats failing tests', () => {
      const results = [
        { name: 'checkout', pass: false, similarity: 0.85, differences: [{ description: 'Button moved' }] },
      ];

      const report = formatVisualReport(results);

      assert.ok(report.includes('checkout'));
      assert.ok(report.includes('FAIL') || report.includes('fail'));
    });

    it('shows summary', () => {
      const results = [
        { name: 'test1', pass: true },
        { name: 'test2', pass: true },
        { name: 'test3', pass: false },
      ];

      const report = formatVisualReport(results);

      assert.ok(report.includes('2') && report.includes('1')); // 2 pass, 1 fail
    });
  });
});
