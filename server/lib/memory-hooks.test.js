import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createMemoryHooks, MemoryHooks } from './memory-hooks.js';
import { initMemoryStructure } from './memory-storage.js';

describe('memory-hooks', () => {
  let testDir;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-hooks-test-'));
    await initMemoryStructure(testDir);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('createMemoryHooks', () => {
    it('returns hooks object', () => {
      const hooks = createMemoryHooks(testDir);

      expect(hooks).toHaveProperty('onSessionStart');
      expect(hooks).toHaveProperty('onResponse');
      expect(hooks).toHaveProperty('onSessionEnd');
      expect(hooks).toHaveProperty('beforeCommand');
      expect(hooks).toHaveProperty('afterCommand');
    });

    it('hooks are callable functions', () => {
      const hooks = createMemoryHooks(testDir);

      expect(typeof hooks.onSessionStart).toBe('function');
      expect(typeof hooks.onResponse).toBe('function');
      expect(typeof hooks.onSessionEnd).toBe('function');
    });
  });

  describe('onSessionStart', () => {
    it('returns context for injection', async () => {
      const hooks = createMemoryHooks(testDir);
      const context = await hooks.onSessionStart();

      expect(context).toHaveProperty('context');
    });

    it('returns empty context for new project', async () => {
      const hooks = createMemoryHooks(testDir);
      const result = await hooks.onSessionStart();

      // New project has no memory, so context should be empty
      expect(result.context).toBe('');
    });
  });

  describe('onResponse', () => {
    it('observes response for patterns', async () => {
      const hooks = createMemoryHooks(testDir);

      // Should not throw
      await expect(hooks.onResponse('let\'s use PostgreSQL instead of MySQL')).resolves.not.toThrow();
    });

    it('returns detection results', async () => {
      const hooks = createMemoryHooks(testDir);
      const result = await hooks.onResponse('let\'s use PostgreSQL instead of MySQL');

      expect(result).toHaveProperty('detected');
    });
  });

  describe('onSessionEnd', () => {
    it('returns session summary', async () => {
      const hooks = createMemoryHooks(testDir);
      const summary = await hooks.onSessionEnd();

      expect(summary).toHaveProperty('summary');
    });

    it('includes formatted summary text', async () => {
      const hooks = createMemoryHooks(testDir);
      const result = await hooks.onSessionEnd();

      expect(typeof result.summary).toBe('string');
    });
  });

  describe('beforeCommand', () => {
    it('runs without error', async () => {
      const hooks = createMemoryHooks(testDir);

      await expect(hooks.beforeCommand('build')).resolves.not.toThrow();
    });

    it('returns command context', async () => {
      const hooks = createMemoryHooks(testDir);
      const result = await hooks.beforeCommand('build');

      expect(result).toHaveProperty('command');
      expect(result.command).toBe('build');
    });
  });

  describe('afterCommand', () => {
    it('runs without error', async () => {
      const hooks = createMemoryHooks(testDir);

      await expect(hooks.afterCommand('build', { success: true })).resolves.not.toThrow();
    });

    it('logs command result', async () => {
      const hooks = createMemoryHooks(testDir);
      const result = await hooks.afterCommand('build', { success: true });

      expect(result).toHaveProperty('logged');
    });
  });

  describe('MemoryHooks class', () => {
    it('can be instantiated', () => {
      const hooks = new MemoryHooks(testDir);
      expect(hooks).toBeInstanceOf(MemoryHooks);
    });

    it('shares state across calls', async () => {
      const hooks = new MemoryHooks(testDir);

      await hooks.onSessionStart();
      await hooks.onResponse('test response');
      const result = await hooks.onSessionEnd();

      expect(result).toBeTruthy();
    });
  });
});
