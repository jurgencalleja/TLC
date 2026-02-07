/**
 * Quality History Tests
 *
 * Tests for tracking quality improvements over time
 */

import { describe, it, beforeEach } from 'vitest';
const assert = require('node:assert');

const {
  createQualityHistory,
  recordScore,
  getHistory,
  getHistoryByOperation,
  getHistoryByModel,
  calculateTrend,
  detectImprovement,
  detectDegradation,
  alertOnDegradation,
  cleanupHistory,
} = require('./quality-history.js');

describe('Quality History', () => {
  describe('createQualityHistory', () => {
    it('creates history store with default options', () => {
      const history = createQualityHistory();
      assert.ok(history);
      assert.ok(history.records);
      assert.deepStrictEqual(history.records, []);
    });

    it('accepts retention period', () => {
      const history = createQualityHistory({ retentionDays: 30 });
      assert.strictEqual(history.options.retentionDays, 30);
    });

    it('accepts alert threshold', () => {
      const history = createQualityHistory({ alertThreshold: -10 });
      assert.strictEqual(history.options.alertThreshold, -10);
    });
  });

  describe('recordScore', () => {
    it('saves score to history', () => {
      const history = createQualityHistory();
      recordScore(history, { composite: 85 });
      assert.strictEqual(history.records.length, 1);
      assert.strictEqual(history.records[0].composite, 85);
    });

    it('includes metadata', () => {
      const history = createQualityHistory();
      recordScore(history, {
        composite: 85,
        operation: 'code-gen',
        model: 'gpt-4',
      });
      assert.strictEqual(history.records[0].operation, 'code-gen');
      assert.strictEqual(history.records[0].model, 'gpt-4');
    });

    it('adds timestamp automatically', () => {
      const history = createQualityHistory();
      recordScore(history, { composite: 85 });
      assert.ok(history.records[0].timestamp);
    });

    it('generates unique id', () => {
      const history = createQualityHistory();
      recordScore(history, { composite: 85 });
      recordScore(history, { composite: 90 });
      assert.notStrictEqual(history.records[0].id, history.records[1].id);
    });

    it('stores dimension scores', () => {
      const history = createQualityHistory();
      recordScore(history, {
        composite: 85,
        scores: { style: 80, correctness: 90 },
      });
      assert.deepStrictEqual(history.records[0].scores, { style: 80, correctness: 90 });
    });
  });

  describe('getHistory', () => {
    it('returns all records', () => {
      const history = createQualityHistory();
      recordScore(history, { composite: 80 });
      recordScore(history, { composite: 85 });
      recordScore(history, { composite: 90 });
      const records = getHistory(history);
      assert.strictEqual(records.length, 3);
    });

    it('returns records in chronological order', () => {
      const history = createQualityHistory();
      recordScore(history, { composite: 80, timestamp: new Date('2024-01-01') });
      recordScore(history, { composite: 90, timestamp: new Date('2024-01-03') });
      recordScore(history, { composite: 85, timestamp: new Date('2024-01-02') });
      const records = getHistory(history, { sorted: true });
      assert.strictEqual(records[0].composite, 80);
      assert.strictEqual(records[2].composite, 90);
    });

    it('limits results', () => {
      const history = createQualityHistory();
      for (let i = 0; i < 100; i++) {
        recordScore(history, { composite: i });
      }
      const records = getHistory(history, { limit: 10 });
      assert.strictEqual(records.length, 10);
    });

    it('filters by date range', () => {
      const history = createQualityHistory();
      recordScore(history, { composite: 80, timestamp: new Date('2024-01-01') });
      recordScore(history, { composite: 85, timestamp: new Date('2024-01-15') });
      recordScore(history, { composite: 90, timestamp: new Date('2024-02-01') });
      const records = getHistory(history, {
        from: new Date('2024-01-10'),
        to: new Date('2024-01-20'),
      });
      assert.strictEqual(records.length, 1);
      assert.strictEqual(records[0].composite, 85);
    });
  });

  describe('getHistoryByOperation', () => {
    it('filters by operation type', () => {
      const history = createQualityHistory();
      recordScore(history, { composite: 80, operation: 'code-gen' });
      recordScore(history, { composite: 85, operation: 'review' });
      recordScore(history, { composite: 90, operation: 'code-gen' });
      const records = getHistoryByOperation(history, 'code-gen');
      assert.strictEqual(records.length, 2);
      assert.ok(records.every((r) => r.operation === 'code-gen'));
    });

    it('returns empty for unknown operation', () => {
      const history = createQualityHistory();
      recordScore(history, { composite: 80, operation: 'code-gen' });
      const records = getHistoryByOperation(history, 'unknown');
      assert.deepStrictEqual(records, []);
    });
  });

  describe('getHistoryByModel', () => {
    it('filters by model', () => {
      const history = createQualityHistory();
      recordScore(history, { composite: 80, model: 'gpt-3.5-turbo' });
      recordScore(history, { composite: 90, model: 'gpt-4' });
      recordScore(history, { composite: 85, model: 'gpt-4' });
      const records = getHistoryByModel(history, 'gpt-4');
      assert.strictEqual(records.length, 2);
      assert.ok(records.every((r) => r.model === 'gpt-4'));
    });

    it('supports model family filtering', () => {
      const history = createQualityHistory();
      recordScore(history, { composite: 80, model: 'gpt-3.5-turbo' });
      recordScore(history, { composite: 85, model: 'gpt-4' });
      recordScore(history, { composite: 90, model: 'gpt-4-turbo' });
      const records = getHistoryByModel(history, 'gpt-4', { family: true });
      assert.strictEqual(records.length, 2);
    });
  });

  describe('calculateTrend', () => {
    it('returns positive trend for improving scores', () => {
      const history = createQualityHistory();
      recordScore(history, { composite: 70 });
      recordScore(history, { composite: 75 });
      recordScore(history, { composite: 80 });
      recordScore(history, { composite: 85 });
      const trend = calculateTrend(history);
      assert.ok(trend.direction === 'improving' || trend.slope > 0);
    });

    it('returns negative trend for declining scores', () => {
      const history = createQualityHistory();
      recordScore(history, { composite: 90 });
      recordScore(history, { composite: 85 });
      recordScore(history, { composite: 80 });
      recordScore(history, { composite: 75 });
      const trend = calculateTrend(history);
      assert.ok(trend.direction === 'declining' || trend.slope < 0);
    });

    it('returns stable trend for consistent scores', () => {
      const history = createQualityHistory();
      recordScore(history, { composite: 80 });
      recordScore(history, { composite: 81 });
      recordScore(history, { composite: 79 });
      recordScore(history, { composite: 80 });
      const trend = calculateTrend(history);
      assert.ok(trend.direction === 'stable' || Math.abs(trend.slope) < 1);
    });

    it('calculates trend for specific dimension', () => {
      const history = createQualityHistory();
      recordScore(history, { scores: { style: 70, correctness: 90 } });
      recordScore(history, { scores: { style: 80, correctness: 85 } });
      const trend = calculateTrend(history, { dimension: 'style' });
      assert.ok(trend.slope > 0);
    });

    it('returns trend magnitude', () => {
      const history = createQualityHistory();
      recordScore(history, { composite: 70 });
      recordScore(history, { composite: 90 });
      const trend = calculateTrend(history);
      assert.ok(trend.magnitude !== undefined);
    });
  });

  describe('detectImprovement', () => {
    it('finds significant gains', () => {
      const history = createQualityHistory();
      recordScore(history, { composite: 70 });
      recordScore(history, { composite: 85 });
      const improvement = detectImprovement(history);
      assert.ok(improvement.detected);
      assert.ok(improvement.gain >= 15);
    });

    it('returns improvement details', () => {
      const history = createQualityHistory();
      recordScore(history, { composite: 70, model: 'gpt-3.5' });
      recordScore(history, { composite: 90, model: 'gpt-4' });
      const improvement = detectImprovement(history, { details: true });
      assert.ok(improvement.from);
      assert.ok(improvement.to);
    });

    it('returns false for no improvement', () => {
      const history = createQualityHistory();
      recordScore(history, { composite: 80 });
      recordScore(history, { composite: 80 });
      const improvement = detectImprovement(history);
      assert.strictEqual(improvement.detected, false);
    });

    it('uses configurable threshold', () => {
      const history = createQualityHistory();
      recordScore(history, { composite: 70 });
      recordScore(history, { composite: 75 });
      const noImprovement = detectImprovement(history, { threshold: 10 });
      const hasImprovement = detectImprovement(history, { threshold: 5 });
      assert.strictEqual(noImprovement.detected, false);
      assert.strictEqual(hasImprovement.detected, true);
    });
  });

  describe('detectDegradation', () => {
    it('finds significant losses', () => {
      const history = createQualityHistory();
      recordScore(history, { composite: 90 });
      recordScore(history, { composite: 70 });
      const degradation = detectDegradation(history);
      assert.ok(degradation.detected);
      assert.ok(degradation.loss >= 20);
    });

    it('returns degradation details', () => {
      const history = createQualityHistory();
      recordScore(history, { composite: 90, operation: 'code-gen' });
      recordScore(history, { composite: 70, operation: 'code-gen' });
      const degradation = detectDegradation(history, { details: true });
      assert.ok(degradation.from);
      assert.ok(degradation.to);
    });

    it('returns false for no degradation', () => {
      const history = createQualityHistory();
      recordScore(history, { composite: 80 });
      recordScore(history, { composite: 85 });
      const degradation = detectDegradation(history);
      assert.strictEqual(degradation.detected, false);
    });
  });

  describe('alertOnDegradation', () => {
    it('triggers alert when degradation detected', () => {
      const history = createQualityHistory({ alertThreshold: -10 });
      recordScore(history, { composite: 90 });
      recordScore(history, { composite: 70 });
      let alertTriggered = false;
      alertOnDegradation(history, () => {
        alertTriggered = true;
      });
      assert.strictEqual(alertTriggered, true);
    });

    it('does not trigger for minor changes', () => {
      const history = createQualityHistory({ alertThreshold: -10 });
      recordScore(history, { composite: 85 });
      recordScore(history, { composite: 80 });
      let alertTriggered = false;
      alertOnDegradation(history, () => {
        alertTriggered = true;
      });
      assert.strictEqual(alertTriggered, false);
    });

    it('passes degradation info to callback', () => {
      const history = createQualityHistory({ alertThreshold: -10 });
      recordScore(history, { composite: 90 });
      recordScore(history, { composite: 70 });
      let receivedInfo = null;
      alertOnDegradation(history, (info) => {
        receivedInfo = info;
      });
      assert.ok(receivedInfo);
      assert.ok(receivedInfo.loss);
    });
  });

  describe('cleanupHistory', () => {
    it('removes old records', () => {
      const history = createQualityHistory({ retentionDays: 30 });
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);
      recordScore(history, { composite: 80, timestamp: oldDate });
      recordScore(history, { composite: 85, timestamp: new Date() });
      cleanupHistory(history);
      assert.strictEqual(history.records.length, 1);
      assert.strictEqual(history.records[0].composite, 85);
    });

    it('returns count of removed records', () => {
      const history = createQualityHistory({ retentionDays: 30 });
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);
      recordScore(history, { composite: 80, timestamp: oldDate });
      recordScore(history, { composite: 75, timestamp: oldDate });
      recordScore(history, { composite: 85, timestamp: new Date() });
      const result = cleanupHistory(history);
      assert.strictEqual(result.removed, 2);
    });

    it('keeps all records within retention', () => {
      const history = createQualityHistory({ retentionDays: 30 });
      recordScore(history, { composite: 80 });
      recordScore(history, { composite: 85 });
      recordScore(history, { composite: 90 });
      cleanupHistory(history);
      assert.strictEqual(history.records.length, 3);
    });

    it('accepts custom retention override', () => {
      const history = createQualityHistory({ retentionDays: 90 });
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);
      recordScore(history, { composite: 80, timestamp: oldDate });
      cleanupHistory(history, { retentionDays: 30 });
      assert.strictEqual(history.records.length, 0);
    });
  });
});
