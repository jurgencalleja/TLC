import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CLIProvider, buildArgs } from './cli-provider.js';

describe('CLI Provider', () => {
  describe('runLocal', () => {
    it('spawns claude -p with args', async () => {
      const provider = new CLIProvider({
        name: 'claude',
        command: 'claude',
        headlessArgs: ['-p', '--output-format', 'json'],
      });

      // Mock spawn
      provider._spawn = vi.fn().mockResolvedValue({
        stdout: '{"result": "test"}',
        exitCode: 0,
      });

      await provider.runLocal('test prompt');

      expect(provider._spawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['-p', '--output-format', 'json'])
      );
    });

    it('spawns codex exec with args', async () => {
      const provider = new CLIProvider({
        name: 'codex',
        command: 'codex',
        headlessArgs: ['exec', '--json'],
      });

      provider._spawn = vi.fn().mockResolvedValue({
        stdout: '{"result": "test"}',
        exitCode: 0,
      });

      await provider.runLocal('test prompt');

      expect(provider._spawn).toHaveBeenCalledWith(
        'codex',
        expect.arrayContaining(['exec', '--json'])
      );
    });

    it('spawns gemini -p with args', async () => {
      const provider = new CLIProvider({
        name: 'gemini',
        command: 'gemini',
        headlessArgs: ['-p', '--output-format', 'json'],
      });

      provider._spawn = vi.fn().mockResolvedValue({
        stdout: '{"result": "test"}',
        exitCode: 0,
      });

      await provider.runLocal('test prompt');

      expect(provider._spawn).toHaveBeenCalledWith(
        'gemini',
        expect.arrayContaining(['-p', '--output-format', 'json'])
      );
    });

    it('parses JSON output', async () => {
      const provider = new CLIProvider({
        name: 'claude',
        command: 'claude',
        headlessArgs: ['-p'],
      });

      provider._spawn = vi.fn().mockResolvedValue({
        stdout: '{"summary": "Test result", "score": 85}',
        exitCode: 0,
      });

      const result = await provider.runLocal('test');

      expect(result.parsed).toEqual({ summary: 'Test result', score: 85 });
    });

    it('handles non-JSON output', async () => {
      const provider = new CLIProvider({
        name: 'claude',
        command: 'claude',
        headlessArgs: ['-p'],
      });

      provider._spawn = vi.fn().mockResolvedValue({
        stdout: 'Plain text response',
        exitCode: 0,
      });

      const result = await provider.runLocal('test');

      expect(result.raw).toBe('Plain text response');
      expect(result.parsed).toBeNull();
    });

    it('respects timeout', async () => {
      const provider = new CLIProvider({
        name: 'claude',
        command: 'claude',
        headlessArgs: ['-p'],
        timeout: 100,
      });

      provider._spawn = vi.fn().mockImplementation(() => 
        new Promise(r => setTimeout(r, 1000))
      );

      await expect(provider.runLocal('test')).rejects.toThrow(/timeout/i);
    });
  });

  describe('runViaDevserver', () => {
    it('posts to devserver', async () => {
      const provider = new CLIProvider({
        name: 'claude',
        command: 'claude',
        devserverUrl: 'https://dev.example.com',
      });

      provider._fetch = vi.fn().mockImplementation((url) => {
        if (url.includes('/api/run')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ taskId: '123' }),
          });
        }
        // Return completed immediately for polling
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'completed', result: {} }),
        });
      });

      await provider.runViaDevserver('test prompt');

      expect(provider._fetch).toHaveBeenCalledWith(
        'https://dev.example.com/api/run',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('polls for result', async () => {
      const provider = new CLIProvider({
        name: 'claude',
        command: 'claude',
        devserverUrl: 'https://dev.example.com',
      });

      let pollCount = 0;
      provider._fetch = vi.fn().mockImplementation((url) => {
        if (url.includes('/api/run')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ taskId: '123' }),
          });
        }
        pollCount++;
        if (pollCount < 2) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ status: 'running' }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'completed', result: { data: 'test' } }),
        });
      });

      const result = await provider.runViaDevserver('test');

      expect(pollCount).toBeGreaterThanOrEqual(2);
      expect(result.parsed).toEqual({ data: 'test' });
    });
  });

  describe('buildArgs', () => {
    it('includes output-format json', () => {
      const args = buildArgs('claude', 'test prompt', { outputFormat: 'json' });
      expect(args).toContain('--output-format');
      expect(args).toContain('json');
    });

    it('includes sandbox for codex', () => {
      const args = buildArgs('codex', 'test prompt', { sandbox: 'read-only' });
      expect(args).toContain('--sandbox');
      expect(args).toContain('read-only');
    });
  });
});
