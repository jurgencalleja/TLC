import { describe, it, expect } from 'vitest';
import {
  analyzeTarget,
  formatEdgeCaseSummary,
  formatEdgeCaseSelection,
} from './edge-cases-command.js';

describe('edge-cases-command', () => {
  describe('analyzeTarget', () => {
    it('analyzes file and extracts functions', () => {
      const fileContent = `
function validateEmail(email) {
  return email.includes('@');
}

function formatName(first, last) {
  return \`\${first} \${last}\`;
}
      `;

      const result = analyzeTarget(fileContent);

      expect(result.functions).toHaveLength(2);
      expect(result.functions[0].name).toBe('validateEmail');
      expect(result.functions[1].name).toBe('formatName');
    });

    it('generates edge cases for each function', () => {
      const fileContent = `
function validate(input) {
  if (!input) throw new Error('Required');
  return true;
}
      `;

      const result = analyzeTarget(fileContent);

      expect(result.functions[0].edgeCases.length).toBeGreaterThan(0);
      expect(result.functions[0].edgeCases.some(c => c.category === 'null-check')).toBe(true);
    });

    it('includes total counts', () => {
      const fileContent = `
function a(x) { return x; }
function b(y) { return y; }
      `;

      const result = analyzeTarget(fileContent);

      expect(result.totalFunctions).toBe(2);
      expect(result.totalEdgeCases).toBeGreaterThan(0);
    });

    it('categorizes edge cases by type', () => {
      const fileContent = `
function process(data) { return data; }
      `;

      const result = analyzeTarget(fileContent);

      expect(result.byCategory).toBeDefined();
      expect(result.byCategory['null-check']).toBeGreaterThanOrEqual(1);
    });
  });

  describe('formatEdgeCaseSummary', () => {
    it('shows function count and edge case count', () => {
      const analysis = {
        functions: [
          { name: 'validate', params: ['email'], edgeCases: [{ category: 'null-check' }] },
        ],
        totalFunctions: 1,
        totalEdgeCases: 5,
        byCategory: { 'null-check': 2, 'empty-string': 2, 'security': 1 },
      };

      const output = formatEdgeCaseSummary(analysis);

      expect(output).toContain('1');  // function count
      expect(output).toContain('5');  // edge case count
    });

    it('shows breakdown by category', () => {
      const analysis = {
        functions: [{ name: 'test', params: ['x'], edgeCases: [] }],
        totalFunctions: 1,
        totalEdgeCases: 6,
        byCategory: { 'null-check': 2, 'boundary': 3, 'security': 1 },
      };

      const output = formatEdgeCaseSummary(analysis);

      expect(output).toContain('null-check');
      expect(output).toContain('boundary');
      expect(output).toContain('security');
    });

    it('lists functions with edge case counts', () => {
      const analysis = {
        functions: [
          { name: 'validateEmail', params: ['email'], edgeCases: Array(8).fill({}) },
          { name: 'formatName', params: ['first', 'last'], edgeCases: Array(12).fill({}) },
        ],
        totalFunctions: 2,
        totalEdgeCases: 20,
        byCategory: {},
      };

      const output = formatEdgeCaseSummary(analysis);

      expect(output).toContain('validateEmail');
      expect(output).toContain('formatName');
      expect(output).toContain('8');
      expect(output).toContain('12');
    });
  });

  describe('formatEdgeCaseSelection', () => {
    it('formats selectable list of edge cases', () => {
      const edgeCases = [
        { category: 'null-check', description: 'handles null email', input: null },
        { category: 'empty-string', description: 'handles empty email', input: '' },
        { category: 'security', description: 'rejects SQL injection', input: "'; DROP" },
      ];

      const output = formatEdgeCaseSelection(edgeCases);

      expect(output).toContain('[1]');
      expect(output).toContain('[2]');
      expect(output).toContain('[3]');
      expect(output).toContain('null-check');
      expect(output).toContain('handles null');
    });

    it('groups by category', () => {
      const edgeCases = [
        { category: 'null-check', description: 'null 1', input: null },
        { category: 'null-check', description: 'null 2', input: null },
        { category: 'boundary', description: 'zero', input: 0 },
      ];

      const output = formatEdgeCaseSelection(edgeCases);

      // Should have category headers
      expect(output).toContain('null-check');
      expect(output).toContain('boundary');
    });

    it('shows all option', () => {
      const edgeCases = [{ category: 'test', description: 'test', input: null }];

      const output = formatEdgeCaseSelection(edgeCases);

      expect(output.toLowerCase()).toContain('all');
    });
  });
});
