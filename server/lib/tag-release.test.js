import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createReleaseManager } from './tag-release.js';

/**
 * Mock fs/promises so persistence tests don't touch disk.
 * Each test resets the mock state via beforeEach.
 */
vi.mock('node:fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockRejectedValue(new Error('ENOENT')),
    readdir: vi.fn().mockResolvedValue([]),
  },
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockRejectedValue(new Error('ENOENT')),
  readdir: vi.fn().mockResolvedValue([]),
}));

import fsp from 'node:fs/promises';

/** Helper: minimal release config matching loadReleaseConfig() shape */
function makeConfig(overrides = {}) {
  return {
    tagPattern: 'v*',
    previewUrlTemplate: 'qa-{tag}.example.com',
    tiers: {
      rc: {
        gates: ['tests', 'security'],
        coverageThreshold: 80,
        autoPromote: false,
      },
      beta: {
        gates: ['tests'],
        coverageThreshold: 70,
        autoPromote: false,
      },
      release: {
        gates: ['tests', 'security', 'coverage'],
        coverageThreshold: 80,
        requiresPromotion: true,
      },
    },
    notifications: {
      onDeploy: ['slack'],
      onAccept: ['slack'],
      onReject: ['slack'],
    },
    ...overrides,
  };
}

/** Helper: create a manager with all-passing gate checkers */
function makeManager(opts = {}) {
  const config = makeConfig();
  const deploy = opts.deploy || vi.fn().mockResolvedValue({ url: 'https://qa-v1.0.0-rc.1.example.com' });
  const notify = opts.notify || vi.fn().mockResolvedValue(undefined);
  const persist = opts.persist !== undefined ? opts.persist : true;
  const checkers = opts.checkers || {
    tests: vi.fn().mockResolvedValue({ passed: true, total: 10, failed: 0 }),
    security: vi.fn().mockResolvedValue({ passed: true, secrets: [] }),
    coverage: vi.fn().mockResolvedValue({ passed: true, percentage: 95 }),
  };
  const domain = opts.domain || 'example.com';

  return createReleaseManager(config, { deploy, notify, persist, checkers, domain });
}

describe('tag-release', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset readFile to reject by default (file not found)
    fsp.readFile.mockRejectedValue(new Error('ENOENT'));
    fsp.readdir.mockResolvedValue([]);
  });

  describe('createReleaseManager', () => {
    it('creates release object from tag event', async () => {
      const manager = makeManager();
      const release = await manager.startRelease('v1.0.0-rc.1', 'abc123');

      expect(release).toBeDefined();
      expect(release.tag).toBe('v1.0.0-rc.1');
      expect(release.commitSha).toBe('abc123');
      expect(release.tier).toBe('rc');
      expect(release.state).toBe('pending');
      expect(release.createdAt).toBeDefined();
      expect(release.updatedAt).toBeDefined();
    });

    it('handles invalid tag gracefully (rejects with error)', async () => {
      const manager = makeManager();
      await expect(manager.startRelease('not-a-tag', 'abc123')).rejects.toThrow(/invalid tag/i);
    });
  });

  describe('full flow - accept', () => {
    it('tag -> classify -> gates pass -> deploy -> QA accept -> promote', async () => {
      const promoteCb = vi.fn().mockResolvedValue({ promoted: true });
      const manager = makeManager({ deploy: promoteCb });

      // Start release
      const release = await manager.startRelease('v1.0.0-rc.1', 'abc123');
      expect(release.state).toBe('pending');

      // Run gates
      const gateResults = await manager.runGates('v1.0.0-rc.1');
      expect(gateResults.passed).toBe(true);

      // Deploy preview
      const previewUrl = await manager.deployPreview('v1.0.0-rc.1');
      expect(previewUrl).toContain('v1.0.0-rc.1');

      // Accept
      const accepted = await manager.acceptRelease('v1.0.0-rc.1', 'qa-reviewer');
      expect(accepted.state).toBe('accepted');
      expect(accepted.reviewer).toBe('qa-reviewer');
    });
  });

  describe('full flow - reject', () => {
    it('tag -> classify -> gates pass -> deploy -> QA reject -> notify with reason', async () => {
      const notifyCb = vi.fn().mockResolvedValue(undefined);
      const manager = makeManager({ notify: notifyCb });

      await manager.startRelease('v1.0.0-rc.1', 'abc123');
      await manager.runGates('v1.0.0-rc.1');
      await manager.deployPreview('v1.0.0-rc.1');

      const rejected = await manager.rejectRelease('v1.0.0-rc.1', 'qa-reviewer', 'CSS broken on mobile');
      expect(rejected.state).toBe('rejected');
      expect(rejected.reviewer).toBe('qa-reviewer');
      expect(rejected.reason).toBe('CSS broken on mobile');
      expect(notifyCb).toHaveBeenCalled();
    });
  });

  describe('gate failure blocks deployment', () => {
    it('deploy not called when gates fail', async () => {
      const deployCb = vi.fn();
      const manager = makeManager({
        deploy: deployCb,
        checkers: {
          tests: vi.fn().mockResolvedValue({ passed: false, total: 10, failed: 3 }),
          security: vi.fn().mockResolvedValue({ passed: true, secrets: [] }),
        },
      });

      await manager.startRelease('v1.0.0-rc.1', 'abc123');
      await manager.runGates('v1.0.0-rc.1');

      // deployPreview should throw because gates failed
      await expect(manager.deployPreview('v1.0.0-rc.1')).rejects.toThrow(/gates/i);
      expect(deployCb).not.toHaveBeenCalled();
    });
  });

  describe('release state machine', () => {
    it('transitions: pending -> gates-running -> deployed -> qa-review -> accepted', async () => {
      const manager = makeManager();

      const r1 = await manager.startRelease('v1.0.0-rc.1', 'abc123');
      expect(r1.state).toBe('pending');

      const gateResults = await manager.runGates('v1.0.0-rc.1');
      const r2 = await manager.getRelease('v1.0.0-rc.1');
      expect(r2.state).toBe('gates-passed');

      await manager.deployPreview('v1.0.0-rc.1');
      const r3 = await manager.getRelease('v1.0.0-rc.1');
      expect(r3.state).toBe('deployed');

      const r4 = await manager.acceptRelease('v1.0.0-rc.1', 'reviewer');
      expect(r4.state).toBe('accepted');
    });

    it('transitions: pending -> gates-running -> deployed -> qa-review -> rejected', async () => {
      const manager = makeManager();

      await manager.startRelease('v1.0.0-rc.1', 'abc123');
      await manager.runGates('v1.0.0-rc.1');
      await manager.deployPreview('v1.0.0-rc.1');

      const rejected = await manager.rejectRelease('v1.0.0-rc.1', 'reviewer', 'Broken');
      expect(rejected.state).toBe('rejected');
    });

    it('invalid state transition throws error (pending -> accepted directly)', async () => {
      const manager = makeManager();
      await manager.startRelease('v1.0.0-rc.1', 'abc123');

      await expect(
        manager.acceptRelease('v1.0.0-rc.1', 'reviewer')
      ).rejects.toThrow(/invalid state transition/i);
    });
  });

  describe('release metadata', () => {
    it('stores release metadata: tag, commit, gates results, QA reviewer, timestamps', async () => {
      const manager = makeManager();

      await manager.startRelease('v1.0.0-rc.1', 'abc123');
      await manager.runGates('v1.0.0-rc.1');
      await manager.deployPreview('v1.0.0-rc.1');
      const release = await manager.acceptRelease('v1.0.0-rc.1', 'qa-person');

      expect(release.tag).toBe('v1.0.0-rc.1');
      expect(release.commitSha).toBe('abc123');
      expect(release.gateResults).toBeDefined();
      expect(release.gateResults.passed).toBe(true);
      expect(release.reviewer).toBe('qa-person');
      expect(release.createdAt).toBeDefined();
      expect(release.updatedAt).toBeDefined();
      expect(new Date(release.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(release.createdAt).getTime());
    });
  });

  describe('callbacks', () => {
    it('on QA accept: calls promote callback (deploy)', async () => {
      const deployCb = vi.fn().mockResolvedValue({ url: 'https://preview.example.com' });
      const manager = makeManager({ deploy: deployCb });

      await manager.startRelease('v1.0.0-rc.1', 'abc123');
      await manager.runGates('v1.0.0-rc.1');
      await manager.deployPreview('v1.0.0-rc.1');
      await manager.acceptRelease('v1.0.0-rc.1', 'reviewer');

      // deploy called during deployPreview, notify called on accept
      expect(deployCb).toHaveBeenCalled();
    });

    it('on QA reject: calls notify callback with rejection reason', async () => {
      const notifyCb = vi.fn().mockResolvedValue(undefined);
      const manager = makeManager({ notify: notifyCb });

      await manager.startRelease('v1.0.0-rc.1', 'abc123');
      await manager.runGates('v1.0.0-rc.1');
      await manager.deployPreview('v1.0.0-rc.1');
      await manager.rejectRelease('v1.0.0-rc.1', 'reviewer', 'Layout broken');

      expect(notifyCb).toHaveBeenCalledWith(
        expect.objectContaining({
          tag: 'v1.0.0-rc.1',
          reason: 'Layout broken',
          reviewer: 'reviewer',
        })
      );
    });
  });

  describe('persistence', () => {
    it('persists release to .tlc/releases/{tag}.json (mock fs)', async () => {
      const manager = makeManager();

      await manager.startRelease('v1.0.0-rc.1', 'abc123');

      expect(fsp.mkdir).toHaveBeenCalled();
      expect(fsp.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('v1.0.0-rc.1.json'),
        expect.any(String)
      );
    });

    it('loads release from persisted file', async () => {
      const storedRelease = {
        tag: 'v2.0.0-beta.1',
        commitSha: 'def456',
        tier: 'beta',
        state: 'deployed',
        gateResults: { passed: true, results: [] },
        previewUrl: 'https://qa-v2.0.0-beta.1.example.com',
        reviewer: null,
        reason: null,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      fsp.readFile.mockResolvedValueOnce(JSON.stringify(storedRelease));

      const manager = makeManager();
      const release = await manager.getRelease('v2.0.0-beta.1');

      expect(release).toBeDefined();
      expect(release.tag).toBe('v2.0.0-beta.1');
      expect(release.state).toBe('deployed');
    });

    it('release history is queryable (list all releases)', async () => {
      fsp.readdir.mockResolvedValueOnce(['v1.0.0-rc.1.json', 'v1.0.0-rc.2.json']);
      fsp.readFile
        .mockResolvedValueOnce(JSON.stringify({
          tag: 'v1.0.0-rc.1', commitSha: 'aaa', tier: 'rc', state: 'accepted',
          gateResults: null, previewUrl: null, reviewer: null, reason: null,
          createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z',
        }))
        .mockResolvedValueOnce(JSON.stringify({
          tag: 'v1.0.0-rc.2', commitSha: 'bbb', tier: 'rc', state: 'pending',
          gateResults: null, previewUrl: null, reviewer: null, reason: null,
          createdAt: '2025-01-02T00:00:00.000Z', updatedAt: '2025-01-02T00:00:00.000Z',
        }));

      const manager = makeManager();
      const releases = await manager.listReleases();

      expect(releases).toHaveLength(2);
      // Sorted by creation time ascending
      expect(releases[0].tag).toBe('v1.0.0-rc.1');
      expect(releases[1].tag).toBe('v1.0.0-rc.2');
    });
  });

  describe('retry gates', () => {
    it('retry re-runs only failed gates (passed gates are kept)', async () => {
      const testChecker = vi.fn()
        .mockResolvedValueOnce({ passed: false, total: 10, failed: 2 })
        .mockResolvedValueOnce({ passed: true, total: 10, failed: 0 });
      const securityChecker = vi.fn()
        .mockResolvedValue({ passed: true, secrets: [] });

      const manager = makeManager({
        checkers: {
          tests: testChecker,
          security: securityChecker,
        },
      });

      await manager.startRelease('v1.0.0-rc.1', 'abc123');
      const firstRun = await manager.runGates('v1.0.0-rc.1');
      expect(firstRun.passed).toBe(false);

      // Retry - should only re-run the failed 'tests' gate
      const retryResult = await manager.retryGates('v1.0.0-rc.1');
      expect(retryResult.passed).toBe(true);

      // tests was called twice (initial + retry), security only once (kept from first run)
      expect(testChecker).toHaveBeenCalledTimes(2);
      expect(securityChecker).toHaveBeenCalledTimes(1);
    });

    it('retry on a non-existent release throws error', async () => {
      const manager = makeManager();
      await expect(manager.retryGates('v9.9.9')).rejects.toThrow(/not found/i);
    });
  });

  describe('deploy function', () => {
    it('deploy function receives tag info and preview URL', async () => {
      const deployCb = vi.fn().mockResolvedValue({ url: 'https://qa-v1.0.0-rc.1.example.com' });
      const manager = makeManager({ deploy: deployCb });

      await manager.startRelease('v1.0.0-rc.1', 'abc123');
      await manager.runGates('v1.0.0-rc.1');
      await manager.deployPreview('v1.0.0-rc.1');

      expect(deployCb).toHaveBeenCalledWith(
        expect.objectContaining({
          tag: 'v1.0.0-rc.1',
          commitSha: 'abc123',
          tier: 'rc',
        }),
        expect.stringContaining('v1.0.0-rc.1')
      );
    });
  });

  describe('multiple releases', () => {
    it('multiple releases can be tracked simultaneously', async () => {
      const manager = makeManager();

      await manager.startRelease('v1.0.0-rc.1', 'aaa');
      await manager.startRelease('v1.0.0-rc.2', 'bbb');

      const r1 = await manager.getRelease('v1.0.0-rc.1');
      const r2 = await manager.getRelease('v1.0.0-rc.2');

      expect(r1).toBeDefined();
      expect(r1.tag).toBe('v1.0.0-rc.1');
      expect(r2).toBeDefined();
      expect(r2.tag).toBe('v1.0.0-rc.2');
    });
  });

  describe('getRelease', () => {
    it('returns null for unknown tag', async () => {
      const manager = makeManager();
      const result = await manager.getRelease('v99.99.99');
      expect(result).toBeNull();
    });
  });

  describe('listReleases', () => {
    it('returns sorted by creation time', async () => {
      const manager = makeManager();

      // Create releases with slight time difference
      await manager.startRelease('v1.0.0-rc.2', 'bbb');
      await manager.startRelease('v1.0.0-rc.1', 'aaa');

      // Reset readdir mock to return nothing (all in-memory)
      fsp.readdir.mockResolvedValue([]);

      const releases = await manager.listReleases();

      expect(releases).toHaveLength(2);
      // Should be sorted by createdAt ascending
      expect(new Date(releases[0].createdAt).getTime())
        .toBeLessThanOrEqual(new Date(releases[1].createdAt).getTime());
    });
  });

  describe('gates-failed state', () => {
    it('sets state to gates-failed when gates fail', async () => {
      const manager = makeManager({
        checkers: {
          tests: vi.fn().mockResolvedValue({ passed: false, total: 10, failed: 5 }),
          security: vi.fn().mockResolvedValue({ passed: true, secrets: [] }),
        },
      });

      await manager.startRelease('v1.0.0-rc.1', 'abc123');
      await manager.runGates('v1.0.0-rc.1');

      const release = await manager.getRelease('v1.0.0-rc.1');
      expect(release.state).toBe('gates-failed');
    });
  });

  describe('edge cases', () => {
    it('cannot run gates on non-existent release', async () => {
      const manager = makeManager();
      await expect(manager.runGates('v9.9.9')).rejects.toThrow(/not found/i);
    });

    it('cannot deploy non-existent release', async () => {
      const manager = makeManager();
      await expect(manager.deployPreview('v9.9.9')).rejects.toThrow(/not found/i);
    });

    it('cannot reject a release in pending state', async () => {
      const manager = makeManager();
      await manager.startRelease('v1.0.0-rc.1', 'abc123');
      await expect(
        manager.rejectRelease('v1.0.0-rc.1', 'reviewer', 'bad')
      ).rejects.toThrow(/invalid state transition/i);
    });

    it('cannot deploy when gates failed', async () => {
      const manager = makeManager({
        checkers: {
          tests: vi.fn().mockResolvedValue({ passed: false, total: 10, failed: 3 }),
          security: vi.fn().mockResolvedValue({ passed: true, secrets: [] }),
        },
      });

      await manager.startRelease('v1.0.0-rc.1', 'abc123');
      await manager.runGates('v1.0.0-rc.1');

      await expect(manager.deployPreview('v1.0.0-rc.1')).rejects.toThrow(/invalid state transition/i);
    });

    it('persistence is skipped when persist option is false', async () => {
      const config = makeConfig();
      const manager = createReleaseManager(config, {
        deploy: vi.fn().mockResolvedValue({}),
        notify: vi.fn(),
        persist: false,
        checkers: {
          tests: vi.fn().mockResolvedValue({ passed: true, total: 1, failed: 0 }),
        },
        domain: 'example.com',
      });

      await manager.startRelease('v1.0.0-beta.1', 'abc');
      // writeFile should not have been called
      expect(fsp.writeFile).not.toHaveBeenCalled();
    });
  });
});
