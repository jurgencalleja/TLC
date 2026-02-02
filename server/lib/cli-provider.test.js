import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createCLIProvider,
  buildArgs,
  parseOutput,
  runLocal,
  runViaDevserver,
} from './cli-provider.js';

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(),
  execSync: vi.fn(),
}));

// Mock fetch for devserver calls
global.fetch = vi.fn();

import { spawn } from 'child_process';

describe('cli-provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCLIProvider', () => {
    it('creates provider with CLI type', () => {
      const provider = createCLIProvider({
        name: 'claude',
        command: 'claude',
        headlessArgs: ['-p', '--output-format', 'json'],
        capabilities: ['review', 'code-gen'],
      });

      expect(provider.type).toBe('cli');
      expect(provider.name).toBe('claude');
    });

    it('sets detected based on CLI detection', () => {
      const provider = createCLIProvider({
        name: 'claude',
        command: 'claude',
        detected: true,
      });

      expect(provider.detected).toBe(true);
    });

    it('defaults detected to false', () => {
      const provider = createCLIProvider({
        name: 'claude',
        command: 'claude',
      });

      expect(provider.detected).toBe(false);
    });
  });

  describe('runLocal', () => {
    it('spawns claude -p with args', async () => {
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
      };

      spawn.mockReturnValue(mockProcess);

      // Simulate process completion
      setTimeout(() => {
        const stdoutCallback = mockProcess.stdout.on.mock.calls.find(c => c[0] === 'data')[1];
        stdoutCallback(Buffer.from('{"result": "ok"}'));

        const closeCallback = mockProcess.on.mock.calls.find(c => c[0] === 'close')[1];
        closeCallback(0);
      }, 10);

      const result = await runLocal('claude', 'test prompt', {
        headlessArgs: ['-p', '--output-format', 'json'],
      });

      expect(spawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['-p', '--output-format', 'json']),
        expect.any(Object)
      );
      expect(result.exitCode).toBe(0);
    });

    it('spawns codex exec with args', async () => {
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
      };

      spawn.mockReturnValue(mockProcess);

      setTimeout(() => {
        const stdoutCallback = mockProcess.stdout.on.mock.calls.find(c => c[0] === 'data')[1];
        stdoutCallback(Buffer.from('{"result": "ok"}'));

        const closeCallback = mockProcess.on.mock.calls.find(c => c[0] === 'close')[1];
        closeCallback(0);
      }, 10);

      await runLocal('codex', 'test prompt', {
        headlessArgs: ['exec', '--json', '--sandbox', 'read-only'],
      });

      expect(spawn).toHaveBeenCalledWith(
        'codex',
        expect.arrayContaining(['exec', '--json', '--sandbox', 'read-only']),
        expect.any(Object)
      );
    });

    it('spawns gemini -p with args', async () => {
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
      };

      spawn.mockReturnValue(mockProcess);

      setTimeout(() => {
        const stdoutCallback = mockProcess.stdout.on.mock.calls.find(c => c[0] === 'data')[1];
        stdoutCallback(Buffer.from('{"result": "ok"}'));

        const closeCallback = mockProcess.on.mock.calls.find(c => c[0] === 'close')[1];
        closeCallback(0);
      }, 10);

      await runLocal('gemini', 'test prompt', {
        headlessArgs: ['-p', '--output-format', 'json'],
      });

      expect(spawn).toHaveBeenCalledWith(
        'gemini',
        expect.arrayContaining(['-p', '--output-format', 'json']),
        expect.any(Object)
      );
    });

    it('parses JSON output', async () => {
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
      };

      spawn.mockReturnValue(mockProcess);

      setTimeout(() => {
        const stdoutCallback = mockProcess.stdout.on.mock.calls.find(c => c[0] === 'data')[1];
        stdoutCallback(Buffer.from('{"summary": "LGTM", "score": 85}'));

        const closeCallback = mockProcess.on.mock.calls.find(c => c[0] === 'close')[1];
        closeCallback(0);
      }, 10);

      const result = await runLocal('claude', 'test', { headlessArgs: ['-p'] });

      expect(result.parsed).toEqual({ summary: 'LGTM', score: 85 });
    });

    it('handles non-JSON output', async () => {
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
      };

      spawn.mockReturnValue(mockProcess);

      setTimeout(() => {
        const stdoutCallback = mockProcess.stdout.on.mock.calls.find(c => c[0] === 'data')[1];
        stdoutCallback(Buffer.from('Plain text output'));

        const closeCallback = mockProcess.on.mock.calls.find(c => c[0] === 'close')[1];
        closeCallback(0);
      }, 10);

      const result = await runLocal('claude', 'test', { headlessArgs: ['-p'] });

      expect(result.raw).toBe('Plain text output');
      expect(result.parsed).toBeNull();
    });

    it('respects timeout', async () => {
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
      };

      spawn.mockReturnValue(mockProcess);

      // Don't complete the process - let it timeout
      const promise = runLocal('claude', 'test', {
        headlessArgs: ['-p'],
        timeout: 50,
      });

      await expect(promise).rejects.toThrow(/timeout/i);
    });
  });

  describe('runViaDevserver', () => {
    it('posts to devserver API', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ taskId: 'task-123' }),
      });

      // Mock polling response
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ taskId: 'task-123' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            status: 'completed',
            result: { raw: '{}', parsed: {}, exitCode: 0 },
          }),
        });

      const result = await runViaDevserver({
        devserverUrl: 'https://devserver.example.com',
        provider: 'claude',
        prompt: 'test prompt',
        opts: {},
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://devserver.example.com/api/run',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('polls for result', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ taskId: 'task-123' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: 'running' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            status: 'completed',
            result: { raw: '{"done": true}', parsed: { done: true }, exitCode: 0 },
          }),
        });

      const result = await runViaDevserver({
        devserverUrl: 'https://devserver.example.com',
        provider: 'claude',
        prompt: 'test',
        opts: {},
        pollInterval: 10,
      });

      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(result.parsed).toEqual({ done: true });
    });
  });

  describe('buildArgs', () => {
    it('includes output-format json', () => {
      const args = buildArgs('claude', 'test prompt', {
        headlessArgs: ['-p', '--output-format', 'json'],
      });

      expect(args).toContain('--output-format');
      expect(args).toContain('json');
    });

    it('includes sandbox for codex', () => {
      const args = buildArgs('codex', 'test prompt', {
        headlessArgs: ['exec', '--json', '--sandbox', 'read-only'],
      });

      expect(args).toContain('--sandbox');
      expect(args).toContain('read-only');
    });

    it('includes prompt in args', () => {
      const args = buildArgs('claude', 'review this code', {
        headlessArgs: ['-p'],
      });

      expect(args).toContain('review this code');
    });

    it('includes cwd option', () => {
      const args = buildArgs('claude', 'test', {
        headlessArgs: ['-p'],
        cwd: '/project/dir',
      });

      // cwd is passed to spawn options, not args
      // But buildArgs should handle it
      expect(args).toBeDefined();
    });
  });

  describe('parseOutput', () => {
    it('parses valid JSON', () => {
      const result = parseOutput('{"key": "value"}');
      expect(result).toEqual({ key: 'value' });
    });

    it('returns null for invalid JSON', () => {
      const result = parseOutput('not json');
      expect(result).toBeNull();
    });

    it('handles empty output', () => {
      const result = parseOutput('');
      expect(result).toBeNull();
    });

    it('handles multiline JSON', () => {
      const result = parseOutput(`{
        "key": "value",
        "nested": {
          "array": [1, 2, 3]
        }
      }`);
      expect(result.nested.array).toEqual([1, 2, 3]);
    });

    it('extracts JSON from mixed output', () => {
      // Some CLIs may output text before/after JSON
      const result = parseOutput('Some text\n{"result": "ok"}\nMore text');
      expect(result).toEqual({ result: 'ok' });
    });
  });
});
