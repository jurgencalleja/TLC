/**
 * Memory wiring E2E tests - Phase 84 Task 4
 *
 * Proves the full memory loop: exchange → observeAndRemember → file written → adapter reads back.
 * This is the definitive test that memory actually works end-to-end.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { observeAndRemember } from './memory-observer.js';
import { createMemoryStoreAdapter } from './memory-store-adapter.js';

describe('memory wiring e2e', () => {
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-wiring-e2e-'));
    // Create full memory directory structure
    fs.mkdirSync(path.join(testDir, '.tlc', 'memory', 'team', 'decisions'), { recursive: true });
    fs.mkdirSync(path.join(testDir, '.tlc', 'memory', 'team', 'gotchas'), { recursive: true });
    fs.mkdirSync(path.join(testDir, '.tlc', 'memory', '.local', 'preferences'), { recursive: true });
    fs.mkdirSync(path.join(testDir, '.tlc', 'memory', '.local', 'sessions'), { recursive: true });
    fs.writeFileSync(path.join(testDir, '.tlc.json'), JSON.stringify({ project: 'wiring-test' }));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('decision exchange → file created → adapter reads it back', async () => {
    const exchange = {
      user: "let's use PostgreSQL instead of MySQL for better JSONB support.",
      assistant: 'Good choice. PostgreSQL has excellent JSONB support.',
    };

    await observeAndRemember(testDir, exchange);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Adapter reads it back
    const adapter = createMemoryStoreAdapter(testDir);
    const decisions = await adapter.listDecisions();
    expect(decisions.length).toBeGreaterThanOrEqual(1);
  });

  it('gotcha exchange → file created → adapter reads it back', async () => {
    const exchange = {
      user: 'watch out for the SQLite WAL mode issue under concurrent writes.',
      assistant: 'Noted. Serialize database operations to avoid corruption.',
    };

    await observeAndRemember(testDir, exchange);
    await new Promise(resolve => setTimeout(resolve, 500));

    const adapter = createMemoryStoreAdapter(testDir);
    const gotchas = await adapter.listGotchas();
    expect(gotchas.length).toBeGreaterThanOrEqual(1);
  });

  it('stats reflect actual file counts', async () => {
    // Write a decision
    const exchange = {
      user: "we decided to use Redis as our caching layer instead of Memcached.",
      assistant: 'Redis is more versatile for caching.',
    };

    await observeAndRemember(testDir, exchange);
    await new Promise(resolve => setTimeout(resolve, 500));

    const adapter = createMemoryStoreAdapter(testDir);
    const stats = await adapter.getStats();
    expect(stats.decisions).toBeGreaterThanOrEqual(1);
    expect(stats.total).toBeGreaterThanOrEqual(1);
  });

  it('empty project returns empty arrays without crashing', async () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-empty-'));
    fs.writeFileSync(path.join(emptyDir, '.tlc.json'), JSON.stringify({ project: 'empty' }));

    const adapter = createMemoryStoreAdapter(emptyDir);
    const decisions = await adapter.listDecisions();
    const gotchas = await adapter.listGotchas();
    const stats = await adapter.getStats();

    expect(decisions).toEqual([]);
    expect(gotchas).toEqual([]);
    expect(stats.total).toBe(0);

    fs.rmSync(emptyDir, { recursive: true, force: true });
  });
});
