/**
 * Memory Bridge E2E Tests - Phase 82 Task 5
 *
 * Tests the full pipeline: capture → observeAndRemember → pattern detect → file store.
 * Proves the memory system achieves its original goal.
 *
 * RED: depends on capture-bridge.js (Task 1) and capture-guard.js (Task 4).
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { captureExchange, drainSpool, SPOOL_FILENAME } from './capture-bridge.js';
import { observeAndRemember } from './memory-observer.js';

describe('memory-bridge e2e', () => {
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-bridge-e2e-'));
    // Create memory directory structure
    fs.mkdirSync(path.join(testDir, '.tlc', 'memory', 'team', 'decisions'), { recursive: true });
    fs.mkdirSync(path.join(testDir, '.tlc', 'memory', 'team', 'gotchas'), { recursive: true });
    fs.mkdirSync(path.join(testDir, '.tlc', 'memory', '.local'), { recursive: true });
    fs.writeFileSync(path.join(testDir, '.tlc.json'), JSON.stringify({ project: 'e2e-test' }));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('decision in assistant response creates decision file', async () => {
    const exchange = {
      assistant: 'We decided to use PostgreSQL instead of MySQL because we need JSONB support and strong consistency guarantees.',
    };

    await observeAndRemember(testDir, exchange);

    // Wait for async processing (setImmediate-based)
    await new Promise(resolve => setTimeout(resolve, 200));

    // Check that a decision file was created
    const decisionsDir = path.join(testDir, '.tlc', 'memory', 'team', 'decisions');
    const files = fs.readdirSync(decisionsDir);
    expect(files.length).toBeGreaterThanOrEqual(1);
  });

  it('gotcha in assistant response creates gotcha file', async () => {
    const exchange = {
      assistant: 'Watch out — the PGlite WASM driver crashes under heavy concurrent writes. You need to serialize database operations or use real PostgreSQL.',
    };

    await observeAndRemember(testDir, exchange);

    await new Promise(resolve => setTimeout(resolve, 200));

    const gotchasDir = path.join(testDir, '.tlc', 'memory', 'team', 'gotchas');
    const files = fs.readdirSync(gotchasDir);
    expect(files.length).toBeGreaterThanOrEqual(1);
  });

  it('full pipeline: captureExchange → observe → file stored', async () => {
    // Simulate what the Stop hook does: POST to a mock server that calls observeAndRemember
    let capturedExchange = null;

    // Mock fetch that simulates the server calling observeAndRemember
    const mockFetch = vi.fn().mockImplementation(async (url, opts) => {
      const body = JSON.parse(opts.body);
      for (const ex of body.exchanges) {
        capturedExchange = ex;
        await observeAndRemember(testDir, ex);
      }
      return { ok: true, json: async () => ({ captured: body.exchanges.length }) };
    });

    await captureExchange({
      cwd: testDir,
      assistantMessage: 'Let\'s use JWT tokens instead of sessions for authentication because we need stateless horizontal scaling.',
      userMessage: 'How should we handle auth?',
      sessionId: 'e2e-sess-1',
    }, { fetch: mockFetch });

    await new Promise(resolve => setTimeout(resolve, 300));

    // Verify the exchange was captured
    expect(capturedExchange).not.toBeNull();
    expect(capturedExchange.assistant).toContain('JWT tokens');

    // Verify a decision file was created
    const decisionsDir = path.join(testDir, '.tlc', 'memory', 'team', 'decisions');
    const files = fs.readdirSync(decisionsDir);
    expect(files.length).toBeGreaterThanOrEqual(1);
  });

  it('spool entry captured after drain', async () => {
    const spoolDir = path.join(testDir, '.tlc', 'memory');
    const spoolPath = path.join(spoolDir, SPOOL_FILENAME);

    // Write a spooled entry with a decision
    const spooledEntry = JSON.stringify({
      projectId: 'e2e-test',
      exchanges: [{
        user: 'What database should we use?',
        assistant: 'We decided to use SQLite for the vector store because it embeds directly and needs no separate process.',
        timestamp: Date.now(),
      }],
    });
    fs.writeFileSync(spoolPath, spooledEntry + '\n');

    // Mock fetch that calls observeAndRemember (like the real server would)
    const mockFetch = vi.fn().mockImplementation(async (url, opts) => {
      const body = JSON.parse(opts.body);
      for (const ex of body.exchanges) {
        await observeAndRemember(testDir, ex);
      }
      return { ok: true, json: async () => ({ captured: body.exchanges.length }) };
    });

    await drainSpool(spoolDir, { fetch: mockFetch });

    await new Promise(resolve => setTimeout(resolve, 300));

    // Spool should be drained
    if (fs.existsSync(spoolPath)) {
      expect(fs.readFileSync(spoolPath, 'utf-8').trim()).toBe('');
    }

    // Decision file should have been created from the spooled exchange
    const decisionsDir = path.join(testDir, '.tlc', 'memory', 'team', 'decisions');
    const files = fs.readdirSync(decisionsDir);
    expect(files.length).toBeGreaterThanOrEqual(1);
  });

  it('duplicate exchange captured only once', async () => {
    const exchange = {
      assistant: 'We decided to use Redis as our caching layer for session storage.',
    };

    await observeAndRemember(testDir, exchange);
    await new Promise(resolve => setTimeout(resolve, 200));

    const decisionsDir = path.join(testDir, '.tlc', 'memory', 'team', 'decisions');
    const countAfterFirst = fs.readdirSync(decisionsDir).length;

    // Same exchange again
    await observeAndRemember(testDir, exchange);
    await new Promise(resolve => setTimeout(resolve, 200));

    const countAfterSecond = fs.readdirSync(decisionsDir).length;

    // Should not create a duplicate file (observer deduplicates by content)
    expect(countAfterSecond).toBe(countAfterFirst);
  });
});
