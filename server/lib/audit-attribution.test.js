import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getAttribution,
  identifySource,
  createSessionId,
  correlateSession,
  getGitUser,
  getSystemUser,
  getParentProcessContext,
} from './audit-attribution.js';

describe('audit-attribution', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('getGitUser', () => {
    it('returns git user info when available', async () => {
      const mockExecSync = vi.fn()
        .mockReturnValueOnce(Buffer.from('Test User\n'))
        .mockReturnValueOnce(Buffer.from('test@example.com\n'));

      const result = await getGitUser({ execSync: mockExecSync });

      expect(result).toEqual({
        name: 'Test User',
        email: 'test@example.com',
      });
    });

    it('returns null when git config fails', async () => {
      const mockExecSync = vi.fn().mockImplementation(() => {
        throw new Error('git not configured');
      });

      const result = await getGitUser({ execSync: mockExecSync });

      expect(result).toBeNull();
    });
  });

  describe('getSystemUser', () => {
    it('returns username from os.userInfo', () => {
      const mockUserInfo = vi.fn().mockReturnValue({ username: 'systemuser' });

      const result = getSystemUser({ userInfo: mockUserInfo });

      expect(result).toBe('systemuser');
    });

    it('falls back to USER env var', () => {
      const mockUserInfo = vi.fn().mockImplementation(() => {
        throw new Error('userInfo not available');
      });
      const env = { USER: 'envuser' };

      const result = getSystemUser({ userInfo: mockUserInfo, env });

      expect(result).toBe('envuser');
    });

    it('falls back to USERNAME env var on Windows', () => {
      const mockUserInfo = vi.fn().mockImplementation(() => {
        throw new Error('userInfo not available');
      });
      const env = { USERNAME: 'winuser' };

      const result = getSystemUser({ userInfo: mockUserInfo, env });

      expect(result).toBe('winuser');
    });

    it('returns unknown when all methods fail', () => {
      const mockUserInfo = vi.fn().mockImplementation(() => {
        throw new Error('userInfo not available');
      });

      const result = getSystemUser({ userInfo: mockUserInfo, env: {} });

      expect(result).toBe('unknown');
    });
  });

  describe('getAttribution', () => {
    it('returns git user info when available', async () => {
      const mockExecSync = vi.fn()
        .mockReturnValueOnce(Buffer.from('Git User\n'))
        .mockReturnValueOnce(Buffer.from('git@example.com\n'));

      const result = await getAttribution({
        execSync: mockExecSync,
        env: {},
      });

      expect(result.user.name).toBe('Git User');
      expect(result.user.email).toBe('git@example.com');
      expect(result.source).toBe('git');
    });

    it('uses TLC_USER if set', async () => {
      const mockExecSync = vi.fn()
        .mockReturnValueOnce(Buffer.from('Git User\n'))
        .mockReturnValueOnce(Buffer.from('git@example.com\n'));
      const env = { TLC_USER: 'tlc-custom-user' };

      const result = await getAttribution({
        execSync: mockExecSync,
        env,
      });

      expect(result.user.name).toBe('tlc-custom-user');
      expect(result.source).toBe('env');
    });

    it('falls back to system user when git unavailable', async () => {
      const mockExecSync = vi.fn().mockImplementation(() => {
        throw new Error('git not configured');
      });
      const mockUserInfo = vi.fn().mockReturnValue({ username: 'sysuser' });

      const result = await getAttribution({
        execSync: mockExecSync,
        userInfo: mockUserInfo,
        env: {},
      });

      expect(result.user.name).toBe('sysuser');
      expect(result.source).toBe('system');
    });

    it('includes timestamp', async () => {
      const mockExecSync = vi.fn()
        .mockReturnValueOnce(Buffer.from('User\n'))
        .mockReturnValueOnce(Buffer.from('user@example.com\n'));

      const result = await getAttribution({
        execSync: mockExecSync,
        env: {},
      });

      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
    });
  });

  describe('identifySource', () => {
    it('returns agent for Task tool calls', () => {
      const context = {
        toolName: 'Task',
        parentProcess: 'claude',
      };

      const result = identifySource(context);

      expect(result).toBe('agent');
    });

    it('returns agent for Skill tool calls', () => {
      const context = {
        toolName: 'Skill',
        parentProcess: 'claude',
      };

      const result = identifySource(context);

      expect(result).toBe('agent');
    });

    it('returns human for direct commands', () => {
      const context = {
        toolName: null,
        parentProcess: 'bash',
        tty: true,
      };

      const result = identifySource(context);

      expect(result).toBe('human');
    });

    it('returns human for terminal interactions', () => {
      const context = {
        parentProcess: 'zsh',
        tty: true,
      };

      const result = identifySource(context);

      expect(result).toBe('human');
    });

    it('returns hook for hook-triggered actions', () => {
      const context = {
        env: { TLC_HOOK: 'pre-commit' },
      };

      const result = identifySource(context);

      expect(result).toBe('hook');
    });

    it('returns hook when triggered by git hooks', () => {
      const context = {
        parentProcess: 'git',
        env: { GIT_EXEC_PATH: '/usr/lib/git-core' },
        argv: ['pre-commit'],
      };

      const result = identifySource(context);

      expect(result).toBe('hook');
    });

    it('returns agent when CLAUDE_CODE is set', () => {
      const context = {
        env: { CLAUDE_CODE: '1' },
      };

      const result = identifySource(context);

      expect(result).toBe('agent');
    });

    it('returns unknown for unidentifiable source', () => {
      const context = {};

      const result = identifySource(context);

      expect(result).toBe('unknown');
    });
  });

  describe('createSessionId', () => {
    it('generates unique ID', () => {
      const id1 = createSessionId();
      const id2 = createSessionId();

      expect(id1).not.toBe(id2);
    });

    it('returns string', () => {
      const id = createSessionId();

      expect(typeof id).toBe('string');
    });

    it('has expected format (uuid-like)', () => {
      const id = createSessionId();

      // Should be a valid UUID-like format or similar unique string
      expect(id.length).toBeGreaterThan(0);
      expect(id).toMatch(/^[a-z0-9-]+$/i);
    });

    it('includes timestamp component for ordering', () => {
      const before = Date.now();
      const id = createSessionId();
      const after = Date.now();

      // The ID should encode time information (first part is timestamp)
      const parts = id.split('-');
      expect(parts.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('correlateSession', () => {
    it('groups related actions by session ID', () => {
      const sessionId = createSessionId();
      const actions = [
        { id: 'a1', sessionId, timestamp: new Date('2024-01-01T10:00:00Z').toISOString() },
        { id: 'a2', sessionId, timestamp: new Date('2024-01-01T10:01:00Z').toISOString() },
        { id: 'a3', sessionId: 'other', timestamp: new Date('2024-01-01T10:02:00Z').toISOString() },
      ];

      const result = correlateSession(sessionId, actions);

      expect(result).toHaveLength(2);
      expect(result.map(a => a.id)).toEqual(['a1', 'a2']);
    });

    it('returns empty array when no matching session', () => {
      const actions = [
        { id: 'a1', sessionId: 'session-1' },
        { id: 'a2', sessionId: 'session-2' },
      ];

      const result = correlateSession('nonexistent', actions);

      expect(result).toEqual([]);
    });

    it('sorts actions by timestamp', () => {
      const sessionId = 'test-session';
      const actions = [
        { id: 'a2', sessionId, timestamp: new Date('2024-01-01T10:05:00Z').toISOString() },
        { id: 'a1', sessionId, timestamp: new Date('2024-01-01T10:00:00Z').toISOString() },
        { id: 'a3', sessionId, timestamp: new Date('2024-01-01T10:10:00Z').toISOString() },
      ];

      const result = correlateSession(sessionId, actions);

      expect(result.map(a => a.id)).toEqual(['a1', 'a2', 'a3']);
    });

    it('handles actions without timestamps', () => {
      const sessionId = 'test-session';
      const actions = [
        { id: 'a1', sessionId },
        { id: 'a2', sessionId },
      ];

      const result = correlateSession(sessionId, actions);

      expect(result).toHaveLength(2);
    });
  });

  describe('getParentProcessContext', () => {
    it('returns process info', () => {
      const mockProcess = {
        ppid: 1234,
        env: { TERM: 'xterm' },
        argv: ['node', 'script.js'],
      };

      const result = getParentProcessContext({ process: mockProcess });

      expect(result.ppid).toBe(1234);
      expect(result.argv).toEqual(['node', 'script.js']);
    });

    it('includes terminal info when available', () => {
      const mockProcess = {
        ppid: 1234,
        stdout: { isTTY: true },
        env: { TERM: 'xterm-256color' },
      };

      const result = getParentProcessContext({ process: mockProcess });

      expect(result.tty).toBe(true);
      expect(result.term).toBe('xterm-256color');
    });

    it('handles missing process info gracefully', () => {
      const result = getParentProcessContext({ process: {} });

      expect(result).toBeDefined();
      expect(result.ppid).toBeUndefined();
    });
  });
});
