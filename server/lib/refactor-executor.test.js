/**
 * Refactor Executor Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('RefactorExecutor', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('extract refactoring', () => {
    it('applies extract function refactoring', async () => {
      const { RefactorExecutor } = await import('./refactor-executor.js');

      const writeFileMock = vi.fn().mockResolvedValue();
      const readFileMock = vi.fn().mockResolvedValue(`
function main() {
  const x = validateEmail(email);
  return x;
}

function validateEmail(email) {
  if (!email) return false;
  return email.includes('@');
}
`);
      const execMock = vi.fn().mockResolvedValue('');
      const checkpointManager = {
        create: vi.fn().mockResolvedValue({ id: 'test' }),
        rollback: vi.fn().mockResolvedValue(),
      };

      const executor = new RefactorExecutor({
        checkpointManager,
        writeFile: writeFileMock,
        readFile: readFileMock,
        exec: execMock,
        interactive: false,
      });

      const result = await executor.execute([{
        type: 'extract',
        source: 'src/main.js',
        name: 'validateEmail',
        startLine: 6,
        endLine: 9,
        newFile: 'src/validators.js',
      }]);

      expect(writeFileMock).toHaveBeenCalled();
      expect(result.applied).toHaveLength(1);
    });
  });

  describe('rename refactoring', () => {
    it('applies rename refactoring across files', async () => {
      const { RefactorExecutor } = await import('./refactor-executor.js');

      const writeFileMock = vi.fn().mockResolvedValue();
      const readFileMock = vi.fn().mockResolvedValue('const oldName = 1;');
      const execMock = vi.fn().mockResolvedValue('');
      const checkpointManager = {
        create: vi.fn().mockResolvedValue({ id: 'test' }),
        rollback: vi.fn().mockResolvedValue(),
      };

      const executor = new RefactorExecutor({
        checkpointManager,
        writeFile: writeFileMock,
        readFile: readFileMock,
        exec: execMock,
        interactive: false,
      });

      const result = await executor.execute([{
        type: 'rename',
        oldName: 'oldName',
        newName: 'newName',
        files: ['file1.js', 'file2.js'],
      }]);

      expect(writeFileMock).toHaveBeenCalledTimes(2);
      expect(result.applied).toHaveLength(1);
    });
  });

  describe('interactive mode', () => {
    it('pauses for confirmation in interactive mode', async () => {
      const { RefactorExecutor } = await import('./refactor-executor.js');

      const promptMock = vi.fn().mockResolvedValue('y');
      const writeFileMock = vi.fn().mockResolvedValue();
      const readFileMock = vi.fn().mockResolvedValue('code');
      const execMock = vi.fn().mockResolvedValue('');
      const checkpointManager = {
        create: vi.fn().mockResolvedValue({ id: 'test' }),
        rollback: vi.fn().mockResolvedValue(),
      };

      const executor = new RefactorExecutor({
        checkpointManager,
        writeFile: writeFileMock,
        readFile: readFileMock,
        exec: execMock,
        prompt: promptMock,
        interactive: true,
      });

      await executor.execute([{
        type: 'rename',
        oldName: 'x',
        newName: 'count',
        files: ['file.js'],
      }]);

      expect(promptMock).toHaveBeenCalled();
    });

    it('skips when user says skip', async () => {
      const { RefactorExecutor } = await import('./refactor-executor.js');

      const promptMock = vi.fn().mockResolvedValue('skip');
      const writeFileMock = vi.fn();
      const checkpointManager = {
        create: vi.fn().mockResolvedValue({ id: 'test' }),
        rollback: vi.fn().mockResolvedValue(),
      };

      const executor = new RefactorExecutor({
        checkpointManager,
        writeFile: writeFileMock,
        prompt: promptMock,
        interactive: true,
      });

      const result = await executor.execute([{
        type: 'rename',
        oldName: 'x',
        newName: 'count',
        files: [],
      }]);

      expect(result.skipped).toHaveLength(1);
      expect(result.applied).toHaveLength(0);
    });
  });

  describe('test running', () => {
    it('runs test command after each change', async () => {
      const { RefactorExecutor } = await import('./refactor-executor.js');

      const execMock = vi.fn().mockResolvedValue('');
      const checkpointManager = {
        create: vi.fn().mockResolvedValue({ id: 'test' }),
        rollback: vi.fn().mockResolvedValue(),
      };

      const executor = new RefactorExecutor({
        checkpointManager,
        testCommand: 'npm test',
        exec: execMock,
        interactive: false,
        writeFile: vi.fn().mockResolvedValue(),
        readFile: vi.fn().mockResolvedValue('code'),
      });

      await executor.execute([{
        type: 'rename',
        oldName: 'x',
        newName: 'y',
        files: ['file.js'],
      }]);

      expect(execMock).toHaveBeenCalledWith('npm test');
    });
  });

  describe('autofix attempts', () => {
    it('attempts autofix on failure up to 3 times', async () => {
      const { RefactorExecutor } = await import('./refactor-executor.js');

      let callCount = 0;
      const execMock = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 3) throw new Error('Test failed');
        return '';
      });

      const checkpointManager = {
        create: vi.fn().mockResolvedValue({ id: 'test' }),
        rollback: vi.fn().mockResolvedValue(),
      };

      const executor = new RefactorExecutor({
        checkpointManager,
        exec: execMock,
        maxAutofixAttempts: 3,
        interactive: false,
        writeFile: vi.fn().mockResolvedValue(),
        readFile: vi.fn().mockResolvedValue('code'),
      });

      await executor.execute([{
        type: 'rename',
        oldName: 'x',
        newName: 'y',
        files: ['file.js'],
      }]);

      // 1 initial + 3 autofix attempts = 4 calls
      expect(execMock).toHaveBeenCalledTimes(4);
    });

    it('rolls back after 3 failed attempts', async () => {
      const { RefactorExecutor } = await import('./refactor-executor.js');

      const execMock = vi.fn().mockImplementation(() => {
        throw new Error('Test failed');
      });

      const checkpointManager = {
        create: vi.fn().mockResolvedValue({ id: 'test' }),
        rollback: vi.fn().mockResolvedValue(),
      };

      const executor = new RefactorExecutor({
        checkpointManager,
        exec: execMock,
        maxAutofixAttempts: 3,
        interactive: false,
        writeFile: vi.fn().mockResolvedValue(),
        readFile: vi.fn().mockResolvedValue('code'),
      });

      const result = await executor.execute([{
        type: 'rename',
        oldName: 'x',
        newName: 'y',
        files: ['file.js'],
      }]);

      expect(checkpointManager.rollback).toHaveBeenCalled();
      expect(result.rolledBack).toBe(true);
    });
  });

  describe('change tracking', () => {
    it('tracks all applied changes in log', async () => {
      const { RefactorExecutor } = await import('./refactor-executor.js');

      const execMock = vi.fn().mockResolvedValue('');
      const checkpointManager = {
        create: vi.fn().mockResolvedValue({ id: 'test' }),
        rollback: vi.fn().mockResolvedValue(),
      };

      const executor = new RefactorExecutor({
        checkpointManager,
        exec: execMock,
        interactive: false,
        writeFile: vi.fn().mockResolvedValue(),
        readFile: vi.fn().mockResolvedValue('code'),
      });

      await executor.execute([
        { type: 'rename', oldName: 'a', newName: 'b', files: ['f1.js'] },
        { type: 'rename', oldName: 'c', newName: 'd', files: ['f2.js'] },
      ]);

      const log = executor.getLog();
      expect(log).toHaveLength(2);
      expect(log[0].refactor.oldName).toBe('a');
      expect(log[1].refactor.oldName).toBe('c');
    });
  });

  describe('checkpoint management', () => {
    it('creates checkpoint before starting', async () => {
      const { RefactorExecutor } = await import('./refactor-executor.js');

      const checkpointManager = {
        create: vi.fn().mockResolvedValue({ id: 'test' }),
        rollback: vi.fn().mockResolvedValue(),
      };

      const executor = new RefactorExecutor({
        checkpointManager,
        exec: vi.fn().mockResolvedValue(''),
        interactive: false,
        writeFile: vi.fn().mockResolvedValue(),
        readFile: vi.fn().mockResolvedValue('code'),
      });

      await executor.execute([{
        type: 'rename',
        oldName: 'x',
        newName: 'y',
        files: ['file.js'],
      }]);

      expect(checkpointManager.create).toHaveBeenCalled();
    });
  });
});
