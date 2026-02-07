/**
 * Visual Command Tests
 *
 * CLI for visual regression testing
 */

import { describe, it, beforeEach } from 'vitest';
const assert = require('node:assert');

const {
  VisualCommand,
  parseArgs,
  formatTestSummary,
} = require('./visual-command.js');

describe('Visual Command', () => {
  let command;
  let mockTester;

  beforeEach(() => {
    mockTester = {
      baselineDir: '/baselines',
      threshold: 0.95,
      _readFile: async (path) => {
        if (path.includes('.json')) {
          return JSON.stringify({ url: 'http://localhost:3000', viewport: { width: 1920, height: 1080 } });
        }
        return 'base64data';
      },
      _saveFile: async () => {},
      _capture: async () => ({ data: 'base64', width: 1920, height: 1080 }),
      visionClient: {
        _call: async () => ({
          differences: [],
          similarity: 1.0,
        }),
      },
    };

    command = new VisualCommand({
      tester: mockTester,
    });
  });

  describe('execute baseline', () => {
    it('creates new baseline', async () => {
      const result = await command.execute('baseline homepage --url http://localhost:3000');

      assert.ok(result.success);
      assert.ok(result.baseline);
    });

    it('creates with viewport', async () => {
      let capturedViewport;
      mockTester._capture = async (url, options) => {
        capturedViewport = options.viewport;
        return { data: 'base64', width: 375, height: 812 };
      };

      await command.execute('baseline mobile --url http://localhost:3000 --viewport 375x812');

      assert.strictEqual(capturedViewport.width, 375);
      assert.strictEqual(capturedViewport.height, 812);
    });

    it('captures specific element', async () => {
      let capturedSelector;
      mockTester._capture = async (url, options) => {
        capturedSelector = options.selector;
        return { data: 'base64', width: 300, height: 200 };
      };

      await command.execute('baseline header --url http://localhost:3000 --selector header');

      assert.strictEqual(capturedSelector, 'header');
    });
  });

  describe('execute test', () => {
    it('runs visual comparison', async () => {
      const result = await command.execute('test homepage --url http://localhost:3000');

      assert.ok(result.success !== undefined);
      assert.ok(result.pass !== undefined);
    });

    it('reports pass/fail', async () => {
      mockTester.visionClient._call = async () => ({
        differences: [],
        similarity: 1.0,
      });

      const result = await command.execute('test homepage --url http://localhost:3000');

      assert.ok(result.pass);
    });

    it('reports differences on fail', async () => {
      mockTester.visionClient._call = async () => ({
        differences: [{ description: 'Button color changed' }],
        similarity: 0.85,
      });

      const result = await command.execute('test homepage --url http://localhost:3000');

      assert.strictEqual(result.pass, false);
      assert.ok(result.differences);
    });
  });

  describe('execute approve', () => {
    it('updates baseline with current', async () => {
      let updated = false;
      mockTester._saveFile = async () => {
        updated = true;
      };

      const result = await command.execute('approve homepage');

      assert.ok(result.success);
      assert.ok(updated);
    });
  });

  describe('execute list', () => {
    it('lists all baselines', async () => {
      mockTester._listFiles = async () => [
        'homepage.png',
        'login.png',
        'checkout.png',
      ];

      const result = await command.execute('list');

      assert.ok(result.success);
      assert.ok(result.baselines);
      assert.strictEqual(result.baselines.length, 3);
    });
  });

  describe('execute run', () => {
    it('runs all visual tests', async () => {
      mockTester._listFiles = async () => [
        'homepage.png',
        'login.png',
      ];
      mockTester._readFile = async (path) => {
        if (path.includes('.json')) {
          return JSON.stringify({ url: 'http://localhost:3000' });
        }
        return 'base64data';
      };

      const result = await command.execute('run');

      assert.ok(result.success);
      assert.ok(result.results);
    });

    it('filters by pattern', async () => {
      mockTester._listFiles = async () => [
        'homepage.png',
        'homepage-mobile.png',
        'login.png',
      ];
      mockTester._readFile = async (path) => {
        if (path.includes('.json')) {
          return JSON.stringify({ url: 'http://localhost:3000' });
        }
        return 'base64data';
      };

      const result = await command.execute('run --pattern homepage');

      // Should only run homepage tests
      assert.ok(result.results.every(r => r.name.includes('homepage')));
    });
  });

  describe('parseArgs', () => {
    it('parses baseline command', () => {
      const parsed = parseArgs('baseline homepage --url http://localhost:3000');

      assert.strictEqual(parsed.command, 'baseline');
      assert.strictEqual(parsed.name, 'homepage');
      assert.strictEqual(parsed.url, 'http://localhost:3000');
    });

    it('parses test command', () => {
      const parsed = parseArgs('test login --url http://localhost:3000/login');

      assert.strictEqual(parsed.command, 'test');
      assert.strictEqual(parsed.name, 'login');
    });

    it('parses viewport option', () => {
      const parsed = parseArgs('baseline mobile --url http://localhost:3000 --viewport 375x812');

      assert.strictEqual(parsed.viewport, '375x812');
    });

    it('parses selector option', () => {
      const parsed = parseArgs('baseline hero --url http://localhost:3000 --selector .hero');

      assert.strictEqual(parsed.selector, '.hero');
    });

    it('parses threshold option', () => {
      const parsed = parseArgs('test strict --url http://localhost:3000 --threshold 0.99');

      assert.strictEqual(parsed.threshold, '0.99');
    });

    it('parses pattern option', () => {
      const parsed = parseArgs('run --pattern checkout');

      assert.strictEqual(parsed.pattern, 'checkout');
    });
  });

  describe('formatTestSummary', () => {
    it('formats all passing', () => {
      const results = [
        { name: 'homepage', pass: true, similarity: 1.0 },
        { name: 'login', pass: true, similarity: 0.99 },
      ];

      const summary = formatTestSummary(results);

      assert.ok(summary.includes('2'));
      assert.ok(summary.includes('pass') || summary.includes('PASS'));
    });

    it('formats failures', () => {
      const results = [
        { name: 'homepage', pass: true },
        { name: 'checkout', pass: false, similarity: 0.85 },
      ];

      const summary = formatTestSummary(results);

      assert.ok(summary.includes('checkout'));
      assert.ok(summary.includes('1') && (summary.includes('fail') || summary.includes('FAIL')));
    });

    it('shows timing', () => {
      const results = [
        { name: 'test', pass: true, duration: 1500 },
      ];

      const summary = formatTestSummary(results, { showTiming: true });

      assert.ok(summary.includes('1500') || summary.includes('1.5'));
    });
  });
});
