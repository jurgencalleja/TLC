/**
 * Cost Reports Tests
 *
 * Generate cost reports by various dimensions
 */

import { describe, it, beforeEach } from 'vitest';
const assert = require('node:assert');

const {
  generateReport,
  filterByPeriod,
  groupByModel,
  groupByOperation,
  groupByTrigger,
  exportCSV,
  exportJSON,
  analyzeTrends,
  compareToLastPeriod,
  formatReport,
} = require('./cost-reports.js');

describe('Cost Reports', () => {
  const sampleData = [
    { date: '2025-01-15', model: 'claude-3-opus', operation: 'code-gen', trigger: 'manual', cost: 1.00 },
    { date: '2025-01-15', model: 'gpt-4', operation: 'review', trigger: 'ci', cost: 0.50 },
    { date: '2025-01-16', model: 'claude-3-opus', operation: 'code-gen', trigger: 'manual', cost: 1.50 },
    { date: '2025-01-16', model: 'claude-3-haiku', operation: 'chat', trigger: 'webhook', cost: 0.10 },
    { date: '2025-01-17', model: 'gpt-4', operation: 'review', trigger: 'ci', cost: 0.75 },
  ];

  describe('generateReport', () => {
    it('creates report object', () => {
      const report = generateReport(sampleData);

      assert.ok(report);
      assert.ok(report.totalCost !== undefined);
      assert.ok(report.recordCount !== undefined);
      assert.ok(report.dateRange);
    });

    it('calculates total cost', () => {
      const report = generateReport(sampleData);

      assert.strictEqual(report.totalCost, 3.85);
    });
  });

  describe('filterByPeriod', () => {
    it('selects date range', () => {
      const filtered = filterByPeriod(sampleData, {
        startDate: '2025-01-15',
        endDate: '2025-01-16',
      });

      assert.strictEqual(filtered.length, 4);
    });

    it('handles single day', () => {
      const filtered = filterByPeriod(sampleData, {
        startDate: '2025-01-15',
        endDate: '2025-01-15',
      });

      assert.strictEqual(filtered.length, 2);
    });

    it('returns empty for no matches', () => {
      const filtered = filterByPeriod(sampleData, {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      assert.strictEqual(filtered.length, 0);
    });
  });

  describe('groupByModel', () => {
    it('aggregates costs by model', () => {
      const grouped = groupByModel(sampleData);

      assert.ok(grouped['claude-3-opus']);
      assert.ok(grouped['gpt-4']);
      assert.ok(grouped['claude-3-haiku']);

      assert.strictEqual(grouped['claude-3-opus'], 2.50);
      assert.strictEqual(grouped['gpt-4'], 1.25);
      assert.strictEqual(grouped['claude-3-haiku'], 0.10);
    });
  });

  describe('groupByOperation', () => {
    it('aggregates costs by operation', () => {
      const grouped = groupByOperation(sampleData);

      assert.ok(grouped['code-gen']);
      assert.ok(grouped['review']);
      assert.ok(grouped['chat']);

      assert.strictEqual(grouped['code-gen'], 2.50);
      assert.strictEqual(grouped['review'], 1.25);
      assert.strictEqual(grouped['chat'], 0.10);
    });
  });

  describe('groupByTrigger', () => {
    it('aggregates costs by trigger', () => {
      const grouped = groupByTrigger(sampleData);

      assert.ok(grouped['manual']);
      assert.ok(grouped['ci']);
      assert.ok(grouped['webhook']);

      assert.strictEqual(grouped['manual'], 2.50);
      assert.strictEqual(grouped['ci'], 1.25);
      assert.strictEqual(grouped['webhook'], 0.10);
    });
  });

  describe('exportCSV', () => {
    it('formats correctly', () => {
      const csv = exportCSV(sampleData);

      assert.ok(typeof csv === 'string');
      assert.ok(csv.includes('date'));
      assert.ok(csv.includes('model'));
      assert.ok(csv.includes('cost'));
      assert.ok(csv.includes('claude-3-opus'));

      // Should have header + 5 data rows
      const lines = csv.trim().split('\n');
      assert.strictEqual(lines.length, 6);
    });
  });

  describe('exportJSON', () => {
    it('formats correctly', () => {
      const json = exportJSON(sampleData);

      assert.ok(typeof json === 'string');

      const parsed = JSON.parse(json);
      assert.ok(Array.isArray(parsed));
      assert.strictEqual(parsed.length, 5);
    });

    it('includes all fields', () => {
      const json = exportJSON(sampleData);
      const parsed = JSON.parse(json);

      assert.ok(parsed[0].date);
      assert.ok(parsed[0].model);
      assert.ok(parsed[0].operation);
      assert.ok(parsed[0].trigger);
      assert.ok(parsed[0].cost !== undefined);
    });
  });

  describe('analyzeTrends', () => {
    it('shows direction increasing', () => {
      const data = [
        { date: '2025-01-01', cost: 1.00 },
        { date: '2025-01-02', cost: 1.50 },
        { date: '2025-01-03', cost: 2.00 },
        { date: '2025-01-04', cost: 2.50 },
      ];

      const trend = analyzeTrends(data);

      assert.strictEqual(trend.direction, 'increasing');
      assert.ok(trend.percentChange > 0);
    });

    it('shows direction decreasing', () => {
      const data = [
        { date: '2025-01-01', cost: 2.50 },
        { date: '2025-01-02', cost: 2.00 },
        { date: '2025-01-03', cost: 1.50 },
        { date: '2025-01-04', cost: 1.00 },
      ];

      const trend = analyzeTrends(data);

      assert.strictEqual(trend.direction, 'decreasing');
      assert.ok(trend.percentChange < 0);
    });

    it('shows direction stable', () => {
      const data = [
        { date: '2025-01-01', cost: 1.00 },
        { date: '2025-01-02', cost: 1.00 },
        { date: '2025-01-03', cost: 1.00 },
      ];

      const trend = analyzeTrends(data);

      assert.strictEqual(trend.direction, 'stable');
    });
  });

  describe('compareToLastPeriod', () => {
    it('calculates difference', () => {
      const currentPeriod = [
        { cost: 5.00 },
        { cost: 3.00 },
      ];

      const lastPeriod = [
        { cost: 4.00 },
        { cost: 2.00 },
      ];

      const comparison = compareToLastPeriod(currentPeriod, lastPeriod);

      assert.strictEqual(comparison.currentTotal, 8.00);
      assert.strictEqual(comparison.lastTotal, 6.00);
      assert.strictEqual(comparison.difference, 2.00);
      assert.ok(comparison.percentChange > 0);
    });

    it('handles empty last period', () => {
      const currentPeriod = [{ cost: 5.00 }];
      const lastPeriod = [];

      const comparison = compareToLastPeriod(currentPeriod, lastPeriod);

      assert.strictEqual(comparison.currentTotal, 5.00);
      assert.strictEqual(comparison.lastTotal, 0);
    });
  });

  describe('formatReport', () => {
    it('creates markdown report', () => {
      const report = generateReport(sampleData);
      const formatted = formatReport(report);

      assert.ok(typeof formatted === 'string');
      assert.ok(formatted.includes('#')); // Markdown headers
      assert.ok(formatted.includes('Total'));
      assert.ok(formatted.includes('$'));
    });

    it('includes breakdown sections', () => {
      const report = generateReport(sampleData);
      report.byModel = groupByModel(sampleData);
      report.byOperation = groupByOperation(sampleData);

      const formatted = formatReport(report);

      assert.ok(formatted.includes('Model'));
      assert.ok(formatted.includes('Operation'));
    });
  });
});
