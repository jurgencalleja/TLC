/**
 * Checkpoint Manager Tests
 * Task 5: Create and manage git-based checkpoints for safe refactoring
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('CheckpointManager', () => {
  let mockExec;
  let mockFs;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('createCheckpoint', () => {
    it('creates stash with uncommitted changes', async () => {
      const { CheckpointManager } = await import('./checkpoint-manager.js');

      const execMock = vi.fn()
        .mockResolvedValueOnce({ stdout: 'main\n' }) // git branch --show-current
        .mockResolvedValueOnce({ stdout: ' M file.js\n' }) // git status
        .mockResolvedValueOnce({ stdout: '' }) // git stash
        .mockResolvedValueOnce({ stdout: '' }) // git checkout -b
        .mockResolvedValueOnce({ stdout: 'abc123' }); // git rev-parse HEAD

      const readFileMock = vi.fn().mockRejectedValue(new Error('ENOENT'));
      const writeFileMock = vi.fn().mockResolvedValue();

      const manager = new CheckpointManager({
        exec: execMock,
        readFile: readFileMock,
        writeFile: writeFileMock,
      });

      const checkpoint = await manager.create();

      expect(execMock).toHaveBeenCalledWith('git status --porcelain');
      expect(execMock).toHaveBeenCalledWith(expect.stringContaining('git stash push'));
      expect(checkpoint.hasStash).toBe(true);
    });

    it('creates branch with naming pattern refactor/{timestamp}', async () => {
      const { CheckpointManager } = await import('./checkpoint-manager.js');

      const execMock = vi.fn()
        .mockResolvedValueOnce({ stdout: 'main\n' }) // git branch --show-current
        .mockResolvedValueOnce({ stdout: '' }) // git status (clean)
        .mockResolvedValueOnce({ stdout: '' }) // git checkout -b
        .mockResolvedValueOnce({ stdout: 'abc123' }); // git rev-parse HEAD

      const readFileMock = vi.fn().mockRejectedValue(new Error('ENOENT'));
      const writeFileMock = vi.fn().mockResolvedValue();

      const manager = new CheckpointManager({
        exec: execMock,
        readFile: readFileMock,
        writeFile: writeFileMock,
      });

      const checkpoint = await manager.create();

      expect(execMock).toHaveBeenCalledWith(
        expect.stringMatching(/git checkout -b refactor\/\d+/)
      );
      expect(checkpoint.branch).toMatch(/^refactor\/\d+$/);
    });

    it('stores original branch for rollback', async () => {
      const { CheckpointManager } = await import('./checkpoint-manager.js');

      const execMock = vi.fn()
        .mockResolvedValueOnce({ stdout: 'feature/my-feature\n' }) // git branch --show-current
        .mockResolvedValueOnce({ stdout: '' }) // git status
        .mockResolvedValueOnce({ stdout: '' }) // git checkout -b
        .mockResolvedValueOnce({ stdout: 'abc123' }); // git rev-parse HEAD

      const readFileMock = vi.fn().mockRejectedValue(new Error('ENOENT'));
      const writeFileMock = vi.fn().mockResolvedValue();

      const manager = new CheckpointManager({
        exec: execMock,
        readFile: readFileMock,
        writeFile: writeFileMock,
      });

      const checkpoint = await manager.create();

      expect(checkpoint.originalBranch).toBe('feature/my-feature');
    });

    it('handles already clean working directory', async () => {
      const { CheckpointManager } = await import('./checkpoint-manager.js');

      const execMock = vi.fn()
        .mockResolvedValueOnce({ stdout: 'main\n' }) // git branch --show-current
        .mockResolvedValueOnce({ stdout: '' }) // git status (clean)
        .mockResolvedValueOnce({ stdout: '' }) // git checkout -b
        .mockResolvedValueOnce({ stdout: 'abc123' }); // git rev-parse HEAD

      const readFileMock = vi.fn().mockRejectedValue(new Error('ENOENT'));
      const writeFileMock = vi.fn().mockResolvedValue();

      const manager = new CheckpointManager({
        exec: execMock,
        readFile: readFileMock,
        writeFile: writeFileMock,
      });

      const checkpoint = await manager.create();

      expect(checkpoint.hasStash).toBe(false);
      expect(execMock).not.toHaveBeenCalledWith(expect.stringContaining('git stash'));
    });

    it('handles existing branch with same name', async () => {
      const { CheckpointManager } = await import('./checkpoint-manager.js');

      const execMock = vi.fn()
        .mockResolvedValueOnce({ stdout: 'main\n' }) // git branch --show-current
        .mockResolvedValueOnce({ stdout: '' }) // git status
        .mockRejectedValueOnce(new Error('branch already exists')) // first checkout -b fails
        .mockResolvedValueOnce({ stdout: '' }) // second checkout -b with suffix
        .mockResolvedValueOnce({ stdout: 'abc123' }); // git rev-parse HEAD

      const readFileMock = vi.fn().mockRejectedValue(new Error('ENOENT'));
      const writeFileMock = vi.fn().mockResolvedValue();

      const manager = new CheckpointManager({
        exec: execMock,
        readFile: readFileMock,
        writeFile: writeFileMock,
      });

      const checkpoint = await manager.create();

      // Should have tried with a different name
      expect(checkpoint.branch).toBeDefined();
    });

    it('reports checkpoint state accurately', async () => {
      const { CheckpointManager } = await import('./checkpoint-manager.js');

      const execMock = vi.fn()
        .mockResolvedValueOnce({ stdout: 'main\n' }) // git branch --show-current
        .mockResolvedValueOnce({ stdout: ' M file.js\n' }) // git status
        .mockResolvedValueOnce({ stdout: '' }) // git stash
        .mockResolvedValueOnce({ stdout: '' }) // git checkout -b
        .mockResolvedValueOnce({ stdout: 'abc123' }); // git rev-parse HEAD

      const readFileMock = vi.fn().mockRejectedValue(new Error('ENOENT'));
      const writeFileMock = vi.fn().mockResolvedValue();

      const manager = new CheckpointManager({
        exec: execMock,
        readFile: readFileMock,
        writeFile: writeFileMock,
      });

      const checkpoint = await manager.create();

      expect(checkpoint).toMatchObject({
        id: expect.any(String),
        branch: expect.stringMatching(/^refactor\//),
        originalBranch: 'main',
        hasStash: true,
        commitHash: 'abc123',
        createdAt: expect.any(Date),
      });
    });
  });

  describe('rollback', () => {
    it('deletes branch and pops stash on rollback', async () => {
      const { CheckpointManager } = await import('./checkpoint-manager.js');

      const execMock = vi.fn()
        .mockResolvedValue({ stdout: '' });

      const manager = new CheckpointManager({ exec: execMock });

      const checkpoint = {
        id: 'test-123',
        branch: 'refactor/12345',
        originalBranch: 'main',
        hasStash: true,
        stashRef: 'stash@{0}',
      };

      await manager.rollback(checkpoint);

      expect(execMock).toHaveBeenCalledWith('git checkout main');
      expect(execMock).toHaveBeenCalledWith('git branch -D refactor/12345');
      expect(execMock).toHaveBeenCalledWith('git stash pop');
    });

    it('skips stash pop if no stash was created', async () => {
      const { CheckpointManager } = await import('./checkpoint-manager.js');

      const execMock = vi.fn()
        .mockResolvedValue({ stdout: '' });

      const manager = new CheckpointManager({ exec: execMock });

      const checkpoint = {
        id: 'test-123',
        branch: 'refactor/12345',
        originalBranch: 'main',
        hasStash: false,
      };

      await manager.rollback(checkpoint);

      expect(execMock).toHaveBeenCalledWith('git checkout main');
      expect(execMock).toHaveBeenCalledWith('git branch -D refactor/12345');
      expect(execMock).not.toHaveBeenCalledWith(expect.stringContaining('git stash pop'));
    });

    it('handles rollback when already on original branch', async () => {
      const { CheckpointManager } = await import('./checkpoint-manager.js');

      const execMock = vi.fn()
        .mockResolvedValueOnce({ stdout: 'main\n' }) // current branch
        .mockResolvedValue({ stdout: '' });

      const manager = new CheckpointManager({ exec: execMock });

      const checkpoint = {
        id: 'test-123',
        branch: 'refactor/12345',
        originalBranch: 'main',
        hasStash: false,
      };

      await manager.rollback(checkpoint);

      // Should still delete the refactor branch
      expect(execMock).toHaveBeenCalledWith('git branch -D refactor/12345');
    });
  });

  describe('commit', () => {
    it('commits checkpoint changes to refactor branch', async () => {
      const { CheckpointManager } = await import('./checkpoint-manager.js');

      const execMock = vi.fn()
        .mockResolvedValue({ stdout: '' });

      const manager = new CheckpointManager({ exec: execMock });

      await manager.commit('Refactored validateEmail function');

      expect(execMock).toHaveBeenCalledWith('git add -A');
      expect(execMock).toHaveBeenCalledWith(
        expect.stringContaining('git commit -m "Refactored validateEmail function"')
      );
    });
  });

  describe('merge', () => {
    it('merges refactor branch back to original', async () => {
      const { CheckpointManager } = await import('./checkpoint-manager.js');

      const execMock = vi.fn()
        .mockResolvedValue({ stdout: '' });

      const manager = new CheckpointManager({ exec: execMock });

      const checkpoint = {
        id: 'test-123',
        branch: 'refactor/12345',
        originalBranch: 'main',
        hasStash: false,
      };

      await manager.merge(checkpoint);

      expect(execMock).toHaveBeenCalledWith('git checkout main');
      expect(execMock).toHaveBeenCalledWith('git merge refactor/12345');
    });

    it('cleans up refactor branch after merge', async () => {
      const { CheckpointManager } = await import('./checkpoint-manager.js');

      const execMock = vi.fn()
        .mockResolvedValue({ stdout: '' });

      const manager = new CheckpointManager({ exec: execMock });

      const checkpoint = {
        id: 'test-123',
        branch: 'refactor/12345',
        originalBranch: 'main',
        hasStash: false,
      };

      await manager.merge(checkpoint, { cleanup: true });

      expect(execMock).toHaveBeenCalledWith('git branch -d refactor/12345');
    });
  });

  describe('state tracking', () => {
    it('saves checkpoint state to file', async () => {
      const { CheckpointManager } = await import('./checkpoint-manager.js');

      const writeFileMock = vi.fn();
      const execMock = vi.fn()
        .mockResolvedValueOnce({ stdout: 'main\n' })
        .mockResolvedValueOnce({ stdout: '' })
        .mockResolvedValueOnce({ stdout: '' })
        .mockResolvedValueOnce({ stdout: 'abc123' });

      const manager = new CheckpointManager({
        exec: execMock,
        writeFile: writeFileMock,
        stateFile: '.tlc/checkpoint.json',
      });

      await manager.create();

      expect(writeFileMock).toHaveBeenCalledWith(
        '.tlc/checkpoint.json',
        expect.any(String)
      );
    });

    it('loads existing checkpoint state', async () => {
      const { CheckpointManager } = await import('./checkpoint-manager.js');

      const readFileMock = vi.fn().mockResolvedValue(JSON.stringify({
        id: 'existing-123',
        branch: 'refactor/99999',
        originalBranch: 'develop',
        hasStash: true,
      }));

      const manager = new CheckpointManager({
        readFile: readFileMock,
        stateFile: '.tlc/checkpoint.json',
      });

      const checkpoint = await manager.load();

      expect(checkpoint.id).toBe('existing-123');
      expect(checkpoint.branch).toBe('refactor/99999');
    });

    it('returns null when no checkpoint exists', async () => {
      const { CheckpointManager } = await import('./checkpoint-manager.js');

      const readFileMock = vi.fn().mockRejectedValue(new Error('ENOENT'));

      const manager = new CheckpointManager({
        readFile: readFileMock,
        stateFile: '.tlc/checkpoint.json',
      });

      const checkpoint = await manager.load();

      expect(checkpoint).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles conflicts during merge', async () => {
      const { CheckpointManager } = await import('./checkpoint-manager.js');

      const execMock = vi.fn()
        .mockResolvedValueOnce({ stdout: '' }) // checkout
        .mockRejectedValueOnce(new Error('CONFLICT')); // merge fails

      const manager = new CheckpointManager({ exec: execMock });

      const checkpoint = {
        id: 'test-123',
        branch: 'refactor/12345',
        originalBranch: 'main',
        hasStash: false,
      };

      await expect(manager.merge(checkpoint)).rejects.toThrow('CONFLICT');
    });

    it('handles detached HEAD state', async () => {
      const { CheckpointManager } = await import('./checkpoint-manager.js');

      const execMock = vi.fn()
        .mockResolvedValueOnce({ stdout: '' }) // git branch --show-current returns empty
        .mockResolvedValueOnce({ stdout: 'abc123' }) // git rev-parse HEAD
        .mockResolvedValueOnce({ stdout: '' }) // git status
        .mockResolvedValueOnce({ stdout: '' }) // git checkout -b
        .mockResolvedValueOnce({ stdout: 'def456' }); // git rev-parse HEAD

      const manager = new CheckpointManager({ exec: execMock });

      const checkpoint = await manager.create();

      // Should store commit hash as "original" for detached HEAD
      expect(checkpoint.originalBranch).toBe('abc123');
      expect(checkpoint.wasDetached).toBe(true);
    });

    it('prevents creating checkpoint when one already exists', async () => {
      const { CheckpointManager } = await import('./checkpoint-manager.js');

      const readFileMock = vi.fn().mockResolvedValue(JSON.stringify({
        id: 'existing-123',
        branch: 'refactor/99999',
      }));

      const manager = new CheckpointManager({
        readFile: readFileMock,
        stateFile: '.tlc/checkpoint.json',
      });

      await expect(manager.create()).rejects.toThrow('Checkpoint already exists');
    });

    it('allows force create to override existing checkpoint', async () => {
      const { CheckpointManager } = await import('./checkpoint-manager.js');

      const readFileMock = vi.fn().mockResolvedValue(JSON.stringify({
        id: 'existing-123',
        branch: 'refactor/99999',
      }));

      const execMock = vi.fn()
        .mockResolvedValue({ stdout: '' });

      const writeFileMock = vi.fn();

      const manager = new CheckpointManager({
        readFile: readFileMock,
        writeFile: writeFileMock,
        exec: execMock,
        stateFile: '.tlc/checkpoint.json',
      });

      const checkpoint = await manager.create({ force: true });

      expect(checkpoint).toBeDefined();
    });
  });

  describe('status', () => {
    it('returns current checkpoint status', async () => {
      const { CheckpointManager } = await import('./checkpoint-manager.js');

      const execMock = vi.fn()
        .mockResolvedValueOnce({ stdout: 'refactor/12345\n' }) // current branch
        .mockResolvedValueOnce({ stdout: ' M file.js\n' }); // status

      const readFileMock = vi.fn().mockResolvedValue(JSON.stringify({
        id: 'test-123',
        branch: 'refactor/12345',
        originalBranch: 'main',
        hasStash: true,
        createdAt: new Date().toISOString(),
      }));

      const manager = new CheckpointManager({
        exec: execMock,
        readFile: readFileMock,
      });

      const status = await manager.status();

      expect(status.active).toBe(true);
      expect(status.branch).toBe('refactor/12345');
      expect(status.hasUncommittedChanges).toBe(true);
    });
  });
});
