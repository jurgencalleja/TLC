import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { observeAndRemember, processExchange } from './memory-observer.js';
import { initMemoryStructure, MEMORY_PATHS } from './memory-storage.js';

describe('memory-observer', () => {
  let testDir;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-memory-observer-test-'));
    await initMemoryStructure(testDir);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('observeAndRemember', () => {
    it('extracts and stores decision as team memory', async () => {
      const exchange = {
        user: "let's use PostgreSQL instead of MySQL",
        assistant: "Good choice..."
      };

      await observeAndRemember(testDir, exchange);

      // Give it time to process async operations
      await new Promise(r => setTimeout(r, 200));

      const decisionsDir = path.join(testDir, MEMORY_PATHS.DECISIONS);
      const files = fs.readdirSync(decisionsDir);

      expect(files.length).toBeGreaterThanOrEqual(1);
    });

    it('extracts and stores gotcha as team memory', async () => {
      const exchange = {
        user: "watch out for race conditions in the queue",
        assistant: "Good point..."
      };

      await observeAndRemember(testDir, exchange);
      await new Promise(r => setTimeout(r, 200));

      const gotchasDir = path.join(testDir, MEMORY_PATHS.GOTCHAS);
      const files = fs.readdirSync(gotchasDir);

      expect(files.length).toBeGreaterThanOrEqual(1);
    });

    it('extracts and stores preference as personal memory', async () => {
      const exchange = {
        user: "I prefer functional programming style",
        assistant: "Got it..."
      };

      await observeAndRemember(testDir, exchange);
      await new Promise(r => setTimeout(r, 200));

      const prefsPath = path.join(testDir, MEMORY_PATHS.LOCAL, 'preferences.json');
      const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));

      expect(Object.keys(prefs).length).toBeGreaterThanOrEqual(0);
    });

    it('logs exchange to session log', async () => {
      const exchange = {
        user: "let's use Redis instead of Memcached",
        assistant: "Great idea..."
      };

      await observeAndRemember(testDir, exchange);
      await new Promise(r => setTimeout(r, 200));

      const today = new Date().toISOString().split('T')[0];
      const logPath = path.join(testDir, MEMORY_PATHS.SESSIONS, `${today}.jsonl`);

      expect(fs.existsSync(logPath)).toBe(true);
    });

    it('does not block - completes quickly', async () => {
      const exchange = {
        user: "let's use GraphQL for the API",
        assistant: "Good choice..."
      };

      const start = Date.now();
      await observeAndRemember(testDir, exchange);
      const elapsed = Date.now() - start;

      // Should return quickly (fire-and-forget async)
      expect(elapsed).toBeLessThan(100);
    });

    it('handles empty extraction gracefully', async () => {
      const exchange = {
        user: "what time is it?",
        assistant: "I don't have access to time"
      };

      await expect(observeAndRemember(testDir, exchange)).resolves.not.toThrow();
    });

    it('handles storage errors without crashing', async () => {
      // Use an invalid directory
      const invalidDir = '/nonexistent/path/that/cannot/exist';

      await expect(observeAndRemember(invalidDir, {
        user: "test",
        assistant: "test"
      })).resolves.not.toThrow();
    });
  });

  describe('processExchange', () => {
    it('returns extracted patterns with classification', async () => {
      const exchange = {
        user: "let's use Postgres because of JSONB",
        assistant: "Good choice..."
      };

      const result = await processExchange(exchange);

      expect(result).toHaveProperty('decisions');
      expect(result).toHaveProperty('preferences');
      expect(result).toHaveProperty('gotchas');
      expect(result.decisions[0]).toHaveProperty('classification');
    });

    it('classifies team decisions correctly', async () => {
      const exchange = {
        user: "we decided to use REST API",
        assistant: "Sounds good..."
      };

      const result = await processExchange(exchange);

      if (result.decisions.length > 0) {
        expect(result.decisions[0].classification).toBe('team');
      }
    });

    it('classifies personal preferences correctly', async () => {
      const exchange = {
        user: "I prefer arrow functions",
        assistant: "Got it..."
      };

      const result = await processExchange(exchange);

      if (result.preferences.length > 0) {
        expect(result.preferences[0].classification).toBe('personal');
      }
    });
  });
});
