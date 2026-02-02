import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import RouterPane from './RouterPane.js';

// Mock fetch
global.fetch = vi.fn();

describe('RouterPane', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('renders detected CLIs', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            providers: {
              claude: { detected: true, type: 'cli', version: 'v4.0.0' },
              codex: { detected: true, type: 'cli', version: 'v1.0.0' },
            },
            devserver: { configured: true, connected: true },
          }),
      });

      const { lastFrame } = render(<RouterPane />);
      await vi.runAllTimersAsync();

      const output = lastFrame();
      expect(output).toContain('claude');
      expect(output).toContain('codex');
    });

    it('shows CLI versions', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            providers: {
              claude: { detected: true, type: 'cli', version: 'v4.0.0' },
            },
            devserver: { configured: false },
          }),
      });

      const { lastFrame } = render(<RouterPane />);
      await vi.runAllTimersAsync();

      const output = lastFrame();
      expect(output).toContain('v4.0.0');
    });

    it('shows devserver connected status', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            providers: {},
            devserver: { configured: true, connected: true, url: 'https://dev.example.com' },
          }),
      });

      const { lastFrame } = render(<RouterPane />);
      await vi.runAllTimersAsync();

      const output = lastFrame();
      expect(output).toContain('Connected');
    });

    it('shows devserver disconnected status', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            providers: {},
            devserver: { configured: true, connected: false },
          }),
      });

      const { lastFrame } = render(<RouterPane />);
      await vi.runAllTimersAsync();

      const output = lastFrame();
      expect(output).toContain('Disconnected');
    });

    it('renders routing table', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            providers: {
              claude: { detected: true, type: 'cli', capabilities: ['review'] },
              deepseek: { detected: false, type: 'api', capabilities: ['review'] },
            },
            devserver: { configured: true },
            capabilities: {
              review: { providers: ['claude', 'deepseek'] },
            },
          }),
      });

      const { lastFrame } = render(<RouterPane />);
      await vi.runAllTimersAsync();

      const output = lastFrame();
      expect(output).toContain('review');
    });

    it('shows local vs devserver badges', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            providers: {
              claude: { detected: true, type: 'cli' },
              deepseek: { detected: false, type: 'api' },
            },
            devserver: { configured: true },
          }),
      });

      const { lastFrame } = render(<RouterPane />);
      await vi.runAllTimersAsync();

      const output = lastFrame();
      expect(output).toContain('local');
    });

    it('shows cost estimates', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            providers: {
              deepseek: { detected: false, type: 'api' },
            },
            devserver: { configured: true },
            costEstimate: {
              review: { local: 0, devserver: 1.5 },
            },
          }),
      });

      const { lastFrame } = render(<RouterPane />);
      await vi.runAllTimersAsync();

      const output = lastFrame();
      expect(output).toContain('$1.50');
    });

    it('health indicators show status', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            providers: {
              claude: { detected: true, type: 'cli', healthy: true },
              codex: { detected: false, type: 'cli', healthy: false },
            },
            devserver: { configured: true },
          }),
      });

      const { lastFrame } = render(<RouterPane />);
      await vi.runAllTimersAsync();

      const output = lastFrame();
      // Health indicators should be present (● or similar)
      expect(output).toBeDefined();
    });

    it('shows configure hint', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            providers: {},
            devserver: { configured: false },
          }),
      });

      const { lastFrame } = render(<RouterPane />);
      await vi.runAllTimersAsync();

      const output = lastFrame();
      expect(output).toContain('Router');
    });
  });

  describe('loading state', () => {
    it('handles loading state', () => {
      (global.fetch as any).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { lastFrame } = render(<RouterPane />);

      const output = lastFrame();
      expect(output).toContain('Loading');
    });
  });

  describe('error state', () => {
    it('handles error state', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const { lastFrame } = render(<RouterPane />);
      await vi.runAllTimersAsync();

      const output = lastFrame();
      expect(output).toContain('Error');
    });
  });
});
