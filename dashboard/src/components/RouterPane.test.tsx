import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import RouterPane from './RouterPane.js';

describe('RouterPane', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const mockFetchSuccess = (data: unknown) => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(data),
    } as Response);
  };

  const waitForFetch = async () => {
    // Flush all pending promises and timers
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(0);
  };

  describe('rendering', () => {
    it('renders detected CLIs', async () => {
      mockFetchSuccess({
        providers: {
          claude: { detected: true, type: 'cli', version: 'v4.0.0' },
          codex: { detected: true, type: 'cli', version: 'v1.0.0' },
        },
        devserver: { configured: true, connected: true },
      });

      const { lastFrame } = render(<RouterPane />);
      await waitForFetch();

      const output = lastFrame();
      expect(output).toContain('claude');
      expect(output).toContain('codex');
    });

    it('shows CLI versions', async () => {
      mockFetchSuccess({
        providers: {
          claude: { detected: true, type: 'cli', version: 'v4.0.0' },
        },
        devserver: { configured: false },
      });

      const { lastFrame } = render(<RouterPane />);
      await waitForFetch();

      const output = lastFrame();
      expect(output).toContain('v4.0.0');
    });

    it('shows devserver connected status', async () => {
      mockFetchSuccess({
        providers: {
          claude: { detected: true, type: 'cli' },
        },
        devserver: { configured: true, connected: true, url: 'https://dev.example.com' },
      });

      const { lastFrame } = render(<RouterPane />);
      await waitForFetch();

      const output = lastFrame();
      expect(output).toContain('Connected');
    });

    it('shows devserver disconnected status', async () => {
      mockFetchSuccess({
        providers: {
          claude: { detected: true, type: 'cli' },
        },
        devserver: { configured: true, connected: false },
      });

      const { lastFrame } = render(<RouterPane />);
      await waitForFetch();

      const output = lastFrame();
      expect(output).toContain('Disconnected');
    });

    it('renders routing table', async () => {
      mockFetchSuccess({
        providers: {
          claude: { detected: true, type: 'cli', capabilities: ['review'] },
          deepseek: { detected: false, type: 'api', capabilities: ['review'] },
        },
        devserver: { configured: true },
        capabilities: {
          review: { providers: ['claude', 'deepseek'] },
        },
      });

      const { lastFrame } = render(<RouterPane />);
      await waitForFetch();

      const output = lastFrame();
      expect(output).toContain('review');
    });

    it('shows local vs devserver badges', async () => {
      mockFetchSuccess({
        providers: {
          claude: { detected: true, type: 'cli' },
          deepseek: { detected: false, type: 'api' },
        },
        devserver: { configured: true },
        capabilities: {
          review: { providers: ['claude', 'deepseek'] },
        },
      });

      const { lastFrame } = render(<RouterPane />);
      await waitForFetch();

      const output = lastFrame();
      expect(output).toContain('local');
    });

    it('shows cost estimates', async () => {
      mockFetchSuccess({
        providers: {
          deepseek: { detected: true, type: 'api' },
        },
        devserver: { configured: true },
        costEstimate: {
          review: { local: 0, devserver: 1.5 },
        },
      });

      const { lastFrame } = render(<RouterPane />);
      await waitForFetch();

      const output = lastFrame();
      expect(output).toContain('$1.50');
    });

    it('health indicators show status', async () => {
      mockFetchSuccess({
        providers: {
          claude: { detected: true, type: 'cli', healthy: true },
          codex: { detected: false, type: 'cli', healthy: false },
        },
        devserver: { configured: true },
      });

      const { lastFrame } = render(<RouterPane />);
      await waitForFetch();

      const output = lastFrame();
      expect(output).toBeDefined();
      expect(output).toContain('claude');
    });

    it('shows Model Router title', async () => {
      mockFetchSuccess({
        providers: {
          claude: { detected: true, type: 'cli' },
        },
        devserver: { configured: false },
      });

      const { lastFrame } = render(<RouterPane />);
      await waitForFetch();

      const output = lastFrame();
      expect(output).toContain('Model Router');
    });
  });

  describe('loading state', () => {
    it('handles loading state', () => {
      // Mock that never resolves
      vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));

      const { lastFrame } = render(<RouterPane />);

      const output = lastFrame();
      expect(output).toContain('Loading');
    });

    it('shows skeleton while loading', () => {
      vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));

      const { lastFrame } = render(<RouterPane />);

      const output = lastFrame() || '';
      // Skeleton uses these characters
      expect(output).toMatch(/[░▒]/);
    });
  });

  describe('error state', () => {
    it('handles error state', async () => {
      vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));

      const { lastFrame } = render(<RouterPane />);
      await waitForFetch();

      const output = lastFrame();
      expect(output).toContain('Connection Lost');
    });

    it('shows retry option on error', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const { lastFrame } = render(<RouterPane />);
      await waitForFetch();

      const output = lastFrame();
      expect(output).toContain('Retry');
    });

    it('handles HTTP 500 error', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const { lastFrame } = render(<RouterPane />);
      await waitForFetch();

      const output = lastFrame();
      expect(output).toContain('Server Error');
    });
  });

  describe('empty state', () => {
    it('shows empty state when no providers', async () => {
      mockFetchSuccess({
        providers: {},
        devserver: { configured: false },
      });

      const { lastFrame } = render(<RouterPane />);
      await waitForFetch();

      const output = lastFrame();
      expect(output).toContain('No router configured');
    });
  });

  describe('refresh behavior', () => {
    it('fetches data on mount', async () => {
      mockFetchSuccess({ providers: {}, devserver: {} });

      render(<RouterPane />);
      await waitForFetch();

      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('refreshes data periodically', async () => {
      mockFetchSuccess({
        providers: { claude: { detected: true, type: 'cli' } },
        devserver: {},
      });

      render(<RouterPane refreshInterval={5000} />);
      await waitForFetch();

      // Initial fetch
      expect(fetch).toHaveBeenCalledTimes(1);

      // Advance time past refresh interval
      await vi.advanceTimersByTimeAsync(5000);
      expect(fetch).toHaveBeenCalledTimes(2);

      // Another refresh
      await vi.advanceTimersByTimeAsync(5000);
      expect(fetch).toHaveBeenCalledTimes(3);
    });
  });
});
