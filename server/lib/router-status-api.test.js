/**
 * Router Status API Tests
 * Phase 39, Task 3
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRouterStatus } from './router-status-api.js';

describe('Router Status API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getRouterStatus', () => {
    it('returns providers object', async () => {
      const mockDetectAllCLIs = vi.fn().mockResolvedValue({
        claude: { found: true, path: '/usr/bin/claude', version: '1.0.0' },
        codex: { found: false, path: null, version: null },
        gemini: { found: true, path: '/usr/bin/gemini', version: '2.1.0' },
      });

      const mockLoadRouterConfig = vi.fn().mockResolvedValue({
        providers: {
          claude: { type: 'cli', command: 'claude', capabilities: ['review', 'code-gen'] },
          codex: { type: 'cli', command: 'codex', capabilities: ['review'] },
          gemini: { type: 'cli', command: 'gemini', capabilities: ['design'] },
        },
        capabilities: {
          'code-review': { providers: ['claude', 'gemini'] },
          'code-gen': { providers: ['claude'] },
        },
        devserver: { url: null },
      });

      const result = await getRouterStatus({
        _detectAllCLIs: mockDetectAllCLIs,
        _loadRouterConfig: mockLoadRouterConfig,
      });

      expect(result).toHaveProperty('providers');
      expect(result.providers).toHaveProperty('claude');
      expect(result.providers).toHaveProperty('codex');
      expect(result.providers).toHaveProperty('gemini');
    });

    it('uses cli-detector to check availability', async () => {
      const mockDetectAllCLIs = vi.fn().mockResolvedValue({
        claude: { found: true, path: '/usr/bin/claude', version: '1.0.0' },
      });

      const mockLoadRouterConfig = vi.fn().mockResolvedValue({
        providers: { claude: { type: 'cli' } },
        capabilities: {},
        devserver: { url: null },
      });

      await getRouterStatus({
        _detectAllCLIs: mockDetectAllCLIs,
        _loadRouterConfig: mockLoadRouterConfig,
      });

      expect(mockDetectAllCLIs).toHaveBeenCalled();
    });

    it('returns capabilities from config', async () => {
      const mockDetectAllCLIs = vi.fn().mockResolvedValue({
        claude: { found: true, path: '/usr/bin/claude', version: '1.0.0' },
        gemini: { found: true, path: '/usr/bin/gemini', version: '2.1.0' },
      });

      const mockLoadRouterConfig = vi.fn().mockResolvedValue({
        providers: {
          claude: { type: 'cli' },
          gemini: { type: 'cli' },
        },
        capabilities: {
          'code-review': { providers: ['claude', 'gemini'] },
          'code-gen': { providers: ['claude'] },
        },
        devserver: { url: null },
      });

      const result = await getRouterStatus({
        _detectAllCLIs: mockDetectAllCLIs,
        _loadRouterConfig: mockLoadRouterConfig,
      });

      expect(result).toHaveProperty('capabilities');
      expect(result.capabilities).toHaveProperty('code-review');
      expect(result.capabilities['code-review'].providers).toContain('claude');
      expect(result.capabilities['code-review'].providers).toContain('gemini');
      expect(result.capabilities).toHaveProperty('code-gen');
      expect(result.capabilities['code-gen'].providers).toContain('claude');
    });

    it('returns devserver status', async () => {
      const mockDetectAllCLIs = vi.fn().mockResolvedValue({});

      const mockLoadRouterConfig = vi.fn().mockResolvedValue({
        providers: {},
        capabilities: {},
        devserver: { url: 'http://localhost:3000' },
      });

      const mockCheckDevserver = vi.fn().mockResolvedValue(true);

      const result = await getRouterStatus({
        _detectAllCLIs: mockDetectAllCLIs,
        _loadRouterConfig: mockLoadRouterConfig,
        _checkDevserver: mockCheckDevserver,
      });

      expect(result).toHaveProperty('devserver');
      expect(result.devserver).toHaveProperty('connected');
      expect(result.devserver).toHaveProperty('url');
    });

    it('handles missing config gracefully', async () => {
      const mockDetectAllCLIs = vi.fn().mockResolvedValue({
        claude: { found: true, path: '/usr/bin/claude', version: '1.0.0' },
      });

      const mockLoadRouterConfig = vi.fn().mockRejectedValue(new Error('Config not found'));

      const result = await getRouterStatus({
        _detectAllCLIs: mockDetectAllCLIs,
        _loadRouterConfig: mockLoadRouterConfig,
      });

      expect(result).toHaveProperty('providers');
      expect(result).toHaveProperty('capabilities');
      expect(result).toHaveProperty('devserver');
      expect(result).toHaveProperty('usage');
    });

    it('provider detected=true when CLI found', async () => {
      const mockDetectAllCLIs = vi.fn().mockResolvedValue({
        claude: { found: true, path: '/usr/bin/claude', version: '1.0.0' },
        codex: { found: false, path: null, version: null },
      });

      const mockLoadRouterConfig = vi.fn().mockResolvedValue({
        providers: {
          claude: { type: 'cli' },
          codex: { type: 'cli' },
        },
        capabilities: {},
        devserver: { url: null },
      });

      const result = await getRouterStatus({
        _detectAllCLIs: mockDetectAllCLIs,
        _loadRouterConfig: mockLoadRouterConfig,
      });

      expect(result.providers.claude.detected).toBe(true);
      expect(result.providers.claude.version).toBe('1.0.0');
      expect(result.providers.codex.detected).toBe(false);
      expect(result.providers.codex.version).toBeNull();
    });
  });

  describe('Response format', () => {
    it('matches expected dashboard format', async () => {
      const mockDetectAllCLIs = vi.fn().mockResolvedValue({
        claude: { found: true, path: '/usr/bin/claude', version: '1.0.0' },
        codex: { found: false, path: null, version: null },
        gemini: { found: true, path: '/usr/bin/gemini', version: '2.1.0' },
      });

      const mockLoadRouterConfig = vi.fn().mockResolvedValue({
        providers: {
          claude: { type: 'cli', command: 'claude' },
          codex: { type: 'cli', command: 'codex' },
          gemini: { type: 'cli', command: 'gemini' },
        },
        capabilities: {
          'code-review': { providers: ['claude', 'gemini'] },
          'code-gen': { providers: ['claude'] },
        },
        devserver: { url: null },
      });

      const result = await getRouterStatus({
        _detectAllCLIs: mockDetectAllCLIs,
        _loadRouterConfig: mockLoadRouterConfig,
      });

      // Verify full response format
      expect(result).toMatchObject({
        providers: {
          claude: { name: 'claude', type: 'cli', detected: true, version: '1.0.0' },
          codex: { name: 'codex', type: 'cli', detected: false, version: null },
          gemini: { name: 'gemini', type: 'cli', detected: true, version: '2.1.0' },
        },
        capabilities: {
          'code-review': { providers: ['claude', 'gemini'] },
          'code-gen': { providers: ['claude'] },
        },
        devserver: { connected: false, url: null },
        usage: { requestsToday: 0, tokensUsed: 0 },
      });
    });
  });

  describe('Devserver connection', () => {
    it('shows connected=true when devserver responds', async () => {
      const mockDetectAllCLIs = vi.fn().mockResolvedValue({});

      const mockLoadRouterConfig = vi.fn().mockResolvedValue({
        providers: {},
        capabilities: {},
        devserver: { url: 'http://localhost:3000' },
      });

      const mockCheckDevserver = vi.fn().mockResolvedValue(true);

      const result = await getRouterStatus({
        _detectAllCLIs: mockDetectAllCLIs,
        _loadRouterConfig: mockLoadRouterConfig,
        _checkDevserver: mockCheckDevserver,
      });

      expect(result.devserver.connected).toBe(true);
      expect(result.devserver.url).toBe('http://localhost:3000');
    });

    it('shows connected=false when devserver fails', async () => {
      const mockDetectAllCLIs = vi.fn().mockResolvedValue({});

      const mockLoadRouterConfig = vi.fn().mockResolvedValue({
        providers: {},
        capabilities: {},
        devserver: { url: 'http://localhost:3000' },
      });

      const mockCheckDevserver = vi.fn().mockResolvedValue(false);

      const result = await getRouterStatus({
        _detectAllCLIs: mockDetectAllCLIs,
        _loadRouterConfig: mockLoadRouterConfig,
        _checkDevserver: mockCheckDevserver,
      });

      expect(result.devserver.connected).toBe(false);
      expect(result.devserver.url).toBe('http://localhost:3000');
    });

    it('skips check when no devserver URL configured', async () => {
      const mockDetectAllCLIs = vi.fn().mockResolvedValue({});

      const mockLoadRouterConfig = vi.fn().mockResolvedValue({
        providers: {},
        capabilities: {},
        devserver: { url: null },
      });

      const mockCheckDevserver = vi.fn();

      const result = await getRouterStatus({
        _detectAllCLIs: mockDetectAllCLIs,
        _loadRouterConfig: mockLoadRouterConfig,
        _checkDevserver: mockCheckDevserver,
      });

      expect(mockCheckDevserver).not.toHaveBeenCalled();
      expect(result.devserver.connected).toBe(false);
      expect(result.devserver.url).toBeNull();
    });
  });
});
