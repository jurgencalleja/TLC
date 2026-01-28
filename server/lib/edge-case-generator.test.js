import { describe, it, expect } from 'vitest';
import {
  parseFunction,
  generateEdgeCases,
  formatTestCode,
  EDGE_CASE_TYPES,
} from './edge-case-generator.js';

describe('edge-case-generator', () => {
  describe('parseFunction', () => {
    it('extracts function name and parameters', () => {
      const code = `
function validateEmail(email) {
  return email.includes('@');
}
      `;

      const result = parseFunction(code);

      expect(result.name).toBe('validateEmail');
      expect(result.params).toContain('email');
    });

    it('parses arrow function', () => {
      const code = `
const formatName = (firstName, lastName) => {
  return \`\${firstName} \${lastName}\`;
};
      `;

      const result = parseFunction(code);

      expect(result.name).toBe('formatName');
      expect(result.params).toEqual(['firstName', 'lastName']);
    });

    it('parses TypeScript function with types', () => {
      const code = `
function calculateTotal(price: number, quantity: number): number {
  return price * quantity;
}
      `;

      const result = parseFunction(code);

      expect(result.name).toBe('calculateTotal');
      expect(result.params).toContain('price');
      expect(result.params).toContain('quantity');
      expect(result.types).toEqual({ price: 'number', quantity: 'number' });
    });

    it('parses async function', () => {
      const code = `
async function fetchUser(userId) {
  return await db.findUser(userId);
}
      `;

      const result = parseFunction(code);

      expect(result.name).toBe('fetchUser');
      expect(result.async).toBe(true);
    });

    it('returns null for non-function code', () => {
      const code = 'const x = 5;';

      const result = parseFunction(code);

      expect(result).toBeNull();
    });
  });

  describe('generateEdgeCases', () => {
    it('generates null/undefined cases for string param', () => {
      const fn = { name: 'validate', params: ['email'], types: { email: 'string' } };

      const cases = generateEdgeCases(fn);

      expect(cases.some(c => c.input === null)).toBe(true);
      expect(cases.some(c => c.input === undefined)).toBe(true);
      expect(cases.some(c => c.input === '')).toBe(true);
    });

    it('generates boundary cases for number param', () => {
      const fn = { name: 'calculate', params: ['amount'], types: { amount: 'number' } };

      const cases = generateEdgeCases(fn);

      expect(cases.some(c => c.input === 0)).toBe(true);
      expect(cases.some(c => c.input === -1)).toBe(true);
      expect(cases.some(c => c.category === 'boundary')).toBe(true);
    });

    it('generates empty/single cases for array param', () => {
      const fn = { name: 'process', params: ['items'], types: { items: 'array' } };

      const cases = generateEdgeCases(fn);

      expect(cases.some(c => Array.isArray(c.input) && c.input.length === 0)).toBe(true);
      expect(cases.some(c => Array.isArray(c.input) && c.input.length === 1)).toBe(true);
    });

    it('includes security patterns', () => {
      const fn = { name: 'query', params: ['input'], types: { input: 'string' } };

      const cases = generateEdgeCases(fn);

      // Should include SQL injection test
      expect(cases.some(c => c.category === 'security')).toBe(true);
    });

    it('respects maxCases option', () => {
      const fn = { name: 'test', params: ['a', 'b', 'c'], types: {} };

      const cases = generateEdgeCases(fn, { maxCases: 5 });

      expect(cases.length).toBeLessThanOrEqual(5);
    });
  });

  describe('formatTestCode', () => {
    it('generates valid Vitest test code', () => {
      const fn = { name: 'validate', params: ['email'] };
      const edgeCase = {
        input: null,
        category: 'null-check',
        expected: 'throws',
        description: 'rejects null email',
      };

      const code = formatTestCode(fn, edgeCase, 'vitest');

      expect(code).toContain('it(');
      expect(code).toContain('null');
      expect(code).toContain('validate');
    });

    it('generates valid Mocha test code', () => {
      const fn = { name: 'validate', params: ['email'] };
      const edgeCase = {
        input: '',
        category: 'empty-string',
        expected: 'throws',
        description: 'rejects empty email',
      };

      const code = formatTestCode(fn, edgeCase, 'mocha');

      expect(code).toContain('it(');
      expect(code).toContain('""');  // JSON.stringify of empty string
    });

    it('handles async functions', () => {
      const fn = { name: 'fetchUser', params: ['id'], async: true };
      const edgeCase = {
        input: null,
        category: 'null-check',
        expected: 'throws',
        description: 'rejects null id',
      };

      const code = formatTestCode(fn, edgeCase, 'vitest');

      expect(code).toContain('async');
      expect(code).toContain('await');
    });

    it('escapes special characters in input', () => {
      const fn = { name: 'query', params: ['sql'] };
      const edgeCase = {
        input: "'; DROP TABLE users; --",
        category: 'security',
        expected: 'throws',
        description: 'rejects SQL injection',
      };

      const code = formatTestCode(fn, edgeCase, 'vitest');

      // JSON.stringify properly escapes the string for JavaScript
      expect(code).toContain('query(');
      expect(code).toContain('DROP TABLE');  // Content should be there
      expect(code).toContain('it(');  // Valid test structure
    });
  });

  describe('EDGE_CASE_TYPES', () => {
    it('has types for string', () => {
      expect(EDGE_CASE_TYPES.string).toBeDefined();
      expect(Array.isArray(EDGE_CASE_TYPES.string)).toBe(true);
    });

    it('has types for number', () => {
      expect(EDGE_CASE_TYPES.number).toBeDefined();
      expect(EDGE_CASE_TYPES.number.some(c => c.input === 0)).toBe(true);
    });

    it('has types for array', () => {
      expect(EDGE_CASE_TYPES.array).toBeDefined();
    });

    it('has security types', () => {
      expect(EDGE_CASE_TYPES.security).toBeDefined();
    });
  });
});
