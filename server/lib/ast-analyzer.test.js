/**
 * AST Code Analyzer Tests
 * Task 1: Parse JavaScript/TypeScript files and extract metrics
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Will import the module once implemented
// import { AstAnalyzer } from './ast-analyzer.js';

describe('AstAnalyzer', () => {
  describe('parseFile', () => {
    it('parses simple function and returns complexity 1', async () => {
      const code = `
        function add(a, b) {
          return a + b;
        }
      `;

      const { AstAnalyzer } = await import('./ast-analyzer.js');
      const analyzer = new AstAnalyzer();
      const result = analyzer.analyze(code, 'test.js');

      expect(result.functions).toHaveLength(1);
      expect(result.functions[0].name).toBe('add');
      expect(result.functions[0].complexity).toBe(1);
    });

    it('parses function with if/else and returns complexity 2', async () => {
      const code = `
        function check(x) {
          if (x > 0) {
            return 'positive';
          } else {
            return 'non-positive';
          }
        }
      `;

      const { AstAnalyzer } = await import('./ast-analyzer.js');
      const analyzer = new AstAnalyzer();
      const result = analyzer.analyze(code, 'test.js');

      expect(result.functions[0].complexity).toBe(2);
    });

    it('calculates complexity for switch statements', async () => {
      const code = `
        function getDay(num) {
          switch(num) {
            case 1: return 'Monday';
            case 2: return 'Tuesday';
            case 3: return 'Wednesday';
            default: return 'Unknown';
          }
        }
      `;

      const { AstAnalyzer } = await import('./ast-analyzer.js');
      const analyzer = new AstAnalyzer();
      const result = analyzer.analyze(code, 'test.js');

      // Base 1 + 3 cases = 4
      expect(result.functions[0].complexity).toBe(4);
    });

    it('calculates complexity for logical operators', async () => {
      const code = `
        function validate(a, b, c) {
          if (a && b || c) {
            return true;
          }
          return false;
        }
      `;

      const { AstAnalyzer } = await import('./ast-analyzer.js');
      const analyzer = new AstAnalyzer();
      const result = analyzer.analyze(code, 'test.js');

      // Base 1 + if + && + || = 4
      expect(result.functions[0].complexity).toBe(4);
    });

    it('calculates complexity for loops', async () => {
      const code = `
        function sum(arr) {
          let total = 0;
          for (let i = 0; i < arr.length; i++) {
            total += arr[i];
          }
          return total;
        }
      `;

      const { AstAnalyzer } = await import('./ast-analyzer.js');
      const analyzer = new AstAnalyzer();
      const result = analyzer.analyze(code, 'test.js');

      // Base 1 + for loop = 2
      expect(result.functions[0].complexity).toBe(2);
    });

    it('calculates complexity for ternary operators', async () => {
      const code = `
        function max(a, b) {
          return a > b ? a : b;
        }
      `;

      const { AstAnalyzer } = await import('./ast-analyzer.js');
      const analyzer = new AstAnalyzer();
      const result = analyzer.analyze(code, 'test.js');

      // Base 1 + ternary = 2
      expect(result.functions[0].complexity).toBe(2);
    });
  });

  describe('function length detection', () => {
    it('detects function with 50+ lines as long', async () => {
      const lines = Array(55).fill('  const x = 1;').join('\n');
      const code = `
        function longFunction() {
${lines}
        }
      `;

      const { AstAnalyzer } = await import('./ast-analyzer.js');
      const analyzer = new AstAnalyzer();
      const result = analyzer.analyze(code, 'test.js');

      expect(result.functions[0].lineCount).toBeGreaterThanOrEqual(50);
      expect(result.functions[0].isLong).toBe(true);
    });

    it('does not flag short functions as long', async () => {
      const code = `
        function shortFunction() {
          return 1;
        }
      `;

      const { AstAnalyzer } = await import('./ast-analyzer.js');
      const analyzer = new AstAnalyzer();
      const result = analyzer.analyze(code, 'test.js');

      expect(result.functions[0].isLong).toBe(false);
    });

    it('configures custom line threshold', async () => {
      const lines = Array(25).fill('  const x = 1;').join('\n');
      const code = `
        function mediumFunction() {
${lines}
        }
      `;

      const { AstAnalyzer } = await import('./ast-analyzer.js');
      const analyzer = new AstAnalyzer({ longFunctionThreshold: 20 });
      const result = analyzer.analyze(code, 'test.js');

      expect(result.functions[0].isLong).toBe(true);
    });
  });

  describe('nesting depth detection', () => {
    it('detects 5-level nesting as deep', async () => {
      const code = `
        function deeplyNested() {
          if (a) {
            if (b) {
              if (c) {
                if (d) {
                  if (e) {
                    return true;
                  }
                }
              }
            }
          }
        }
      `;

      const { AstAnalyzer } = await import('./ast-analyzer.js');
      const analyzer = new AstAnalyzer();
      const result = analyzer.analyze(code, 'test.js');

      expect(result.functions[0].maxNesting).toBe(5);
      expect(result.functions[0].isDeeplyNested).toBe(true);
    });

    it('does not flag shallow nesting as deep', async () => {
      const code = `
        function shallowFunction() {
          if (a) {
            if (b) {
              return true;
            }
          }
        }
      `;

      const { AstAnalyzer } = await import('./ast-analyzer.js');
      const analyzer = new AstAnalyzer();
      const result = analyzer.analyze(code, 'test.js');

      expect(result.functions[0].maxNesting).toBe(2);
      expect(result.functions[0].isDeeplyNested).toBe(false);
    });

    it('counts loops as nesting levels', async () => {
      const code = `
        function nestedLoops() {
          for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
              for (let k = 0; k < 10; k++) {
                for (let l = 0; l < 10; l++) {
                  for (let m = 0; m < 10; m++) {
                    console.log(i, j, k, l, m);
                  }
                }
              }
            }
          }
        }
      `;

      const { AstAnalyzer } = await import('./ast-analyzer.js');
      const analyzer = new AstAnalyzer();
      const result = analyzer.analyze(code, 'test.js');

      expect(result.functions[0].maxNesting).toBe(5);
      expect(result.functions[0].isDeeplyNested).toBe(true);
    });
  });

  describe('error handling', () => {
    it('handles syntax errors gracefully', async () => {
      const code = `
        function broken( {
          return
      `;

      const { AstAnalyzer } = await import('./ast-analyzer.js');
      const analyzer = new AstAnalyzer();
      const result = analyzer.analyze(code, 'test.js');

      expect(result.error).toBeDefined();
      expect(result.functions).toEqual([]);
    });

    it('handles empty file', async () => {
      const { AstAnalyzer } = await import('./ast-analyzer.js');
      const analyzer = new AstAnalyzer();
      const result = analyzer.analyze('', 'test.js');

      expect(result.functions).toEqual([]);
      expect(result.error).toBeUndefined();
    });

    it('handles file with only comments', async () => {
      const code = `
        // This is a comment
        /* Multi-line
           comment */
      `;

      const { AstAnalyzer } = await import('./ast-analyzer.js');
      const analyzer = new AstAnalyzer();
      const result = analyzer.analyze(code, 'test.js');

      expect(result.functions).toEqual([]);
    });
  });

  describe('TypeScript support', () => {
    it('works with TypeScript files', async () => {
      const code = `
        function add(a: number, b: number): number {
          return a + b;
        }
      `;

      const { AstAnalyzer } = await import('./ast-analyzer.js');
      const analyzer = new AstAnalyzer();
      const result = analyzer.analyze(code, 'test.ts');

      expect(result.functions).toHaveLength(1);
      expect(result.functions[0].name).toBe('add');
    });

    it('handles TypeScript interfaces', async () => {
      const code = `
        interface User {
          id: number;
          name: string;
        }

        function getUser(id: number): User {
          return { id, name: 'test' };
        }
      `;

      const { AstAnalyzer } = await import('./ast-analyzer.js');
      const analyzer = new AstAnalyzer();
      const result = analyzer.analyze(code, 'test.ts');

      expect(result.functions).toHaveLength(1);
    });

    it('handles TypeScript generics', async () => {
      const code = `
        function identity<T>(arg: T): T {
          return arg;
        }
      `;

      const { AstAnalyzer } = await import('./ast-analyzer.js');
      const analyzer = new AstAnalyzer();
      const result = analyzer.analyze(code, 'test.ts');

      expect(result.functions).toHaveLength(1);
      expect(result.functions[0].name).toBe('identity');
    });
  });

  describe('JSX/TSX support', () => {
    it('works with JSX files', async () => {
      const code = `
        function Button({ onClick, children }) {
          if (!onClick) {
            return <span>{children}</span>;
          }
          return <button onClick={onClick}>{children}</button>;
        }
      `;

      const { AstAnalyzer } = await import('./ast-analyzer.js');
      const analyzer = new AstAnalyzer();
      const result = analyzer.analyze(code, 'test.jsx');

      expect(result.functions).toHaveLength(1);
      expect(result.functions[0].complexity).toBe(2); // Base + if
    });

    it('works with TSX files', async () => {
      const code = `
        interface Props {
          name: string;
        }

        function Greeting({ name }: Props): JSX.Element {
          return <h1>Hello, {name}!</h1>;
        }
      `;

      const { AstAnalyzer } = await import('./ast-analyzer.js');
      const analyzer = new AstAnalyzer();
      const result = analyzer.analyze(code, 'test.tsx');

      expect(result.functions).toHaveLength(1);
    });
  });

  describe('class methods', () => {
    it('analyzes class methods', async () => {
      const code = `
        class Calculator {
          add(a, b) {
            return a + b;
          }

          divide(a, b) {
            if (b === 0) {
              throw new Error('Division by zero');
            }
            return a / b;
          }
        }
      `;

      const { AstAnalyzer } = await import('./ast-analyzer.js');
      const analyzer = new AstAnalyzer();
      const result = analyzer.analyze(code, 'test.js');

      expect(result.functions).toHaveLength(2);
      expect(result.functions[0].name).toBe('add');
      expect(result.functions[0].complexity).toBe(1);
      expect(result.functions[1].name).toBe('divide');
      expect(result.functions[1].complexity).toBe(2);
    });
  });

  describe('arrow functions', () => {
    it('analyzes arrow functions', async () => {
      const code = `
        const add = (a, b) => a + b;

        const check = (x) => {
          if (x > 0) {
            return 'positive';
          }
          return 'non-positive';
        };
      `;

      const { AstAnalyzer } = await import('./ast-analyzer.js');
      const analyzer = new AstAnalyzer();
      const result = analyzer.analyze(code, 'test.js');

      expect(result.functions).toHaveLength(2);
      expect(result.functions[0].name).toBe('add');
      expect(result.functions[1].name).toBe('check');
      expect(result.functions[1].complexity).toBe(2);
    });
  });

  describe('file metrics', () => {
    it('returns file-level metrics', async () => {
      const code = `
        function a() { return 1; }
        function b() { if (x) return 2; return 3; }
        function c() { for (let i = 0; i < 10; i++) { if (i % 2) console.log(i); } }
      `;

      const { AstAnalyzer } = await import('./ast-analyzer.js');
      const analyzer = new AstAnalyzer();
      const result = analyzer.analyze(code, 'test.js');

      expect(result.fileMetrics).toBeDefined();
      expect(result.fileMetrics.totalFunctions).toBe(3);
      expect(result.fileMetrics.averageComplexity).toBeGreaterThan(1);
      expect(result.fileMetrics.maxComplexity).toBeGreaterThan(1);
    });
  });
});
