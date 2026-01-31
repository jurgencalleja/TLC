import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  writeTeamDecision,
  writeTeamGotcha,
  writePersonalPreference,
  appendSessionLog,
} from './memory-writer.js';
import { initMemoryStructure, MEMORY_PATHS } from './memory-storage.js';

describe('memory-writer', () => {
  let testDir;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-memory-writer-test-'));
    await initMemoryStructure(testDir);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('writeTeamDecision', () => {
    it('creates decision file with auto-increment ID', async () => {
      await writeTeamDecision(testDir, {
        title: 'Use Postgres over MySQL',
        reasoning: 'JSONB support for flexible schemas',
        context: 'database selection',
      });

      const decisionsDir = path.join(testDir, MEMORY_PATHS.DECISIONS);
      const files = fs.readdirSync(decisionsDir);

      expect(files).toHaveLength(1);
      expect(files[0]).toMatch(/^001-use-postgres-over-mysql\.md$/);
    });

    it('increments ID for multiple decisions', async () => {
      await writeTeamDecision(testDir, { title: 'First Decision', reasoning: 'test' });
      await writeTeamDecision(testDir, { title: 'Second Decision', reasoning: 'test' });
      await writeTeamDecision(testDir, { title: 'Third Decision', reasoning: 'test' });

      const decisionsDir = path.join(testDir, MEMORY_PATHS.DECISIONS);
      const files = fs.readdirSync(decisionsDir).sort();

      expect(files).toHaveLength(3);
      expect(files[0]).toMatch(/^001-/);
      expect(files[1]).toMatch(/^002-/);
      expect(files[2]).toMatch(/^003-/);
    });

    it('includes decision content in markdown format', async () => {
      await writeTeamDecision(testDir, {
        title: 'Use Postgres',
        reasoning: 'JSONB support',
        context: 'database selection',
        alternatives: ['MySQL', 'MongoDB'],
      });

      const decisionsDir = path.join(testDir, MEMORY_PATHS.DECISIONS);
      const files = fs.readdirSync(decisionsDir);
      const content = fs.readFileSync(path.join(decisionsDir, files[0]), 'utf8');

      expect(content).toContain('# Decision: Use Postgres');
      expect(content).toContain('JSONB support');
      expect(content).toContain('database selection');
      expect(content).toContain('MySQL');
    });

    it('includes date in decision file', async () => {
      await writeTeamDecision(testDir, { title: 'Test', reasoning: 'test' });

      const decisionsDir = path.join(testDir, MEMORY_PATHS.DECISIONS);
      const files = fs.readdirSync(decisionsDir);
      const content = fs.readFileSync(path.join(decisionsDir, files[0]), 'utf8');

      const today = new Date().toISOString().split('T')[0];
      expect(content).toContain(`**Date:** ${today}`);
    });

    it('slugifies title for filename', async () => {
      await writeTeamDecision(testDir, {
        title: 'Use REST API instead of GraphQL!',
        reasoning: 'simpler',
      });

      const decisionsDir = path.join(testDir, MEMORY_PATHS.DECISIONS);
      const files = fs.readdirSync(decisionsDir);

      expect(files[0]).toBe('001-use-rest-api-instead-of-graphql.md');
    });
  });

  describe('writeTeamGotcha', () => {
    it('creates gotcha file in gotchas directory', async () => {
      await writeTeamGotcha(testDir, {
        title: 'Auth Service Warmup',
        issue: 'Auth service needs 2 seconds to warm up',
        workaround: 'Add delay in test setup',
        severity: 'medium',
      });

      const gotchasDir = path.join(testDir, MEMORY_PATHS.GOTCHAS);
      const files = fs.readdirSync(gotchasDir);

      expect(files).toHaveLength(1);
      expect(files[0]).toContain('auth-service-warmup');
    });

    it('includes gotcha content in markdown format', async () => {
      await writeTeamGotcha(testDir, {
        title: 'Auth Service Warmup',
        issue: 'Needs 2 seconds to warm up',
        workaround: 'Add delay',
        severity: 'high',
        affected: ['src/auth/*'],
      });

      const gotchasDir = path.join(testDir, MEMORY_PATHS.GOTCHAS);
      const files = fs.readdirSync(gotchasDir);
      const content = fs.readFileSync(path.join(gotchasDir, files[0]), 'utf8');

      expect(content).toContain('# Gotcha: Auth Service Warmup');
      expect(content).toContain('Needs 2 seconds');
      expect(content).toContain('Add delay');
      expect(content).toContain('**Severity:** high');
    });
  });

  describe('writePersonalPreference', () => {
    it('writes preference to preferences.json', async () => {
      await writePersonalPreference(testDir, 'codeStyle', 'functional');

      const prefsPath = path.join(testDir, MEMORY_PATHS.LOCAL, 'preferences.json');
      const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));

      expect(prefs.codeStyle).toBe('functional');
    });

    it('merges with existing preferences', async () => {
      await writePersonalPreference(testDir, 'codeStyle', 'functional');
      await writePersonalPreference(testDir, 'exports', 'named');

      const prefsPath = path.join(testDir, MEMORY_PATHS.LOCAL, 'preferences.json');
      const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));

      expect(prefs.codeStyle).toBe('functional');
      expect(prefs.exports).toBe('named');
    });

    it('overwrites existing preference value', async () => {
      await writePersonalPreference(testDir, 'codeStyle', 'functional');
      await writePersonalPreference(testDir, 'codeStyle', 'object-oriented');

      const prefsPath = path.join(testDir, MEMORY_PATHS.LOCAL, 'preferences.json');
      const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));

      expect(prefs.codeStyle).toBe('object-oriented');
    });

    it('supports nested preference objects', async () => {
      await writePersonalPreference(testDir, 'testing', {
        framework: 'vitest',
        style: 'describe-it',
      });

      const prefsPath = path.join(testDir, MEMORY_PATHS.LOCAL, 'preferences.json');
      const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));

      expect(prefs.testing.framework).toBe('vitest');
      expect(prefs.testing.style).toBe('describe-it');
    });
  });

  describe('appendSessionLog', () => {
    it('appends entry to daily session log', async () => {
      await appendSessionLog(testDir, {
        type: 'decision',
        content: 'use JWT for auth',
        classification: 'team',
      });

      const today = new Date().toISOString().split('T')[0];
      const logPath = path.join(testDir, MEMORY_PATHS.SESSIONS, `${today}.jsonl`);

      expect(fs.existsSync(logPath)).toBe(true);

      const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n');
      const entry = JSON.parse(lines[0]);

      expect(entry.type).toBe('decision');
      expect(entry.content).toBe('use JWT for auth');
    });

    it('adds timestamp to each entry', async () => {
      await appendSessionLog(testDir, { type: 'test', content: 'hello' });

      const today = new Date().toISOString().split('T')[0];
      const logPath = path.join(testDir, MEMORY_PATHS.SESSIONS, `${today}.jsonl`);
      const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n');
      const entry = JSON.parse(lines[0]);

      expect(entry).toHaveProperty('ts');
      expect(entry.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('appends multiple entries to same file', async () => {
      await appendSessionLog(testDir, { type: 'first', content: 'one' });
      await appendSessionLog(testDir, { type: 'second', content: 'two' });
      await appendSessionLog(testDir, { type: 'third', content: 'three' });

      const today = new Date().toISOString().split('T')[0];
      const logPath = path.join(testDir, MEMORY_PATHS.SESSIONS, `${today}.jsonl`);
      const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n');

      expect(lines).toHaveLength(3);
    });

    it('creates session directory if missing', async () => {
      // Remove sessions directory
      const sessionsDir = path.join(testDir, MEMORY_PATHS.SESSIONS);
      fs.rmSync(sessionsDir, { recursive: true });

      await appendSessionLog(testDir, { type: 'test', content: 'hello' });

      expect(fs.existsSync(sessionsDir)).toBe(true);
    });
  });
});
