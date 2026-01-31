import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { buildSessionContext, estimateTokens } from './context-builder.js';
import { initMemoryStructure } from './memory-storage.js';
import { writeTeamDecision, writeTeamGotcha, writePersonalPreference, appendSessionLog } from './memory-writer.js';

describe('context-builder', () => {
  let testDir;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-context-test-'));
    await initMemoryStructure(testDir);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('buildSessionContext', () => {
    it('returns empty context when no memory exists', async () => {
      const context = await buildSessionContext(testDir);
      expect(context).toBe('');
    });

    it('includes personal preferences', async () => {
      await writePersonalPreference(testDir, 'codeStyle', 'functional');
      await writePersonalPreference(testDir, 'exports', 'named');

      const context = await buildSessionContext(testDir);

      expect(context).toContain('functional');
      expect(context).toContain('named');
    });

    it('includes team decisions', async () => {
      await writeTeamDecision(testDir, {
        title: 'Use Postgres',
        reasoning: 'JSONB support',
      });

      const context = await buildSessionContext(testDir);

      expect(context).toContain('Postgres');
    });

    it('includes team gotchas', async () => {
      await writeTeamGotcha(testDir, {
        title: 'Auth Warmup',
        issue: 'Service needs 2 seconds',
      });

      const context = await buildSessionContext(testDir);

      expect(context).toContain('Auth Warmup');
    });

    it('includes recent session activity', async () => {
      await appendSessionLog(testDir, { type: 'decision', content: 'chose REST API' });

      const context = await buildSessionContext(testDir);

      expect(context).toContain('REST API');
    });

    it('limits context to token budget', async () => {
      // Create lots of decisions
      for (let i = 0; i < 50; i++) {
        await writeTeamDecision(testDir, {
          title: `Decision ${i}`,
          reasoning: 'A'.repeat(200), // Long reasoning
        });
      }

      const context = await buildSessionContext(testDir, { maxTokens: 500 });
      const tokens = estimateTokens(context);

      expect(tokens).toBeLessThanOrEqual(500);
    });

    it('formats context as markdown', async () => {
      await writeTeamDecision(testDir, { title: 'Use Postgres', reasoning: 'JSONB' });
      await writePersonalPreference(testDir, 'style', 'functional');

      const context = await buildSessionContext(testDir);

      expect(context).toContain('## ');
      expect(context).toContain('- ');
    });

    it('prioritizes recent items', async () => {
      await writeTeamDecision(testDir, { title: 'Old Decision', reasoning: 'old' });
      // Simulate time passing
      await new Promise(r => setTimeout(r, 10));
      await writeTeamDecision(testDir, { title: 'New Decision', reasoning: 'new' });

      const context = await buildSessionContext(testDir, { maxTokens: 100 });

      // New decision should appear if space is limited
      expect(context).toContain('New Decision');
    });
  });

  describe('estimateTokens', () => {
    it('estimates tokens from text', () => {
      const text = 'Hello world this is a test';
      const tokens = estimateTokens(text);

      // Rough estimate: ~1 token per 4 chars
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(text.length);
    });

    it('returns 0 for empty text', () => {
      expect(estimateTokens('')).toBe(0);
      expect(estimateTokens(null)).toBe(0);
    });
  });
});
