import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  execute,
  detectLocalCLIs,
  testDevserverConnection,
  configureProvider,
  configureCapability,
  testProvider,
  formatRoutingSummary,
  estimateCosts,
  saveConfig,
} from './router-setup-command.js';

// Mock dependencies
vi.mock('./cli-detector.js', () => ({
  detectAllCLIs: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
}));

import { detectAllCLIs } from './cli-detector.js';
import fs from 'fs/promises';

describe('router-setup-command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('execute', () => {
    it('detects local CLIs', async () => {
      detectAllCLIs.mockResolvedValue(
        new Map([['claude', { name: 'claude', version: 'v4.0.0' }]])
      );
      fs.readFile.mockRejectedValue(new Error('ENOENT'));
      fs.writeFile.mockResolvedValue();

      const result = await execute({ projectDir: '/project', dryRun: true });

      expect(detectAllCLIs).toHaveBeenCalled();
      expect(result.detected).toBeDefined();
    });

    it('tests devserver connection', async () => {
      detectAllCLIs.mockResolvedValue(new Map());
      fs.readFile.mockResolvedValue(
        JSON.stringify({
          router: { devserver: { url: 'https://devserver.example.com' } },
        })
      );
      fs.writeFile.mockResolvedValue();

      const result = await execute({ projectDir: '/project', dryRun: true });

      expect(result.devserver).toBeDefined();
    });

    it('shows routing table', async () => {
      detectAllCLIs.mockResolvedValue(
        new Map([
          ['claude', { name: 'claude', version: 'v4.0.0' }],
          ['codex', { name: 'codex', version: 'v1.0.0' }],
        ])
      );
      fs.readFile.mockRejectedValue(new Error('ENOENT'));
      fs.writeFile.mockResolvedValue();

      const result = await execute({ projectDir: '/project', dryRun: true });

      expect(result.routingTable).toBeDefined();
    });

    it('shows cost estimate', async () => {
      detectAllCLIs.mockResolvedValue(new Map());
      fs.readFile.mockRejectedValue(new Error('ENOENT'));
      fs.writeFile.mockResolvedValue();

      const result = await execute({ projectDir: '/project', dryRun: true });

      expect(result.costEstimate).toBeDefined();
    });
  });

  describe('detectLocalCLIs', () => {
    it('returns detected CLI info', async () => {
      detectAllCLIs.mockResolvedValue(
        new Map([
          ['claude', { name: 'claude', version: 'v4.0.0', detected: true }],
          ['gemini', { name: 'gemini', version: 'v1.2.0', detected: true }],
        ])
      );

      const result = await detectLocalCLIs();

      expect(result.claude).toBeDefined();
      expect(result.claude.detected).toBe(true);
      expect(result.gemini).toBeDefined();
    });

    it('marks missing CLIs as not detected', async () => {
      detectAllCLIs.mockResolvedValue(
        new Map([['claude', { name: 'claude', detected: true }]])
      );

      const result = await detectLocalCLIs();

      expect(result.claude.detected).toBe(true);
      expect(result.codex).toBeUndefined();
    });
  });

  describe('testDevserverConnection', () => {
    it('returns connected true when reachable', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ healthy: true }),
      });

      const result = await testDevserverConnection(
        'https://devserver.example.com'
      );

      expect(result.connected).toBe(true);
    });

    it('returns connected false when unreachable', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const result = await testDevserverConnection(
        'https://devserver.example.com'
      );

      expect(result.connected).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns not configured when no URL', async () => {
      const result = await testDevserverConnection(null);

      expect(result.connected).toBe(false);
      expect(result.configured).toBe(false);
    });
  });

  describe('configureProvider', () => {
    it('adds provider to config', () => {
      const config = { providers: {} };

      const updated = configureProvider(config, 'claude', {
        type: 'cli',
        command: 'claude',
      });

      expect(updated.providers.claude).toBeDefined();
      expect(updated.providers.claude.type).toBe('cli');
    });

    it('updates existing provider', () => {
      const config = {
        providers: {
          claude: { type: 'cli', command: 'old-command' },
        },
      };

      const updated = configureProvider(config, 'claude', {
        type: 'cli',
        command: 'new-command',
      });

      expect(updated.providers.claude.command).toBe('new-command');
    });
  });

  describe('configureCapability', () => {
    it('sets providers for capability', () => {
      const config = { capabilities: {} };

      const updated = configureCapability(config, 'review', ['claude', 'codex']);

      expect(updated.capabilities.review).toBeDefined();
      expect(updated.capabilities.review.providers).toEqual(['claude', 'codex']);
    });

    it('updates existing capability', () => {
      const config = {
        capabilities: {
          review: { providers: ['claude'] },
        },
      };

      const updated = configureCapability(config, 'review', [
        'claude',
        'codex',
        'deepseek',
      ]);

      expect(updated.capabilities.review.providers).toEqual([
        'claude',
        'codex',
        'deepseek',
      ]);
    });
  });

  describe('testProvider', () => {
    it('validates CLI provider connectivity', async () => {
      const provider = {
        type: 'cli',
        command: 'claude',
        detected: true,
      };

      const result = await testProvider(provider);

      expect(result.available).toBe(true);
    });

    it('validates API provider connectivity', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const provider = {
        type: 'api',
        baseUrl: 'https://api.deepseek.com',
      };

      const result = await testProvider(provider);

      expect(result.available).toBe(true);
    });

    it('returns unavailable for missing CLI', async () => {
      const provider = {
        type: 'cli',
        command: 'nonexistent',
        detected: false,
      };

      const result = await testProvider(provider);

      expect(result.available).toBe(false);
    });
  });

  describe('formatRoutingSummary', () => {
    it('shows local vs devserver routing', () => {
      const config = {
        providers: {
          claude: { type: 'cli', detected: true },
          codex: { type: 'cli', detected: false },
          deepseek: { type: 'api' },
        },
        capabilities: {
          review: { providers: ['claude', 'codex', 'deepseek'] },
        },
      };

      const summary = formatRoutingSummary(config);

      expect(summary).toContain('claude');
      expect(summary).toContain('local');
      expect(summary).toContain('devserver');
    });

    it('groups by capability', () => {
      const config = {
        providers: {
          claude: { type: 'cli', detected: true },
          gemini: { type: 'cli', detected: true },
        },
        capabilities: {
          review: { providers: ['claude'] },
          design: { providers: ['gemini'] },
        },
      };

      const summary = formatRoutingSummary(config);

      expect(summary).toContain('review');
      expect(summary).toContain('design');
    });
  });

  describe('estimateCosts', () => {
    it('calculates per capability costs', () => {
      const config = {
        providers: {
          claude: { type: 'cli', detected: true },
          deepseek: { type: 'api', devserverOnly: true },
        },
        capabilities: {
          review: { providers: ['claude', 'deepseek'] },
        },
      };

      const estimate = estimateCosts(config, { reviewsPerDay: 10 });

      expect(estimate.review).toBeDefined();
      expect(estimate.review.local).toBeDefined();
      expect(estimate.review.devserver).toBeDefined();
    });

    it('shows zero cost for local providers', () => {
      const config = {
        providers: {
          claude: { type: 'cli', detected: true },
        },
        capabilities: {
          review: { providers: ['claude'] },
        },
      };

      const estimate = estimateCosts(config, { reviewsPerDay: 10 });

      expect(estimate.review.local).toBe(0);
    });

    it('estimates API costs', () => {
      const config = {
        providers: {
          deepseek: { type: 'api', devserverOnly: true },
        },
        capabilities: {
          review: { providers: ['deepseek'] },
        },
      };

      const estimate = estimateCosts(config, { reviewsPerDay: 10 });

      expect(estimate.review.devserver).toBeGreaterThan(0);
    });
  });

  describe('saveConfig', () => {
    it('writes .tlc.json', async () => {
      fs.readFile.mockResolvedValue('{}');
      fs.writeFile.mockResolvedValue();

      const config = {
        providers: { claude: { type: 'cli' } },
      };

      await saveConfig('/project', config);

      expect(fs.writeFile).toHaveBeenCalled();
      const writeCall = fs.writeFile.mock.calls[0];
      expect(writeCall[0]).toContain('.tlc.json');
    });

    it('merges with existing config', async () => {
      fs.readFile.mockResolvedValue(
        JSON.stringify({ testFrameworks: { primary: 'vitest' } })
      );
      fs.writeFile.mockResolvedValue();

      const routerConfig = {
        providers: { claude: { type: 'cli' } },
      };

      await saveConfig('/project', routerConfig);

      const writeCall = fs.writeFile.mock.calls[0];
      const written = JSON.parse(writeCall[1]);

      expect(written.testFrameworks.primary).toBe('vitest');
      expect(written.router.providers.claude).toBeDefined();
    });
  });
});
