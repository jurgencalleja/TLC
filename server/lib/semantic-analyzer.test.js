/**
 * Semantic Analyzer Tests
 * Task 3: Use AI to detect naming issues and semantic problems
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('SemanticAnalyzer', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('poor naming detection', () => {
    it('flags single-letter variable names', async () => {
      const { SemanticAnalyzer } = await import('./semantic-analyzer.js');

      const mockAdapter = {
        name: 'mock',
        canAfford: () => true,
        review: vi.fn().mockResolvedValue({
          model: 'mock',
          issues: [
            {
              type: 'naming',
              severity: 'warning',
              message: "Variable 'x' has unclear name",
              line: 2,
              suggestion: 'Consider renaming to a descriptive name like userCount',
            },
          ],
          cost: 0.001,
        }),
      };

      const analyzer = new SemanticAnalyzer({ adapters: [mockAdapter] });

      const code = `
        function process(x) {
          const y = x * 2;
          return y;
        }
      `;

      const result = await analyzer.analyze(code, 'test.js');

      expect(result.issues.some(i => i.type === 'naming')).toBe(true);
      expect(result.issues.some(i => i.message.includes('x'))).toBe(true);
    });

    it('flags cryptic function names', async () => {
      const { SemanticAnalyzer } = await import('./semantic-analyzer.js');

      const mockAdapter = {
        name: 'mock',
        canAfford: () => true,
        review: vi.fn().mockResolvedValue({
          model: 'mock',
          issues: [
            {
              type: 'naming',
              severity: 'warning',
              message: "Function 'fn1' has unclear name",
              line: 1,
              suggestion: 'Rename to describe what it does, e.g., calculateTotal',
            },
            {
              type: 'naming',
              severity: 'warning',
              message: "Function 'doIt' is too vague",
              line: 5,
              suggestion: 'Be specific about what action is performed',
            },
          ],
          cost: 0.001,
        }),
      };

      const analyzer = new SemanticAnalyzer({ adapters: [mockAdapter] });

      const code = `
        function fn1() { return 1; }
        function doIt() { return 2; }
        function proc() { return 3; }
      `;

      const result = await analyzer.analyze(code, 'test.js');

      expect(result.issues.some(i => i.message.includes('fn1'))).toBe(true);
      expect(result.issues.some(i => i.message.includes('doIt'))).toBe(true);
    });

    it('suggests descriptive alternatives', async () => {
      const { SemanticAnalyzer } = await import('./semantic-analyzer.js');

      const mockAdapter = {
        name: 'mock',
        canAfford: () => true,
        review: vi.fn().mockResolvedValue({
          model: 'mock',
          issues: [
            {
              type: 'naming',
              severity: 'warning',
              message: "Variable 'd' in date context",
              line: 2,
              suggestion: 'Rename to currentDate or dateValue',
            },
          ],
          cost: 0.001,
        }),
      };

      const analyzer = new SemanticAnalyzer({ adapters: [mockAdapter] });

      const code = `
        function formatDate(d) {
          return d.toISOString();
        }
      `;

      const result = await analyzer.analyze(code, 'test.js');

      expect(result.issues[0].suggestion).toBeDefined();
      expect(result.issues[0].suggestion.length).toBeGreaterThan(0);
    });
  });

  describe('unclear function purpose', () => {
    it('identifies unclear function purposes', async () => {
      const { SemanticAnalyzer } = await import('./semantic-analyzer.js');

      const mockAdapter = {
        name: 'mock',
        canAfford: () => true,
        review: vi.fn().mockResolvedValue({
          model: 'mock',
          issues: [
            {
              type: 'clarity',
              severity: 'info',
              message: 'Function does multiple unrelated things',
              line: 1,
              suggestion: 'Consider splitting into separate functions',
            },
          ],
          cost: 0.001,
        }),
      };

      const analyzer = new SemanticAnalyzer({ adapters: [mockAdapter] });

      const code = `
        function handle(data) {
          validate(data);
          save(data);
          notify(data);
          log(data);
          return transform(data);
        }
      `;

      const result = await analyzer.analyze(code, 'test.js');

      expect(result.issues.some(i => i.type === 'clarity')).toBe(true);
    });
  });

  describe('multi-model consensus', () => {
    it('uses consensus engine for multi-model analysis', async () => {
      const { SemanticAnalyzer } = await import('./semantic-analyzer.js');

      const adapter1 = {
        name: 'model1',
        canAfford: () => true,
        review: vi.fn().mockResolvedValue({
          model: 'model1',
          issues: [
            { type: 'naming', message: "Variable 'x' unclear", line: 1 },
          ],
          cost: 0.01,
        }),
      };

      const adapter2 = {
        name: 'model2',
        canAfford: () => true,
        review: vi.fn().mockResolvedValue({
          model: 'model2',
          issues: [
            { type: 'naming', message: "Variable 'x' unclear", line: 1 },
            { type: 'naming', message: "Variable 'y' unclear", line: 2 },
          ],
          cost: 0.02,
        }),
      };

      const analyzer = new SemanticAnalyzer({
        adapters: [adapter1, adapter2],
        useConsensus: true,
      });

      const code = 'const x = 1; const y = 2;';
      const result = await analyzer.analyze(code, 'test.js');

      expect(result.consensus).toBeDefined();
      expect(result.consensus.issues.length).toBeGreaterThan(0);

      // Issue found by both models should have higher confidence
      const xIssue = result.consensus.issues.find(i => i.message.includes('x'));
      expect(xIssue.confidence).toBe(1); // 2/2 models
    });

    it('shows confidence scores based on agreement', async () => {
      const { SemanticAnalyzer } = await import('./semantic-analyzer.js');

      const adapter1 = {
        name: 'model1',
        canAfford: () => true,
        review: vi.fn().mockResolvedValue({
          model: 'model1',
          issues: [
            { type: 'naming', message: 'Issue A', line: 1 },
          ],
          cost: 0.01,
        }),
      };

      const adapter2 = {
        name: 'model2',
        canAfford: () => true,
        review: vi.fn().mockResolvedValue({
          model: 'model2',
          issues: [
            { type: 'naming', message: 'Issue A', line: 1 },
            { type: 'naming', message: 'Issue B', line: 2 },
          ],
          cost: 0.02,
        }),
      };

      const adapter3 = {
        name: 'model3',
        canAfford: () => true,
        review: vi.fn().mockResolvedValue({
          model: 'model3',
          issues: [
            { type: 'naming', message: 'Issue A', line: 1 },
          ],
          cost: 0.015,
        }),
      };

      const analyzer = new SemanticAnalyzer({
        adapters: [adapter1, adapter2, adapter3],
        useConsensus: true,
      });

      const result = await analyzer.analyze('code', 'test.js');

      // Issue A: 3/3 = 100% confidence
      // Issue B: 1/3 = 33% confidence
      const issueA = result.consensus.issues.find(i => i.message === 'Issue A');
      const issueB = result.consensus.issues.find(i => i.message === 'Issue B');

      expect(issueA.confidence).toBe(1);
      expect(issueB.confidence).toBeCloseTo(0.33, 1);
    });
  });

  describe('budget limits', () => {
    it('respects budget limits', async () => {
      const { SemanticAnalyzer } = await import('./semantic-analyzer.js');

      const expensiveAdapter = {
        name: 'expensive',
        canAfford: () => false,
        review: vi.fn(),
      };

      const cheapAdapter = {
        name: 'cheap',
        canAfford: () => true,
        review: vi.fn().mockResolvedValue({
          model: 'cheap',
          issues: [],
          cost: 0.001,
        }),
      };

      const analyzer = new SemanticAnalyzer({
        adapters: [expensiveAdapter, cheapAdapter],
        budgetAware: true,
      });

      await analyzer.analyze('const x = 1;', 'test.js');

      expect(expensiveAdapter.review).not.toHaveBeenCalled();
      expect(cheapAdapter.review).toHaveBeenCalled();
    });

    it('tracks costs across analysis', async () => {
      const { SemanticAnalyzer } = await import('./semantic-analyzer.js');

      const mockAdapter = {
        name: 'mock',
        canAfford: () => true,
        review: vi.fn().mockResolvedValue({
          model: 'mock',
          issues: [],
          cost: 0.05,
        }),
      };

      const analyzer = new SemanticAnalyzer({ adapters: [mockAdapter] });

      const result = await analyzer.analyze('code', 'test.js');

      expect(result.cost).toBe(0.05);
    });
  });

  describe('error handling', () => {
    it('gracefully handles model failures', async () => {
      const { SemanticAnalyzer } = await import('./semantic-analyzer.js');

      const failingAdapter = {
        name: 'failing',
        canAfford: () => true,
        review: vi.fn().mockRejectedValue(new Error('API error')),
      };

      const workingAdapter = {
        name: 'working',
        canAfford: () => true,
        review: vi.fn().mockResolvedValue({
          model: 'working',
          issues: [{ type: 'naming', message: 'Found issue', line: 1 }],
          cost: 0.01,
        }),
      };

      const analyzer = new SemanticAnalyzer({
        adapters: [failingAdapter, workingAdapter],
      });

      const result = await analyzer.analyze('code', 'test.js');

      expect(result.warnings).toContain('failing failed: API error');
      expect(result.issues).toHaveLength(1);
    });

    it('returns empty results when all models fail', async () => {
      const { SemanticAnalyzer } = await import('./semantic-analyzer.js');

      const failingAdapter = {
        name: 'failing',
        canAfford: () => true,
        review: vi.fn().mockRejectedValue(new Error('API error')),
      };

      const analyzer = new SemanticAnalyzer({
        adapters: [failingAdapter],
        requireMinimum: 0,
      });

      const result = await analyzer.analyze('code', 'test.js');

      expect(result.issues).toEqual([]);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('handles empty code gracefully', async () => {
      const { SemanticAnalyzer } = await import('./semantic-analyzer.js');

      const mockAdapter = {
        name: 'mock',
        canAfford: () => true,
        review: vi.fn().mockResolvedValue({
          model: 'mock',
          issues: [],
          cost: 0,
        }),
      };

      const analyzer = new SemanticAnalyzer({ adapters: [mockAdapter] });

      const result = await analyzer.analyze('', 'test.js');

      expect(result.issues).toEqual([]);
      expect(result.error).toBeUndefined();
    });
  });

  describe('context passing', () => {
    it('passes file context to adapters', async () => {
      const { SemanticAnalyzer } = await import('./semantic-analyzer.js');

      const mockAdapter = {
        name: 'mock',
        canAfford: () => true,
        review: vi.fn().mockResolvedValue({
          model: 'mock',
          issues: [],
          cost: 0.01,
        }),
      };

      const analyzer = new SemanticAnalyzer({ adapters: [mockAdapter] });

      await analyzer.analyze('code', 'src/utils/helpers.js');

      expect(mockAdapter.review).toHaveBeenCalledWith(
        'code',
        expect.objectContaining({
          filename: 'src/utils/helpers.js',
          type: 'semantic',
        })
      );
    });

    it('passes custom context to adapters', async () => {
      const { SemanticAnalyzer } = await import('./semantic-analyzer.js');

      const mockAdapter = {
        name: 'mock',
        canAfford: () => true,
        review: vi.fn().mockResolvedValue({
          model: 'mock',
          issues: [],
          cost: 0.01,
        }),
      };

      const analyzer = new SemanticAnalyzer({ adapters: [mockAdapter] });

      await analyzer.analyze('code', 'test.js', { projectType: 'react' });

      expect(mockAdapter.review).toHaveBeenCalledWith(
        'code',
        expect.objectContaining({
          projectType: 'react',
        })
      );
    });
  });

  describe('issue categorization', () => {
    it('categorizes issues by type', async () => {
      const { SemanticAnalyzer } = await import('./semantic-analyzer.js');

      const mockAdapter = {
        name: 'mock',
        canAfford: () => true,
        review: vi.fn().mockResolvedValue({
          model: 'mock',
          issues: [
            { type: 'naming', message: 'Poor name', line: 1 },
            { type: 'clarity', message: 'Unclear purpose', line: 2 },
            { type: 'naming', message: 'Another poor name', line: 3 },
          ],
          cost: 0.01,
        }),
      };

      const analyzer = new SemanticAnalyzer({ adapters: [mockAdapter] });

      const result = await analyzer.analyze('code', 'test.js');

      expect(result.byType).toBeDefined();
      expect(result.byType.naming).toHaveLength(2);
      expect(result.byType.clarity).toHaveLength(1);
    });
  });
});
