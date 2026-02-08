/**
 * Provider Executor Tests
 *
 * Actually execute LLM requests through any provider.
 * The bridge between "provider detected" and "review completed."
 */
import { describe, it, expect, vi } from 'vitest';

const {
  executeCliProvider,
  executeApiProvider,
  createExecutor,
} = require('./provider-executor.js');

describe('Provider Executor', () => {
  describe('executeCliProvider', () => {
    it('executes CLI provider via spawn', async () => {
      const mockSpawn = vi.fn().mockReturnValue({
        stdout: { on: vi.fn((ev, cb) => { if (ev === 'data') cb(Buffer.from('review result')); }) },
        stderr: { on: vi.fn() },
        stdin: { write: vi.fn(), end: vi.fn() },
        on: vi.fn((ev, cb) => { if (ev === 'close') cb(0); }),
      });

      const result = await executeCliProvider('Review this code', {
        command: 'codex',
        args: [],
        spawn: mockSpawn,
      });

      expect(mockSpawn).toHaveBeenCalled();
      expect(result.response).toContain('review result');
    });

    it('passes prompt as stdin to CLI', async () => {
      let writtenData = '';
      const mockSpawn = vi.fn().mockReturnValue({
        stdout: { on: vi.fn((ev, cb) => { if (ev === 'data') cb(Buffer.from('ok')); }) },
        stderr: { on: vi.fn() },
        stdin: { write: vi.fn((d) => { writtenData = d; }), end: vi.fn() },
        on: vi.fn((ev, cb) => { if (ev === 'close') cb(0); }),
      });

      await executeCliProvider('my prompt text', {
        command: 'codex',
        args: [],
        spawn: mockSpawn,
      });

      expect(writtenData).toContain('my prompt text');
    });

    it('captures stdout as response', async () => {
      const mockSpawn = vi.fn().mockReturnValue({
        stdout: { on: vi.fn((ev, cb) => {
          if (ev === 'data') {
            cb(Buffer.from('chunk1'));
            cb(Buffer.from('chunk2'));
          }
        }) },
        stderr: { on: vi.fn() },
        stdin: { write: vi.fn(), end: vi.fn() },
        on: vi.fn((ev, cb) => { if (ev === 'close') cb(0); }),
      });

      const result = await executeCliProvider('prompt', {
        command: 'codex',
        args: [],
        spawn: mockSpawn,
      });

      expect(result.response).toBe('chunk1chunk2');
    });

    it('handles CLI timeout (kills process)', async () => {
      const killFn = vi.fn();
      const mockSpawn = vi.fn().mockReturnValue({
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        stdin: { write: vi.fn(), end: vi.fn() },
        on: vi.fn(), // never calls close
        kill: killFn,
      });

      await expect(
        executeCliProvider('prompt', {
          command: 'codex',
          args: [],
          spawn: mockSpawn,
          timeout: 50,
        })
      ).rejects.toThrow(/timeout/i);
    });

    it('handles provider exit code != 0', async () => {
      const mockSpawn = vi.fn().mockReturnValue({
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn((ev, cb) => { if (ev === 'data') cb(Buffer.from('error occurred')); }) },
        stdin: { write: vi.fn(), end: vi.fn() },
        on: vi.fn((ev, cb) => { if (ev === 'close') cb(1); }),
      });

      await expect(
        executeCliProvider('prompt', {
          command: 'codex',
          args: [],
          spawn: mockSpawn,
        })
      ).rejects.toThrow(/exit code 1/i);
    });

    it('handles empty response', async () => {
      const mockSpawn = vi.fn().mockReturnValue({
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        stdin: { write: vi.fn(), end: vi.fn() },
        on: vi.fn((ev, cb) => { if (ev === 'close') cb(0); }),
      });

      const result = await executeCliProvider('prompt', {
        command: 'codex',
        args: [],
        spawn: mockSpawn,
      });

      expect(result.response).toBe('');
    });

    it('respects provider-specific args from config', async () => {
      let spawnedArgs = [];
      const mockSpawn = vi.fn().mockImplementation((cmd, args) => {
        spawnedArgs = args;
        return {
          stdout: { on: vi.fn((ev, cb) => { if (ev === 'data') cb(Buffer.from('ok')); }) },
          stderr: { on: vi.fn() },
          stdin: { write: vi.fn(), end: vi.fn() },
          on: vi.fn((ev, cb) => { if (ev === 'close') cb(0); }),
        };
      });

      await executeCliProvider('prompt', {
        command: 'codex',
        args: ['--model', 'gpt-4o', '--quiet'],
        spawn: mockSpawn,
      });

      expect(spawnedArgs).toContain('--model');
      expect(spawnedArgs).toContain('gpt-4o');
    });

    it('strips ANSI codes from CLI output', async () => {
      const ansiOutput = '\x1b[31mred text\x1b[0m normal';
      const mockSpawn = vi.fn().mockReturnValue({
        stdout: { on: vi.fn((ev, cb) => { if (ev === 'data') cb(Buffer.from(ansiOutput)); }) },
        stderr: { on: vi.fn() },
        stdin: { write: vi.fn(), end: vi.fn() },
        on: vi.fn((ev, cb) => { if (ev === 'close') cb(0); }),
      });

      const result = await executeCliProvider('prompt', {
        command: 'codex',
        args: [],
        spawn: mockSpawn,
      });

      expect(result.response).not.toContain('\x1b[');
      expect(result.response).toContain('red text');
    });
  });

  describe('executeApiProvider', () => {
    it('executes API provider via HTTP POST', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'review response' } }],
        }),
      });

      const result = await executeApiProvider('prompt', {
        url: 'http://localhost:4000/v1/chat/completions',
        model: 'gpt-4o',
        apiKey: 'test-key',
        fetch: mockFetch,
      });

      expect(result.response).toBe('review response');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('handles API timeout', async () => {
      const mockFetch = vi.fn().mockImplementation(() =>
        new Promise((resolve) => setTimeout(resolve, 10000))
      );

      await expect(
        executeApiProvider('prompt', {
          url: 'http://localhost:4000/v1/chat/completions',
          model: 'gpt-4o',
          fetch: mockFetch,
          timeout: 50,
        })
      ).rejects.toThrow(/timeout/i);
    });
  });

  describe('createExecutor', () => {
    it('returns standardized { response, model, latency } format', async () => {
      const mockSpawn = vi.fn().mockReturnValue({
        stdout: { on: vi.fn((ev, cb) => { if (ev === 'data') cb(Buffer.from('result')); }) },
        stderr: { on: vi.fn() },
        stdin: { write: vi.fn(), end: vi.fn() },
        on: vi.fn((ev, cb) => { if (ev === 'close') cb(0); }),
      });

      const executor = createExecutor({ spawn: mockSpawn });
      const result = await executor.execute('prompt', {
        type: 'cli',
        command: 'codex',
        args: [],
        model: 'gpt-4o',
      });

      expect(result).toMatchObject({
        response: expect.any(String),
        model: 'gpt-4o',
        latency: expect.any(Number),
      });
    });

    it('works with injectable spawn/fetch for testing', () => {
      const executor = createExecutor({
        spawn: vi.fn(),
        fetch: vi.fn(),
      });

      expect(executor).toBeDefined();
      expect(executor.execute).toBeDefined();
    });
  });
});
