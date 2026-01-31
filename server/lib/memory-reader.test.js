import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  loadTeamDecisions,
  loadTeamGotchas,
  loadPersonalPreferences,
  loadRecentSessions,
  searchMemory,
} from './memory-reader.js';
import { initMemoryStructure, MEMORY_PATHS } from './memory-storage.js';
import { writeTeamDecision, writeTeamGotcha, writePersonalPreference, appendSessionLog } from './memory-writer.js';

describe('memory-reader', () => {
  let testDir;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-memory-reader-test-'));
    await initMemoryStructure(testDir);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('loadTeamDecisions', () => {
    it('returns empty array when no decisions', async () => {
      const decisions = await loadTeamDecisions(testDir);
      expect(decisions).toEqual([]);
    });

    it('loads all decision files', async () => {
      await writeTeamDecision(testDir, { title: 'Use Postgres', reasoning: 'JSONB' });
      await writeTeamDecision(testDir, { title: 'Use REST', reasoning: 'simpler' });

      const decisions = await loadTeamDecisions(testDir);

      expect(decisions).toHaveLength(2);
    });

    it('parses decision content', async () => {
      await writeTeamDecision(testDir, {
        title: 'Use Postgres',
        reasoning: 'JSONB support',
        context: 'database selection',
      });

      const decisions = await loadTeamDecisions(testDir);

      expect(decisions[0]).toHaveProperty('title', 'Use Postgres');
      expect(decisions[0]).toHaveProperty('reasoning');
      expect(decisions[0].reasoning).toContain('JSONB');
    });

    it('includes filename and id in parsed decision', async () => {
      await writeTeamDecision(testDir, { title: 'Test Decision', reasoning: 'test' });

      const decisions = await loadTeamDecisions(testDir);

      expect(decisions[0]).toHaveProperty('id', '001');
      expect(decisions[0]).toHaveProperty('filename');
    });
  });

  describe('loadTeamGotchas', () => {
    it('returns empty array when no gotchas', async () => {
      const gotchas = await loadTeamGotchas(testDir);
      expect(gotchas).toEqual([]);
    });

    it('loads all gotcha files', async () => {
      await writeTeamGotcha(testDir, { title: 'Auth Warmup', issue: 'needs delay' });
      await writeTeamGotcha(testDir, { title: 'DB Timeout', issue: 'increase pool' });

      const gotchas = await loadTeamGotchas(testDir);

      expect(gotchas).toHaveLength(2);
    });

    it('parses gotcha content', async () => {
      await writeTeamGotcha(testDir, {
        title: 'Auth Warmup',
        issue: 'Service needs 2 seconds to warm up',
        severity: 'high',
      });

      const gotchas = await loadTeamGotchas(testDir);

      expect(gotchas[0]).toHaveProperty('title', 'Auth Warmup');
      expect(gotchas[0]).toHaveProperty('issue');
      expect(gotchas[0].issue).toContain('2 seconds');
    });
  });

  describe('loadPersonalPreferences', () => {
    it('returns empty object when no preferences', async () => {
      const prefs = await loadPersonalPreferences(testDir);
      expect(prefs).toEqual({});
    });

    it('loads preferences from file', async () => {
      await writePersonalPreference(testDir, 'codeStyle', 'functional');
      await writePersonalPreference(testDir, 'exports', 'named');

      const prefs = await loadPersonalPreferences(testDir);

      expect(prefs.codeStyle).toBe('functional');
      expect(prefs.exports).toBe('named');
    });

    it('loads nested preference objects', async () => {
      await writePersonalPreference(testDir, 'testing', {
        framework: 'vitest',
        style: 'describe-it',
      });

      const prefs = await loadPersonalPreferences(testDir);

      expect(prefs.testing.framework).toBe('vitest');
    });
  });

  describe('loadRecentSessions', () => {
    it('returns empty array when no sessions', async () => {
      const sessions = await loadRecentSessions(testDir, 5);
      expect(sessions).toEqual([]);
    });

    it('loads session entries from today', async () => {
      await appendSessionLog(testDir, { type: 'decision', content: 'use JWT' });
      await appendSessionLog(testDir, { type: 'gotcha', content: 'auth warmup' });

      const sessions = await loadRecentSessions(testDir, 5);

      expect(sessions).toHaveLength(2);
      expect(sessions[0].type).toBe('decision');
      expect(sessions[1].type).toBe('gotcha');
    });

    it('limits number of sessions returned', async () => {
      for (let i = 0; i < 10; i++) {
        await appendSessionLog(testDir, { type: 'test', content: `entry ${i}` });
      }

      const sessions = await loadRecentSessions(testDir, 3);

      expect(sessions.length).toBeLessThanOrEqual(3);
    });

    it('returns most recent entries when limited', async () => {
      for (let i = 0; i < 5; i++) {
        await appendSessionLog(testDir, { type: 'test', content: `entry ${i}` });
      }

      const sessions = await loadRecentSessions(testDir, 2);

      // Should get the last 2 entries
      expect(sessions[0].content).toBe('entry 3');
      expect(sessions[1].content).toBe('entry 4');
    });
  });

  describe('searchMemory', () => {
    it('returns empty array when no matches', async () => {
      const results = await searchMemory(testDir, 'nonexistent');
      expect(results).toEqual([]);
    });

    it('searches decisions by keyword', async () => {
      await writeTeamDecision(testDir, { title: 'Use Postgres', reasoning: 'JSONB support' });
      await writeTeamDecision(testDir, { title: 'Use REST', reasoning: 'simpler API' });

      const results = await searchMemory(testDir, 'postgres');

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('decision');
    });

    it('searches gotchas by keyword', async () => {
      await writeTeamGotcha(testDir, { title: 'Auth Warmup', issue: 'needs delay' });

      const results = await searchMemory(testDir, 'warmup');

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('gotcha');
    });

    it('searches case-insensitively', async () => {
      await writeTeamDecision(testDir, { title: 'Use PostgreSQL', reasoning: 'JSONB' });

      const results = await searchMemory(testDir, 'POSTGRESQL');

      expect(results).toHaveLength(1);
    });

    it('searches across all memory types', async () => {
      await writeTeamDecision(testDir, { title: 'Auth Decision', reasoning: 'JWT tokens' });
      await writeTeamGotcha(testDir, { title: 'Auth Gotcha', issue: 'warmup delay' });
      await appendSessionLog(testDir, { type: 'note', content: 'Auth discussion today' });

      const results = await searchMemory(testDir, 'auth');

      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it('returns content snippet in results', async () => {
      await writeTeamDecision(testDir, { title: 'Use Postgres', reasoning: 'JSONB support for flexible schemas' });

      const results = await searchMemory(testDir, 'postgres');

      expect(results[0]).toHaveProperty('content');
      expect(results[0].content).toContain('Postgres');
    });
  });
});
