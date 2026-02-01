/**
 * Refactor Observer Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('RefactorObserver', () => {
  describe('background detection', () => {
    it('detects refactoring opportunities during build', async () => {
      const { RefactorObserver } = await import('./refactor-observer.js');

      const addMock = vi.fn();
      const observer = new RefactorObserver({
        astAnalyzer: {
          analyze: () => ({
            functions: [
              { name: 'complexFn', complexity: 15, lines: 20, line: 10, maxNesting: 3 },
            ],
          }),
        },
        impactScorer: { score: () => ({ total: 75 }) },
        candidatesTracker: { add: addMock },
        debounceMs: 0,
      });

      const opportunities = await observer.observeImmediate(
        'test.js',
        'function complexFn() { /* complex code */ }',
        { operation: 'build' }
      );

      expect(opportunities.length).toBeGreaterThan(0);
      expect(opportunities[0].context).toBe('build');
      expect(addMock).toHaveBeenCalled();
    });

    it('adds to REFACTOR-CANDIDATES.md automatically', async () => {
      const { RefactorObserver } = await import('./refactor-observer.js');

      const addMock = vi.fn();
      const observer = new RefactorObserver({
        astAnalyzer: {
          analyze: () => ({
            functions: [
              { name: 'longFn', complexity: 5, lines: 100, line: 1, maxNesting: 2 },
            ],
          }),
        },
        impactScorer: { score: () => ({ total: 60 }) },
        candidatesTracker: { add: addMock },
        debounceMs: 0,
      });

      await observer.observeImmediate('utils.js', 'code');

      expect(addMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            file: 'utils.js',
            startLine: 1,
            impact: 60,
          }),
        ])
      );
    });
  });

  describe('thresholds', () => {
    it('uses configurable thresholds', async () => {
      const { RefactorObserver } = await import('./refactor-observer.js');

      const observer = new RefactorObserver({
        astAnalyzer: {
          analyze: () => ({
            functions: [
              { name: 'fn', complexity: 8, lines: 40, line: 1, maxNesting: 3 },
            ],
          }),
        },
        impactScorer: { score: () => ({ total: 50 }) },
        candidatesTracker: { add: vi.fn() },
        complexityThreshold: 10, // 8 is below this
        lengthThreshold: 50, // 40 is below this
        debounceMs: 0,
      });

      const opportunities = await observer.observeImmediate('test.js', 'code');

      // No opportunities because values are below thresholds
      expect(opportunities).toHaveLength(0);
    });

    it('detects when above thresholds', async () => {
      const { RefactorObserver } = await import('./refactor-observer.js');

      const observer = new RefactorObserver({
        astAnalyzer: {
          analyze: () => ({
            functions: [
              { name: 'fn', complexity: 12, lines: 60, line: 1, maxNesting: 5 },
            ],
          }),
        },
        impactScorer: { score: () => ({ total: 70 }) },
        candidatesTracker: { add: vi.fn() },
        complexityThreshold: 10,
        lengthThreshold: 50,
        nestingThreshold: 4,
        debounceMs: 0,
      });

      const opportunities = await observer.observeImmediate('test.js', 'code');

      expect(opportunities).toHaveLength(1);
      expect(opportunities[0].issues).toHaveLength(3); // complexity, length, nesting
    });
  });

  describe('impact filtering', () => {
    it('filters by minimum impact score', async () => {
      const { RefactorObserver } = await import('./refactor-observer.js');

      const observer = new RefactorObserver({
        astAnalyzer: {
          analyze: () => ({
            functions: [
              { name: 'fn', complexity: 12, lines: 20, line: 1, maxNesting: 2 },
            ],
          }),
        },
        impactScorer: { score: () => ({ total: 40 }) }, // Below minImpact
        candidatesTracker: { add: vi.fn() },
        minImpact: 50,
        debounceMs: 0,
      });

      const opportunities = await observer.observeImmediate('test.js', 'code');

      expect(opportunities).toHaveLength(0);
    });
  });

  describe('enable/disable', () => {
    it('can be disabled', async () => {
      const { RefactorObserver } = await import('./refactor-observer.js');

      const analyzeMock = vi.fn().mockReturnValue({ functions: [] });
      const observer = new RefactorObserver({
        astAnalyzer: { analyze: analyzeMock },
        impactScorer: { score: () => ({ total: 80 }) },
        candidatesTracker: { add: vi.fn() },
        enabled: false,
        debounceMs: 0,
      });

      await observer.observeImmediate('test.js', 'code');

      expect(analyzeMock).not.toHaveBeenCalled();
    });

    it('can toggle enabled state', async () => {
      const { RefactorObserver } = await import('./refactor-observer.js');

      const observer = new RefactorObserver({
        astAnalyzer: { analyze: () => ({ functions: [] }) },
        impactScorer: { score: () => ({ total: 80 }) },
        candidatesTracker: { add: vi.fn() },
        debounceMs: 0,
      });

      expect(observer.isEnabled()).toBe(true);

      observer.disable();
      expect(observer.isEnabled()).toBe(false);

      observer.enable();
      expect(observer.isEnabled()).toBe(true);
    });
  });

  describe('hooks', () => {
    it('creates build hook', async () => {
      const { RefactorObserver } = await import('./refactor-observer.js');

      const observer = new RefactorObserver({
        astAnalyzer: { analyze: () => ({ functions: [] }) },
        impactScorer: { score: () => ({ total: 80 }) },
        candidatesTracker: { add: vi.fn() },
        debounceMs: 0,
      });

      const hook = observer.createBuildHook();

      expect(hook.name).toBe('refactor-observer');
      expect(typeof hook.afterFileWrite).toBe('function');
    });

    it('creates verify hook', async () => {
      const { RefactorObserver } = await import('./refactor-observer.js');

      const observer = new RefactorObserver({
        astAnalyzer: { analyze: () => ({ functions: [] }) },
        impactScorer: { score: () => ({ total: 80 }) },
        candidatesTracker: { add: vi.fn() },
        debounceMs: 0,
      });

      const hook = observer.createVerifyHook();

      expect(hook.name).toBe('refactor-observer');
      expect(typeof hook.afterVerify).toBe('function');
    });
  });

  describe('batch observation', () => {
    it('observes multiple files', async () => {
      const { RefactorObserver } = await import('./refactor-observer.js');

      let analyzeCount = 0;
      const observer = new RefactorObserver({
        astAnalyzer: {
          analyze: () => {
            analyzeCount++;
            return {
              functions: [
                { name: 'fn', complexity: 12, lines: 20, line: 1, maxNesting: 2 },
              ],
            };
          },
        },
        impactScorer: { score: () => ({ total: 70 }) },
        candidatesTracker: { add: vi.fn() },
        debounceMs: 0,
      });

      const files = [
        { path: 'a.js', content: 'a' },
        { path: 'b.js', content: 'b' },
        { path: 'c.js', content: 'c' },
      ];

      const opportunities = await observer.observeBatch(files);

      expect(analyzeCount).toBe(3);
      expect(opportunities).toHaveLength(3);
    });
  });

  describe('callbacks', () => {
    it('calls onCandidateFound for each opportunity', async () => {
      const { RefactorObserver } = await import('./refactor-observer.js');

      const candidates = [];
      const observer = new RefactorObserver({
        astAnalyzer: {
          analyze: () => ({
            functions: [
              { name: 'fn1', complexity: 12, lines: 20, line: 1, maxNesting: 2 },
              { name: 'fn2', complexity: 15, lines: 30, line: 50, maxNesting: 3 },
            ],
          }),
        },
        impactScorer: { score: () => ({ total: 70 }) },
        candidatesTracker: { add: vi.fn() },
        onCandidateFound: (c) => candidates.push(c),
        debounceMs: 0,
      });

      await observer.observeImmediate('test.js', 'code');

      expect(candidates).toHaveLength(2);
    });
  });

  describe('debouncing', () => {
    it('debounces rapid calls for same file', async () => {
      const { RefactorObserver } = await import('./refactor-observer.js');

      let analyzeCount = 0;
      const observer = new RefactorObserver({
        astAnalyzer: {
          analyze: () => {
            analyzeCount++;
            return { functions: [] };
          },
        },
        impactScorer: { score: () => ({ total: 80 }) },
        candidatesTracker: { add: vi.fn() },
        debounceMs: 50,
      });

      // Rapid calls
      observer.observe('test.js', 'code1');
      observer.observe('test.js', 'code2');
      observer.observe('test.js', 'code3');

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should only analyze once
      expect(analyzeCount).toBe(1);
    });

    it('tracks pending count', async () => {
      const { RefactorObserver } = await import('./refactor-observer.js');

      const observer = new RefactorObserver({
        astAnalyzer: { analyze: () => ({ functions: [] }) },
        impactScorer: { score: () => ({ total: 80 }) },
        candidatesTracker: { add: vi.fn() },
        debounceMs: 100,
      });

      observer.observe('a.js', 'code');
      observer.observe('b.js', 'code');

      expect(observer.getPendingCount()).toBe(2);

      observer.cancelPending();

      expect(observer.getPendingCount()).toBe(0);
    });
  });

  describe('configuration', () => {
    it('can update configuration', async () => {
      const { RefactorObserver } = await import('./refactor-observer.js');

      const observer = new RefactorObserver({
        astAnalyzer: { analyze: () => ({ functions: [] }) },
        impactScorer: { score: () => ({ total: 80 }) },
        candidatesTracker: { add: vi.fn() },
      });

      observer.configure({
        complexityThreshold: 15,
        lengthThreshold: 100,
        minImpact: 70,
      });

      const config = observer.getConfig();

      expect(config.complexityThreshold).toBe(15);
      expect(config.lengthThreshold).toBe(100);
      expect(config.minImpact).toBe(70);
    });

    it('returns current configuration', async () => {
      const { RefactorObserver } = await import('./refactor-observer.js');

      const observer = new RefactorObserver({
        astAnalyzer: { analyze: () => ({ functions: [] }) },
        impactScorer: { score: () => ({ total: 80 }) },
        candidatesTracker: { add: vi.fn() },
        complexityThreshold: 12,
        lengthThreshold: 60,
        nestingThreshold: 5,
        minImpact: 55,
        debounceMs: 200,
      });

      const config = observer.getConfig();

      expect(config).toEqual({
        enabled: true,
        complexityThreshold: 12,
        lengthThreshold: 60,
        nestingThreshold: 5,
        minImpact: 55,
        debounceMs: 200,
      });
    });
  });

  describe('error handling', () => {
    it('silently handles parse errors in background', async () => {
      const { RefactorObserver } = await import('./refactor-observer.js');

      const observer = new RefactorObserver({
        astAnalyzer: {
          analyze: () => {
            throw new Error('Parse error');
          },
        },
        impactScorer: { score: () => ({ total: 80 }) },
        candidatesTracker: { add: vi.fn() },
        debounceMs: 0,
      });

      // Should not throw
      const opportunities = await observer.observeImmediate('test.js', 'invalid code');

      expect(opportunities).toHaveLength(0);
    });
  });

  describe('description generation', () => {
    it('generates human-readable descriptions', async () => {
      const { RefactorObserver } = await import('./refactor-observer.js');

      const observer = new RefactorObserver({
        astAnalyzer: {
          analyze: () => ({
            functions: [
              { name: 'processData', complexity: 15, lines: 80, line: 1, maxNesting: 5 },
            ],
          }),
        },
        impactScorer: { score: () => ({ total: 85 }) },
        candidatesTracker: { add: vi.fn() },
        debounceMs: 0,
      });

      const opportunities = await observer.observeImmediate('data.js', 'code');

      expect(opportunities[0].description).toContain('processData');
      expect(opportunities[0].description).toContain('complexity');
      expect(opportunities[0].description).toContain('long function');
      expect(opportunities[0].description).toContain('nesting');
    });
  });
});
