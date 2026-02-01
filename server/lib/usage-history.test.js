import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { UsageHistory } from './usage-history.js';

describe('UsageHistory', () => {
  let testDir;
  let history;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-usage-history-test-'));
    history = new UsageHistory(path.join(testDir, '.tlc', 'usage-history.json'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    vi.useRealTimers();
  });

  describe('recordDailySnapshot', () => {
    it('records daily snapshot for a model', () => {
      vi.setSystemTime(new Date('2026-01-15'));

      history.recordDailySnapshot('openai', { daily: 5.00, monthly: 50.00 });

      const snapshots = history.getHistory('openai');
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].date).toBe('2026-01-15');
      expect(snapshots[0].daily).toBe(5.00);
      expect(snapshots[0].monthly).toBe(50.00);
    });

    it('aggregates multiple records per day', () => {
      vi.setSystemTime(new Date('2026-01-15'));

      history.recordDailySnapshot('openai', { daily: 2.00, monthly: 20.00 });
      history.recordDailySnapshot('openai', { daily: 5.00, monthly: 50.00 });

      const snapshots = history.getHistory('openai');
      expect(snapshots).toHaveLength(1);
      // Should use the latest values for the day
      expect(snapshots[0].daily).toBe(5.00);
      expect(snapshots[0].monthly).toBe(50.00);
    });

    it('creates separate entries for different days', () => {
      vi.setSystemTime(new Date('2026-01-15'));
      history.recordDailySnapshot('openai', { daily: 3.00, monthly: 30.00 });

      vi.setSystemTime(new Date('2026-01-16'));
      history.recordDailySnapshot('openai', { daily: 4.00, monthly: 34.00 });

      const snapshots = history.getHistory('openai');
      expect(snapshots).toHaveLength(2);
      expect(snapshots[0].date).toBe('2026-01-15');
      expect(snapshots[1].date).toBe('2026-01-16');
    });
  });

  describe('7-day rolling window', () => {
    it('maintains only 7 days of history', () => {
      // Record 10 days of data
      for (let day = 1; day <= 10; day++) {
        vi.setSystemTime(new Date(`2026-01-${String(day).padStart(2, '0')}`));
        history.recordDailySnapshot('openai', { daily: day, monthly: day * 10 });
      }

      const snapshots = history.getHistory('openai');
      expect(snapshots).toHaveLength(7);

      // Should only have days 4-10 (latest 7)
      expect(snapshots[0].date).toBe('2026-01-04');
      expect(snapshots[6].date).toBe('2026-01-10');
    });

    it('removes oldest entries when exceeding 7 days', () => {
      // Add 7 days
      for (let day = 1; day <= 7; day++) {
        vi.setSystemTime(new Date(`2026-01-${String(day).padStart(2, '0')}`));
        history.recordDailySnapshot('openai', { daily: day, monthly: day * 10 });
      }

      // Add 8th day
      vi.setSystemTime(new Date('2026-01-08'));
      history.recordDailySnapshot('openai', { daily: 8.00, monthly: 80.00 });

      const snapshots = history.getHistory('openai');
      expect(snapshots).toHaveLength(7);
      expect(snapshots[0].date).toBe('2026-01-02'); // Day 1 removed
      expect(snapshots[6].date).toBe('2026-01-08'); // Day 8 added
    });
  });

  describe('handles missing days', () => {
    it('handles non-consecutive days correctly', () => {
      vi.setSystemTime(new Date('2026-01-10'));
      history.recordDailySnapshot('openai', { daily: 5.00, monthly: 50.00 });

      vi.setSystemTime(new Date('2026-01-15'));
      history.recordDailySnapshot('openai', { daily: 8.00, monthly: 80.00 });

      const snapshots = history.getHistory('openai');
      expect(snapshots).toHaveLength(2);
      expect(snapshots[0].date).toBe('2026-01-10');
      expect(snapshots[1].date).toBe('2026-01-15');
    });
  });

  describe('persistence', () => {
    it('persists snapshots to file', () => {
      vi.setSystemTime(new Date('2026-01-15'));
      history.recordDailySnapshot('openai', { daily: 5.00, monthly: 50.00 });

      expect(fs.existsSync(history.configPath)).toBe(true);

      const data = JSON.parse(fs.readFileSync(history.configPath, 'utf-8'));
      expect(data.openai).toBeDefined();
      expect(data.openai[0].daily).toBe(5.00);
    });

    it('loads snapshots from file on init', () => {
      const existingData = {
        openai: [
          { date: '2026-01-14', daily: 4.00, monthly: 40.00 },
          { date: '2026-01-15', daily: 5.00, monthly: 50.00 },
        ],
      };

      fs.mkdirSync(path.dirname(history.configPath), { recursive: true });
      fs.writeFileSync(history.configPath, JSON.stringify(existingData));

      const newHistory = new UsageHistory(history.configPath);
      const snapshots = newHistory.getHistory('openai');

      expect(snapshots).toHaveLength(2);
      expect(snapshots[0].date).toBe('2026-01-14');
      expect(snapshots[1].date).toBe('2026-01-15');
    });

    it('handles corrupt file gracefully', () => {
      fs.mkdirSync(path.dirname(history.configPath), { recursive: true });
      fs.writeFileSync(history.configPath, 'invalid json{');

      const newHistory = new UsageHistory(history.configPath);
      expect(newHistory.getHistory('openai')).toEqual([]);
    });
  });

  describe('getHistory', () => {
    it('returns empty array for new model', () => {
      const snapshots = history.getHistory('newmodel');
      expect(snapshots).toEqual([]);
    });

    it('returns snapshots sorted by date ascending', () => {
      vi.setSystemTime(new Date('2026-01-17'));
      history.recordDailySnapshot('openai', { daily: 7.00, monthly: 70.00 });

      vi.setSystemTime(new Date('2026-01-15'));
      history.recordDailySnapshot('openai', { daily: 5.00, monthly: 50.00 });

      vi.setSystemTime(new Date('2026-01-16'));
      history.recordDailySnapshot('openai', { daily: 6.00, monthly: 60.00 });

      const snapshots = history.getHistory('openai');
      expect(snapshots[0].date).toBe('2026-01-15');
      expect(snapshots[1].date).toBe('2026-01-16');
      expect(snapshots[2].date).toBe('2026-01-17');
    });
  });

  describe('multiple models', () => {
    it('tracks history per model independently', () => {
      vi.setSystemTime(new Date('2026-01-15'));
      history.recordDailySnapshot('openai', { daily: 5.00, monthly: 50.00 });
      history.recordDailySnapshot('deepseek', { daily: 2.00, monthly: 20.00 });

      const openaiSnapshots = history.getHistory('openai');
      const deepseekSnapshots = history.getHistory('deepseek');

      expect(openaiSnapshots).toHaveLength(1);
      expect(deepseekSnapshots).toHaveLength(1);
      expect(openaiSnapshots[0].daily).toBe(5.00);
      expect(deepseekSnapshots[0].daily).toBe(2.00);
    });
  });

  describe('getAllModels', () => {
    it('returns list of all tracked models', () => {
      vi.setSystemTime(new Date('2026-01-15'));
      history.recordDailySnapshot('openai', { daily: 5.00, monthly: 50.00 });
      history.recordDailySnapshot('deepseek', { daily: 2.00, monthly: 20.00 });

      const models = history.getAllModels();
      expect(models).toContain('openai');
      expect(models).toContain('deepseek');
      expect(models).toHaveLength(2);
    });

    it('returns empty array when no models tracked', () => {
      const models = history.getAllModels();
      expect(models).toEqual([]);
    });
  });
});
