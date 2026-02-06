/**
 * Tag Release Command Tests
 *
 * Tests for /tlc:tag CLI command covering all subcommands:
 * create, status, accept, reject, promote, retry, list, history
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeTagCommand } from './tag-release-command.js';

/**
 * Build a mock release manager with sensible defaults.
 * Each method is a vi.fn() that can be overridden per test.
 */
function makeMockManager(overrides = {}) {
  return {
    startRelease: vi.fn().mockResolvedValue({
      tag: 'v1.0.0-rc.1',
      commitSha: 'abc123',
      tier: 'rc',
      state: 'pending',
    }),
    runGates: vi.fn().mockResolvedValue({ passed: true, results: [] }),
    deployPreview: vi.fn().mockResolvedValue('https://qa-v1.0.0-rc.1.example.com'),
    acceptRelease: vi.fn().mockResolvedValue({
      tag: 'v1.0.0-rc.1',
      state: 'accepted',
      reviewer: 'qa-lead',
    }),
    rejectRelease: vi.fn().mockResolvedValue({
      tag: 'v1.0.0-rc.1',
      state: 'rejected',
      reviewer: 'qa-lead',
      reason: 'UI broken',
    }),
    retryGates: vi.fn().mockResolvedValue({ passed: true, results: [] }),
    getRelease: vi.fn().mockResolvedValue(null),
    listReleases: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

/**
 * Build a mock audit instance.
 */
function makeMockAudit(overrides = {}) {
  return {
    recordEvent: vi.fn().mockReturnValue({ id: 'evt-1', tag: 'v1.0.0-rc.1', action: 'created' }),
    getEvents: vi.fn().mockReturnValue([]),
    getAuditTrail: vi.fn().mockReturnValue([]),
    getSummary: vi.fn().mockReturnValue([]),
    ...overrides,
  };
}

/**
 * Build a standard test context with DI.
 */
function makeContext(overrides = {}) {
  return {
    config: { release: {} },
    projectDir: '/tmp/test-project',
    user: { name: 'developer', role: 'developer' },
    manager: makeMockManager(overrides.managerOverrides),
    audit: makeMockAudit(overrides.auditOverrides),
    ...overrides,
  };
}

describe('tag-release-command', () => {
  // ─── create subcommand ────────────────────────────────────────────

  describe('create subcommand', () => {
    it('creates git tag and triggers pipeline', async () => {
      const ctx = makeContext();
      const result = await executeTagCommand('create', { tag: 'v1.0.0-rc.1', commit: 'abc123' }, ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain('v1.0.0-rc.1');
      expect(ctx.manager.startRelease).toHaveBeenCalledWith('v1.0.0-rc.1', 'abc123');
      expect(ctx.audit.recordEvent).toHaveBeenCalled();
    });

    it('validates tag format before proceeding', async () => {
      const ctx = makeContext();
      const result = await executeTagCommand('create', { tag: 'v1.0.0-rc.1', commit: 'abc123' }, ctx);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('rejects invalid tag names', async () => {
      const ctx = makeContext();
      const result = await executeTagCommand('create', { tag: 'not-a-valid-tag', commit: 'abc123' }, ctx);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/invalid/i);
      expect(ctx.manager.startRelease).not.toHaveBeenCalled();
    });
  });

  // ─── status subcommand ────────────────────────────────────────────

  describe('status subcommand', () => {
    it('shows current gate progress for a tag', async () => {
      const release = {
        tag: 'v1.0.0-rc.1',
        state: 'gates-running',
        gateResults: { passed: false, results: [{ gate: 'tests', status: 'pass' }] },
      };
      const ctx = makeContext({
        managerOverrides: { getRelease: vi.fn().mockResolvedValue(release) },
      });

      const result = await executeTagCommand('status', { tag: 'v1.0.0-rc.1' }, ctx);

      expect(result.success).toBe(true);
      expect(result.data.state).toBe('gates-running');
    });

    it('shows "not found" for unknown tag', async () => {
      const ctx = makeContext({
        managerOverrides: { getRelease: vi.fn().mockResolvedValue(null) },
      });

      const result = await executeTagCommand('status', { tag: 'v9.9.9' }, ctx);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/not found/i);
    });

    it('shows all active releases with no args', async () => {
      const releases = [
        { tag: 'v1.0.0-rc.1', state: 'deployed' },
        { tag: 'v1.0.0-rc.2', state: 'pending' },
      ];
      const ctx = makeContext({
        managerOverrides: { listReleases: vi.fn().mockResolvedValue(releases) },
      });

      const result = await executeTagCommand('status', {}, ctx);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  // ─── accept subcommand ────────────────────────────────────────────

  describe('accept subcommand', () => {
    it('requires qa or admin role', async () => {
      const ctx = makeContext({
        user: { name: 'qa-lead', role: 'qa' },
      });

      const result = await executeTagCommand('accept', { tag: 'v1.0.0-rc.1' }, ctx);

      expect(result.success).toBe(true);
      expect(ctx.manager.acceptRelease).toHaveBeenCalledWith('v1.0.0-rc.1', 'qa-lead');
    });

    it('rejects unauthorized users (developer role)', async () => {
      const ctx = makeContext({
        user: { name: 'dev1', role: 'developer' },
      });

      const result = await executeTagCommand('accept', { tag: 'v1.0.0-rc.1' }, ctx);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/unauthorized|permission|role/i);
      expect(ctx.manager.acceptRelease).not.toHaveBeenCalled();
    });

    it('updates release state to accepted', async () => {
      const ctx = makeContext({
        user: { name: 'admin1', role: 'admin' },
      });

      const result = await executeTagCommand('accept', { tag: 'v1.0.0-rc.1' }, ctx);

      expect(result.success).toBe(true);
      expect(result.data.state).toBe('accepted');
      expect(ctx.audit.recordEvent).toHaveBeenCalled();
    });
  });

  // ─── reject subcommand ────────────────────────────────────────────

  describe('reject subcommand', () => {
    it('stores reason and marks as rejected', async () => {
      const ctx = makeContext({
        user: { name: 'qa-lead', role: 'qa' },
      });

      const result = await executeTagCommand(
        'reject',
        { tag: 'v1.0.0-rc.1', reason: 'UI broken on mobile' },
        ctx
      );

      expect(result.success).toBe(true);
      expect(ctx.manager.rejectRelease).toHaveBeenCalledWith(
        'v1.0.0-rc.1',
        'qa-lead',
        'UI broken on mobile'
      );
      expect(result.data.state).toBe('rejected');
    });

    it('requires reason text (fails without it)', async () => {
      const ctx = makeContext({
        user: { name: 'qa-lead', role: 'qa' },
      });

      const result = await executeTagCommand('reject', { tag: 'v1.0.0-rc.1' }, ctx);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/reason/i);
      expect(ctx.manager.rejectRelease).not.toHaveBeenCalled();
    });

    it('requires qa or admin role', async () => {
      const ctx = makeContext({
        user: { name: 'dev1', role: 'developer' },
      });

      const result = await executeTagCommand(
        'reject',
        { tag: 'v1.0.0-rc.1', reason: 'Bad build' },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/unauthorized|permission|role/i);
    });
  });

  // ─── promote subcommand ───────────────────────────────────────────

  describe('promote subcommand', () => {
    it('creates clean version tag from RC (v1.0.0-rc.1 -> v1.0.0)', async () => {
      const ctx = makeContext({
        managerOverrides: {
          getRelease: vi.fn().mockResolvedValue({
            tag: 'v1.0.0-rc.1',
            state: 'accepted',
            tier: 'rc',
          }),
        },
      });

      const result = await executeTagCommand('promote', { tag: 'v1.0.0-rc.1' }, ctx);

      expect(result.success).toBe(true);
      expect(result.data.promotedTag).toBe('v1.0.0');
      expect(result.message).toContain('v1.0.0');
    });

    it('rejects if release not accepted', async () => {
      const ctx = makeContext({
        managerOverrides: {
          getRelease: vi.fn().mockResolvedValue({
            tag: 'v1.0.0-rc.1',
            state: 'deployed',
            tier: 'rc',
          }),
        },
      });

      const result = await executeTagCommand('promote', { tag: 'v1.0.0-rc.1' }, ctx);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/accepted|not accepted/i);
    });

    it('rejects non-RC tags', async () => {
      const ctx = makeContext({
        managerOverrides: {
          getRelease: vi.fn().mockResolvedValue({
            tag: 'v1.0.0-beta.1',
            state: 'accepted',
            tier: 'beta',
          }),
        },
      });

      const result = await executeTagCommand('promote', { tag: 'v1.0.0-beta.1' }, ctx);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/rc|release candidate/i);
    });
  });

  // ─── retry subcommand ─────────────────────────────────────────────

  describe('retry subcommand', () => {
    it('only re-runs failed gates', async () => {
      const ctx = makeContext({
        managerOverrides: {
          getRelease: vi.fn().mockResolvedValue({
            tag: 'v1.0.0-rc.1',
            state: 'gates-failed',
            gateResults: {
              passed: false,
              results: [
                { gate: 'tests', status: 'pass' },
                { gate: 'security', status: 'fail' },
              ],
            },
          }),
          retryGates: vi.fn().mockResolvedValue({
            passed: true,
            results: [
              { gate: 'tests', status: 'pass' },
              { gate: 'security', status: 'pass' },
            ],
          }),
        },
      });

      const result = await executeTagCommand('retry', { tag: 'v1.0.0-rc.1' }, ctx);

      expect(result.success).toBe(true);
      expect(ctx.manager.retryGates).toHaveBeenCalledWith('v1.0.0-rc.1');
    });

    it('rejects if no failed gates', async () => {
      const ctx = makeContext({
        managerOverrides: {
          getRelease: vi.fn().mockResolvedValue({
            tag: 'v1.0.0-rc.1',
            state: 'gates-passed',
            gateResults: {
              passed: true,
              results: [{ gate: 'tests', status: 'pass' }],
            },
          }),
        },
      });

      const result = await executeTagCommand('retry', { tag: 'v1.0.0-rc.1' }, ctx);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/no failed|already passed|not failed/i);
    });
  });

  // ─── list subcommand ──────────────────────────────────────────────

  describe('list subcommand', () => {
    it('shows tags with status indicators', async () => {
      const releases = [
        { tag: 'v1.0.0-rc.1', state: 'accepted', tier: 'rc' },
        { tag: 'v1.1.0-rc.1', state: 'pending', tier: 'rc' },
      ];
      const ctx = makeContext({
        managerOverrides: { listReleases: vi.fn().mockResolvedValue(releases) },
      });

      const result = await executeTagCommand('list', {}, ctx);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.message).toContain('v1.0.0-rc.1');
      expect(result.message).toContain('v1.1.0-rc.1');
    });

    it('sorts by version descending', async () => {
      const releases = [
        { tag: 'v1.0.0-rc.1', state: 'accepted', tier: 'rc' },
        { tag: 'v2.0.0-rc.1', state: 'pending', tier: 'rc' },
        { tag: 'v1.1.0-rc.1', state: 'deployed', tier: 'rc' },
      ];
      const ctx = makeContext({
        managerOverrides: { listReleases: vi.fn().mockResolvedValue(releases) },
      });

      const result = await executeTagCommand('list', {}, ctx);

      expect(result.success).toBe(true);
      // Should be sorted v2.0.0-rc.1, v1.1.0-rc.1, v1.0.0-rc.1
      expect(result.data[0].tag).toBe('v2.0.0-rc.1');
      expect(result.data[1].tag).toBe('v1.1.0-rc.1');
      expect(result.data[2].tag).toBe('v1.0.0-rc.1');
    });

    it('shows empty message when no releases', async () => {
      const ctx = makeContext({
        managerOverrides: { listReleases: vi.fn().mockResolvedValue([]) },
      });

      const result = await executeTagCommand('list', {}, ctx);

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/no releases|empty|none/i);
      expect(result.data).toHaveLength(0);
    });
  });

  // ─── history subcommand ───────────────────────────────────────────

  describe('history subcommand', () => {
    it('shows chronological release decisions', async () => {
      const events = [
        { id: 'evt-1', tag: 'v1.0.0-rc.1', action: 'created', user: 'dev1', timestamp: '2024-01-01T00:00:00Z' },
        { id: 'evt-2', tag: 'v1.0.0-rc.1', action: 'accepted', user: 'qa-lead', timestamp: '2024-01-02T00:00:00Z' },
      ];
      const ctx = makeContext({
        auditOverrides: {
          getAuditTrail: vi.fn().mockReturnValue(events),
          getSummary: vi.fn().mockReturnValue([
            { tag: 'v1.0.0-rc.1', status: 'accepted', lastEvent: 'accepted', lastUpdated: '2024-01-02T00:00:00Z' },
          ]),
        },
      });

      const result = await executeTagCommand('history', {}, ctx);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('filters by tag when specified', async () => {
      const events = [
        { id: 'evt-1', tag: 'v1.0.0-rc.1', action: 'created', user: 'dev1', timestamp: '2024-01-01T00:00:00Z' },
      ];
      const ctx = makeContext({
        auditOverrides: { getAuditTrail: vi.fn().mockReturnValue(events) },
      });

      const result = await executeTagCommand('history', { tag: 'v1.0.0-rc.1' }, ctx);

      expect(result.success).toBe(true);
      expect(ctx.audit.getAuditTrail).toHaveBeenCalledWith('v1.0.0-rc.1');
    });
  });

  // ─── validation and error handling ────────────────────────────────

  describe('validation and error handling', () => {
    it('validates user role from config before accept/reject', async () => {
      const ctx = makeContext({
        user: { name: 'intern', role: 'viewer' },
      });

      const acceptResult = await executeTagCommand('accept', { tag: 'v1.0.0-rc.1' }, ctx);
      expect(acceptResult.success).toBe(false);

      const rejectResult = await executeTagCommand(
        'reject',
        { tag: 'v1.0.0-rc.1', reason: 'Bad' },
        ctx
      );
      expect(rejectResult.success).toBe(false);
    });

    it('returns structured output { success, message, data }', async () => {
      const ctx = makeContext();
      const result = await executeTagCommand('create', { tag: 'v1.0.0-rc.1', commit: 'abc123' }, ctx);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('data');
    });

    it('unknown subcommand returns error', async () => {
      const ctx = makeContext();
      const result = await executeTagCommand('deploy', {}, ctx);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/unknown|unsupported|invalid/i);
    });

    it('help text lists available subcommands', async () => {
      const ctx = makeContext();
      const result = await executeTagCommand('help', {}, ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain('create');
      expect(result.message).toContain('status');
      expect(result.message).toContain('accept');
      expect(result.message).toContain('reject');
      expect(result.message).toContain('promote');
      expect(result.message).toContain('retry');
      expect(result.message).toContain('list');
      expect(result.message).toContain('history');
    });

    it('each subcommand has proper error handling', async () => {
      const ctx = makeContext({
        managerOverrides: {
          startRelease: vi.fn().mockRejectedValue(new Error('Disk full')),
        },
      });

      const result = await executeTagCommand('create', { tag: 'v1.0.0-rc.1', commit: 'abc123' }, ctx);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Disk full');
    });

    it('accept error handling catches manager exceptions', async () => {
      const ctx = makeContext({
        user: { name: 'qa-lead', role: 'qa' },
        managerOverrides: {
          acceptRelease: vi.fn().mockRejectedValue(new Error('Invalid state transition')),
        },
      });

      const result = await executeTagCommand('accept', { tag: 'v1.0.0-rc.1' }, ctx);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid state transition');
    });

    it('promote returns not found for missing release', async () => {
      const ctx = makeContext({
        managerOverrides: {
          getRelease: vi.fn().mockResolvedValue(null),
        },
      });

      const result = await executeTagCommand('promote', { tag: 'v9.9.9-rc.1' }, ctx);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/not found/i);
    });

    it('retry returns not found for missing release', async () => {
      const ctx = makeContext({
        managerOverrides: {
          getRelease: vi.fn().mockResolvedValue(null),
        },
      });

      const result = await executeTagCommand('retry', { tag: 'v9.9.9-rc.1' }, ctx);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/not found/i);
    });
  });
});
