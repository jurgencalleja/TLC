/**
 * Capture Bridge Tests - Phase 82 Tasks 1+2
 *
 * Tests for the Node.js bridge that connects Claude Code Stop hooks
 * to the TLC memory capture pipeline.
 *
 * RED: capture-bridge.js does not exist yet.
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

import {
  parseStopHookInput,
  extractLastUserMessage,
  captureExchange,
  drainSpool,
  SPOOL_FILENAME,
} from './capture-bridge.js';

describe('capture-bridge', () => {
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-capture-bridge-'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  // ── parseStopHookInput ───────────────────────────────────────────

  describe('parseStopHookInput', () => {
    it('extracts last_assistant_message from valid JSON', () => {
      const input = JSON.stringify({
        session_id: 'sess-123',
        last_assistant_message: 'We should use PostgreSQL for JSONB support',
        transcript_path: '/tmp/transcript.jsonl',
        cwd: '/projects/myapp',
      });

      const result = parseStopHookInput(input);

      expect(result).not.toBeNull();
      expect(result.sessionId).toBe('sess-123');
      expect(result.assistantMessage).toBe('We should use PostgreSQL for JSONB support');
      expect(result.transcriptPath).toBe('/tmp/transcript.jsonl');
      expect(result.cwd).toBe('/projects/myapp');
    });

    it('handles missing fields gracefully', () => {
      const input = JSON.stringify({ session_id: 'sess-456' });

      const result = parseStopHookInput(input);

      expect(result).not.toBeNull();
      expect(result.sessionId).toBe('sess-456');
      expect(result.assistantMessage).toBeNull();
      expect(result.transcriptPath).toBeNull();
    });

    it('returns null for invalid JSON', () => {
      const result = parseStopHookInput('not json at all {{{');

      expect(result).toBeNull();
    });

    it('returns null for empty input', () => {
      expect(parseStopHookInput('')).toBeNull();
      expect(parseStopHookInput(null)).toBeNull();
      expect(parseStopHookInput(undefined)).toBeNull();
    });
  });

  // ── extractLastUserMessage ───────────────────────────────────────

  describe('extractLastUserMessage', () => {
    it('reads last user turn from transcript JSONL', () => {
      const transcriptPath = path.join(testDir, 'transcript.jsonl');
      const lines = [
        JSON.stringify({ role: 'user', content: 'first question' }),
        JSON.stringify({ role: 'assistant', content: 'first answer' }),
        JSON.stringify({ role: 'user', content: 'second question' }),
        JSON.stringify({ role: 'assistant', content: 'second answer' }),
      ];
      fs.writeFileSync(transcriptPath, lines.join('\n') + '\n');

      const result = extractLastUserMessage(transcriptPath);

      expect(result).toBe('second question');
    });

    it('returns null for empty transcript', () => {
      const transcriptPath = path.join(testDir, 'empty.jsonl');
      fs.writeFileSync(transcriptPath, '');

      const result = extractLastUserMessage(transcriptPath);

      expect(result).toBeNull();
    });

    it('returns null for missing file', () => {
      const result = extractLastUserMessage('/nonexistent/transcript.jsonl');

      expect(result).toBeNull();
    });

    it('handles transcript with only assistant messages', () => {
      const transcriptPath = path.join(testDir, 'no-user.jsonl');
      const lines = [
        JSON.stringify({ role: 'assistant', content: 'hello' }),
      ];
      fs.writeFileSync(transcriptPath, lines.join('\n') + '\n');

      const result = extractLastUserMessage(transcriptPath);

      expect(result).toBeNull();
    });
  });

  // ── captureExchange ──────────────────────────────────────────────

  describe('captureExchange', () => {
    it('POSTs to capture endpoint with correct payload', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ captured: 1 }),
      });

      // Create .tlc.json so projectId can be detected
      fs.writeFileSync(
        path.join(testDir, '.tlc.json'),
        JSON.stringify({ project: 'my-app' })
      );

      await captureExchange({
        cwd: testDir,
        assistantMessage: 'Use JWT tokens for auth',
        userMessage: 'How should we handle auth?',
        sessionId: 'sess-1',
      }, { fetch: mockFetch });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/projects/my-app/memory/capture');
      expect(options.method).toBe('POST');

      const body = JSON.parse(options.body);
      expect(body.exchanges).toHaveLength(1);
      expect(body.exchanges[0].assistant).toBe('Use JWT tokens for auth');
      expect(body.exchanges[0].user).toBe('How should we handle auth?');
    });

    it('spools on POST failure', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      fs.writeFileSync(
        path.join(testDir, '.tlc.json'),
        JSON.stringify({ project: 'my-app' })
      );

      // Ensure spool directory exists
      const spoolDir = path.join(testDir, '.tlc', 'memory');
      fs.mkdirSync(spoolDir, { recursive: true });

      await captureExchange({
        cwd: testDir,
        assistantMessage: 'Use Redis for caching',
        userMessage: 'What cache should we use?',
        sessionId: 'sess-2',
      }, { fetch: mockFetch, spoolDir });

      // Should have written to spool file
      const spoolPath = path.join(spoolDir, SPOOL_FILENAME);
      expect(fs.existsSync(spoolPath)).toBe(true);

      const spoolContent = fs.readFileSync(spoolPath, 'utf-8').trim();
      const spooled = JSON.parse(spoolContent);
      expect(spooled.exchanges[0].assistant).toBe('Use Redis for caching');
    });

    it('truncates messages over 10KB', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ captured: 1 }),
      });

      fs.writeFileSync(
        path.join(testDir, '.tlc.json'),
        JSON.stringify({ project: 'my-app' })
      );

      const longMessage = 'x'.repeat(15000); // 15KB

      await captureExchange({
        cwd: testDir,
        assistantMessage: longMessage,
        userMessage: 'short question',
        sessionId: 'sess-3',
      }, { fetch: mockFetch });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.exchanges[0].assistant.length).toBeLessThanOrEqual(10240 + 20); // 10KB + truncation marker
    });

    it('never throws on any error', async () => {
      // No .tlc.json, no spool dir, fetch fails — still should not throw
      const mockFetch = vi.fn().mockRejectedValue(new Error('total failure'));

      await expect(
        captureExchange({
          cwd: '/nonexistent/path',
          assistantMessage: 'test',
          userMessage: null,
          sessionId: 'sess-4',
        }, { fetch: mockFetch })
      ).resolves.not.toThrow();
    });

    it('detects projectId from .tlc.json', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ captured: 1 }),
      });

      fs.writeFileSync(
        path.join(testDir, '.tlc.json'),
        JSON.stringify({ project: 'special-project' })
      );

      await captureExchange({
        cwd: testDir,
        assistantMessage: 'test',
        userMessage: 'test',
        sessionId: 'sess-5',
      }, { fetch: mockFetch });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('/projects/special-project/');
    });

    it('falls back to directory name when no .tlc.json', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ captured: 1 }),
      });

      // No .tlc.json in testDir

      await captureExchange({
        cwd: testDir,
        assistantMessage: 'test',
        userMessage: 'test',
        sessionId: 'sess-6',
      }, { fetch: mockFetch });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const url = mockFetch.mock.calls[0][0];
      // Should contain the directory basename as projectId
      expect(url).toContain('/projects/');
    });

    it('skips capture when assistantMessage is empty', async () => {
      const mockFetch = vi.fn();

      await captureExchange({
        cwd: testDir,
        assistantMessage: '',
        userMessage: 'test',
        sessionId: 'sess-7',
      }, { fetch: mockFetch });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // ── drainSpool ───────────────────────────────────────────────────

  describe('drainSpool', () => {
    it('posts spooled entries and removes them on success', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ captured: 1 }),
      });

      const spoolDir = path.join(testDir, '.tlc', 'memory');
      fs.mkdirSync(spoolDir, { recursive: true });

      const spoolPath = path.join(spoolDir, SPOOL_FILENAME);
      const entry1 = JSON.stringify({
        projectId: 'my-app',
        exchanges: [{ user: 'q1', assistant: 'a1', timestamp: Date.now() }],
      });
      const entry2 = JSON.stringify({
        projectId: 'my-app',
        exchanges: [{ user: 'q2', assistant: 'a2', timestamp: Date.now() }],
      });
      fs.writeFileSync(spoolPath, entry1 + '\n' + entry2 + '\n');

      await drainSpool(spoolDir, { fetch: mockFetch });

      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Spool file should be empty or removed
      if (fs.existsSync(spoolPath)) {
        expect(fs.readFileSync(spoolPath, 'utf-8').trim()).toBe('');
      }
    });

    it('handles empty spool file without error', async () => {
      const mockFetch = vi.fn();

      const spoolDir = path.join(testDir, '.tlc', 'memory');
      fs.mkdirSync(spoolDir, { recursive: true });
      fs.writeFileSync(path.join(spoolDir, SPOOL_FILENAME), '');

      await expect(drainSpool(spoolDir, { fetch: mockFetch })).resolves.not.toThrow();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('handles missing spool file without error', async () => {
      const mockFetch = vi.fn();

      await expect(drainSpool(testDir, { fetch: mockFetch })).resolves.not.toThrow();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('preserves failed entries in spool', async () => {
      // First call succeeds, second fails
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ captured: 1 }) })
        .mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const spoolDir = path.join(testDir, '.tlc', 'memory');
      fs.mkdirSync(spoolDir, { recursive: true });

      const spoolPath = path.join(spoolDir, SPOOL_FILENAME);
      const entry1 = JSON.stringify({
        projectId: 'my-app',
        exchanges: [{ user: 'q1', assistant: 'a1', timestamp: 1 }],
      });
      const entry2 = JSON.stringify({
        projectId: 'my-app',
        exchanges: [{ user: 'q2', assistant: 'a2', timestamp: 2 }],
      });
      fs.writeFileSync(spoolPath, entry1 + '\n' + entry2 + '\n');

      await drainSpool(spoolDir, { fetch: mockFetch });

      // Failed entry should remain in spool
      const remaining = fs.readFileSync(spoolPath, 'utf-8').trim();
      expect(remaining).not.toBe('');
      const parsed = JSON.parse(remaining);
      expect(parsed.exchanges[0].assistant).toBe('a2');
    });
  });
});
