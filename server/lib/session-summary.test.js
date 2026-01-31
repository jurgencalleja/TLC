import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { generateSessionSummary, formatSummary } from './session-summary.js';
import { initMemoryStructure } from './memory-storage.js';
import { writeTeamDecision, writeTeamGotcha, writePersonalPreference, appendSessionLog } from './memory-writer.js';

describe('session-summary', () => {
  let testDir;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-summary-test-'));
    await initMemoryStructure(testDir);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('generateSessionSummary', () => {
    it('returns empty summary for no memory', async () => {
      const summary = await generateSessionSummary(testDir);

      expect(summary.decisions).toHaveLength(0);
      expect(summary.preferences).toEqual({});
      expect(summary.gotchas).toHaveLength(0);
    });

    it('includes decisions from session', async () => {
      await writeTeamDecision(testDir, {
        title: 'Use PostgreSQL',
        reasoning: 'JSONB support',
      });

      const summary = await generateSessionSummary(testDir);

      expect(summary.decisions).toHaveLength(1);
      expect(summary.decisions[0].title).toBe('Use PostgreSQL');
    });

    it('includes preferences from session', async () => {
      await writePersonalPreference(testDir, 'codeStyle', 'functional');
      await writePersonalPreference(testDir, 'exports', 'named');

      const summary = await generateSessionSummary(testDir);

      expect(summary.preferences.codeStyle).toBe('functional');
      expect(summary.preferences.exports).toBe('named');
    });

    it('includes gotchas from session', async () => {
      await writeTeamGotcha(testDir, {
        title: 'Auth warmup delay',
        issue: 'Service needs 2s to warm up',
      });

      const summary = await generateSessionSummary(testDir);

      expect(summary.gotchas).toHaveLength(1);
      expect(summary.gotchas[0].title).toBe('Auth warmup delay');
    });

    it('includes session activity count', async () => {
      await appendSessionLog(testDir, { type: 'decision', content: 'chose REST' });
      await appendSessionLog(testDir, { type: 'preference', content: 'functional style' });

      const summary = await generateSessionSummary(testDir);

      expect(summary.activityCount).toBeGreaterThanOrEqual(2);
    });

    it('limits to recent items only', async () => {
      for (let i = 0; i < 20; i++) {
        await writeTeamDecision(testDir, {
          title: `Decision ${i}`,
          reasoning: 'Test',
        });
      }

      const summary = await generateSessionSummary(testDir, { limit: 5 });

      expect(summary.decisions.length).toBeLessThanOrEqual(5);
    });
  });

  describe('formatSummary', () => {
    it('formats summary as markdown', () => {
      const summary = {
        decisions: [{ title: 'Use PostgreSQL', reasoning: 'JSONB' }],
        preferences: { style: 'functional' },
        gotchas: [{ title: 'Auth delay', issue: 'warmup' }],
        activityCount: 5,
      };

      const formatted = formatSummary(summary);

      expect(formatted).toContain('Session Summary');
      expect(formatted).toContain('PostgreSQL');
      expect(formatted).toContain('functional');
      expect(formatted).toContain('Auth delay');
    });

    it('handles empty summary', () => {
      const summary = {
        decisions: [],
        preferences: {},
        gotchas: [],
        activityCount: 0,
      };

      const formatted = formatSummary(summary);

      expect(formatted).toContain('No new');
    });

    it('includes activity count', () => {
      const summary = {
        decisions: [],
        preferences: {},
        gotchas: [],
        activityCount: 10,
      };

      const formatted = formatSummary(summary);

      expect(formatted).toContain('10');
    });

    it('formats decisions with reasoning', () => {
      const summary = {
        decisions: [{ title: 'Test', reasoning: 'Because reasons' }],
        preferences: {},
        gotchas: [],
        activityCount: 1,
      };

      const formatted = formatSummary(summary);

      expect(formatted).toContain('Because reasons');
    });

    it('formats gotchas with issue', () => {
      const summary = {
        decisions: [],
        preferences: {},
        gotchas: [{ title: 'Bug', issue: 'Something broke' }],
        activityCount: 1,
      };

      const formatted = formatSummary(summary);

      expect(formatted).toContain('Something broke');
    });
  });
});
