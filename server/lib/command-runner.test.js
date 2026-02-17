import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const { createCommandRunner } = await import('./command-runner.js');

describe('CommandRunner', () => {
  let runner;
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmd-runner-test-'));
    runner = createCommandRunner({
      _checkDocker: vi.fn().mockResolvedValue(false),
      _checkClaude: vi.fn().mockReturnValue(false),
    });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('detectExecutionMethod', () => {
    it('returns container when tlc-standalone image exists', async () => {
      const r = createCommandRunner({
        _checkDocker: vi.fn().mockResolvedValue(true),
        _checkClaude: vi.fn().mockReturnValue(false),
      });
      const method = await r.detectExecutionMethod(tempDir);
      expect(method).toBe('container');
    });

    it('returns claude-code when Claude Code process running', async () => {
      const r = createCommandRunner({
        _checkDocker: vi.fn().mockResolvedValue(false),
        _checkClaude: vi.fn().mockReturnValue(true),
      });
      const method = await r.detectExecutionMethod(tempDir);
      expect(method).toBe('claude-code');
    });

    it('returns queue as fallback', async () => {
      const method = await runner.detectExecutionMethod(tempDir);
      expect(method).toBe('queue');
    });
  });

  describe('queueCommand', () => {
    it('appends task to PLAN.md', async () => {
      const planDir = path.join(tempDir, '.planning', 'phases');
      fs.mkdirSync(planDir, { recursive: true });
      fs.writeFileSync(path.join(planDir, '1-PLAN.md'), '# Phase 1\n');

      const result = await runner.queueCommand(tempDir, 'build');
      expect(result.queued).toBe(true);
      expect(result.method).toBe('queue');
    });
  });

  describe('getCommandHistory', () => {
    it('returns recent commands', () => {
      const histDir = path.join(tempDir, '.tlc');
      fs.mkdirSync(histDir, { recursive: true });
      fs.writeFileSync(path.join(histDir, 'command-history.json'), JSON.stringify([
        { command: 'build', timestamp: '2026-02-18T00:00:00Z', method: 'queue' },
      ]));

      const history = runner.getCommandHistory(tempDir);
      expect(history).toHaveLength(1);
      expect(history[0].command).toBe('build');
    });

    it('returns empty array when no history', () => {
      const history = runner.getCommandHistory(tempDir);
      expect(history).toEqual([]);
    });
  });

  describe('validateCommand', () => {
    it('accepts valid commands', () => {
      expect(runner.validateCommand('build')).toBe(true);
      expect(runner.validateCommand('deploy')).toBe(true);
      expect(runner.validateCommand('test')).toBe(true);
    });

    it('rejects invalid commands', () => {
      expect(runner.validateCommand('')).toBe(false);
      expect(runner.validateCommand(null)).toBe(false);
    });
  });
});
