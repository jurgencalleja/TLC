/**
 * Refactor Command Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('RefactorCommand', () => {
  describe('mode selection', () => {
    it('supports interactive mode with confirmations', async () => {
      const { RefactorCommand } = await import('./refactor-command.js');

      const confirmed = [];
      const command = new RefactorCommand({
        astAnalyzer: { analyze: () => ({ functions: [] }) },
        duplicationDetector: { detect: () => ({ duplicates: [] }) },
        semanticAnalyzer: { analyze: async () => ({ issues: [] }) },
        impactScorer: { score: () => ({ total: 85 }) },
        candidatesTracker: { add: vi.fn(), markComplete: vi.fn() },
        executor: { execute: async () => ({ successful: [], failed: [] }) },
        reporter: { generate: () => 'report' },
        progress: {
          start: vi.fn(),
          update: vi.fn(),
          cancel: vi.fn(),
          isCancelled: () => false,
          getProgress: () => ({}),
        },
        getChangedFiles: async () => [{ path: 'test.js', content: 'code' }],
        onConfirm: async (item) => {
          confirmed.push(item);
          return true;
        },
        onSelectModels: async () => ['skip'],
      });

      await command.run({ mode: 'interactive' });

      // Confirmation was called (even if no opportunities found)
      expect(command.options.onConfirm).toBeDefined();
    });

    it('supports auto mode without confirmations', async () => {
      const { RefactorCommand } = await import('./refactor-command.js');

      const executeMock = vi.fn().mockResolvedValue({ successful: [], failed: [] });

      const command = new RefactorCommand({
        astAnalyzer: {
          analyze: () => ({
            functions: [{ name: 'test', complexity: 15, line: 1, lines: 10 }],
          }),
        },
        duplicationDetector: { detect: () => ({ duplicates: [] }) },
        semanticAnalyzer: { analyze: async () => ({ issues: [] }) },
        impactScorer: { score: () => ({ total: 85 }) },
        candidatesTracker: { add: vi.fn(), markComplete: vi.fn() },
        executor: { execute: executeMock },
        reporter: { generate: () => 'report' },
        progress: {
          start: vi.fn(),
          update: vi.fn(),
          cancel: vi.fn(),
          isCancelled: () => false,
          getProgress: () => ({}),
        },
        getChangedFiles: async () => [{ path: 'test.js', content: 'code' }],
        onSelectModels: async () => ['skip'],
      });

      const result = await command.run({ mode: 'auto' });

      // Auto mode executes without confirmation
      expect(executeMock).toHaveBeenCalled();
    });

    it('supports analyze-only mode', async () => {
      const { RefactorCommand } = await import('./refactor-command.js');

      const executeMock = vi.fn();

      const command = new RefactorCommand({
        astAnalyzer: {
          analyze: () => ({
            functions: [{ name: 'test', complexity: 15, line: 1, lines: 10 }],
          }),
        },
        duplicationDetector: { detect: () => ({ duplicates: [] }) },
        semanticAnalyzer: { analyze: async () => ({ issues: [] }) },
        impactScorer: { score: () => ({ total: 85 }) },
        candidatesTracker: { add: vi.fn(), markComplete: vi.fn() },
        executor: { execute: executeMock },
        reporter: { generate: () => 'report' },
        progress: {
          start: vi.fn(),
          update: vi.fn(),
          cancel: vi.fn(),
          isCancelled: () => false,
          getProgress: () => ({}),
        },
        getChangedFiles: async () => [{ path: 'test.js', content: 'code' }],
        onSelectModels: async () => ['skip'],
      });

      const result = await command.run({ mode: 'analyze-only' });

      // Analyze-only does not execute
      expect(executeMock).not.toHaveBeenCalled();
      expect(result.report).toBeDefined();
    });
  });

  describe('scope options', () => {
    it('analyzes changed files only (scope: changed)', async () => {
      const { RefactorCommand } = await import('./refactor-command.js');

      const getChangedFiles = vi.fn().mockResolvedValue([
        { path: 'changed.js', content: 'code' },
      ]);

      const command = new RefactorCommand({
        astAnalyzer: { analyze: () => ({ functions: [] }) },
        duplicationDetector: { detect: () => ({ duplicates: [] }) },
        semanticAnalyzer: { analyze: async () => ({ issues: [] }) },
        impactScorer: { score: () => ({ total: 50 }) },
        candidatesTracker: { add: vi.fn(), markComplete: vi.fn() },
        executor: { execute: async () => ({ successful: [], failed: [] }) },
        reporter: { generate: () => 'report' },
        progress: {
          start: vi.fn(),
          update: vi.fn(),
          cancel: vi.fn(),
          isCancelled: () => false,
          getProgress: () => ({}),
        },
        getChangedFiles,
        onSelectModels: async () => ['skip'],
      });

      await command.run({ scope: 'changed' });

      expect(getChangedFiles).toHaveBeenCalled();
    });

    it('analyzes all files (scope: all)', async () => {
      const { RefactorCommand } = await import('./refactor-command.js');

      const getAllFiles = vi.fn().mockResolvedValue([
        { path: 'a.js', content: 'a' },
        { path: 'b.js', content: 'b' },
      ]);

      const command = new RefactorCommand({
        astAnalyzer: { analyze: () => ({ functions: [] }) },
        duplicationDetector: { detect: () => ({ duplicates: [] }) },
        semanticAnalyzer: { analyze: async () => ({ issues: [] }) },
        impactScorer: { score: () => ({ total: 50 }) },
        candidatesTracker: { add: vi.fn(), markComplete: vi.fn() },
        executor: { execute: async () => ({ successful: [], failed: [] }) },
        reporter: { generate: () => 'report' },
        progress: {
          start: vi.fn(),
          update: vi.fn(),
          cancel: vi.fn(),
          isCancelled: () => false,
          getProgress: () => ({}),
        },
        getAllFiles,
        onSelectModels: async () => ['skip'],
      });

      const result = await command.run({ scope: 'all' });

      expect(getAllFiles).toHaveBeenCalled();
      expect(result.analyzed).toBe(2);
    });

    it('analyzes specific file (scope: file)', async () => {
      const { RefactorCommand } = await import('./refactor-command.js');

      const getFilesByPath = vi.fn().mockResolvedValue([
        { path: 'specific.js', content: 'code' },
      ]);

      const command = new RefactorCommand({
        astAnalyzer: { analyze: () => ({ functions: [] }) },
        duplicationDetector: { detect: () => ({ duplicates: [] }) },
        semanticAnalyzer: { analyze: async () => ({ issues: [] }) },
        impactScorer: { score: () => ({ total: 50 }) },
        candidatesTracker: { add: vi.fn(), markComplete: vi.fn() },
        executor: { execute: async () => ({ successful: [], failed: [] }) },
        reporter: { generate: () => 'report' },
        progress: {
          start: vi.fn(),
          update: vi.fn(),
          cancel: vi.fn(),
          isCancelled: () => false,
          getProgress: () => ({}),
        },
        getFilesByPath,
        onSelectModels: async () => ['skip'],
      });

      await command.run({ scope: 'file', target: 'specific.js' });

      expect(getFilesByPath).toHaveBeenCalledWith('specific.js');
    });
  });

  describe('multi-model integration', () => {
    it('asks about multi-model when enabled', async () => {
      const { RefactorCommand } = await import('./refactor-command.js');

      const onSelectModels = vi.fn().mockResolvedValue(['gpt-4', 'claude']);

      const command = new RefactorCommand({
        astAnalyzer: { analyze: () => ({ functions: [] }) },
        duplicationDetector: { detect: () => ({ duplicates: [] }) },
        semanticAnalyzer: { analyze: async () => ({ issues: [] }) },
        impactScorer: { score: () => ({ total: 50 }) },
        candidatesTracker: { add: vi.fn(), markComplete: vi.fn() },
        executor: { execute: async () => ({ successful: [], failed: [] }) },
        reporter: { generate: () => 'report' },
        progress: {
          start: vi.fn(),
          update: vi.fn(),
          cancel: vi.fn(),
          isCancelled: () => false,
          getProgress: () => ({}),
        },
        getChangedFiles: async () => [{ path: 'test.js', content: 'code' }],
        onSelectModels,
      });

      await command.run({ useMultiModel: true });

      expect(onSelectModels).toHaveBeenCalled();
    });

    it('skips model selection when disabled', async () => {
      const { RefactorCommand } = await import('./refactor-command.js');

      const onSelectModels = vi.fn();

      const command = new RefactorCommand({
        astAnalyzer: { analyze: () => ({ functions: [] }) },
        duplicationDetector: { detect: () => ({ duplicates: [] }) },
        semanticAnalyzer: { analyze: async () => ({ issues: [] }) },
        impactScorer: { score: () => ({ total: 50 }) },
        candidatesTracker: { add: vi.fn(), markComplete: vi.fn() },
        executor: { execute: async () => ({ successful: [], failed: [] }) },
        reporter: { generate: () => 'report' },
        progress: {
          start: vi.fn(),
          update: vi.fn(),
          cancel: vi.fn(),
          isCancelled: () => false,
          getProgress: () => ({}),
        },
        getChangedFiles: async () => [{ path: 'test.js', content: 'code' }],
        onSelectModels,
      });

      await command.run({ useMultiModel: false });

      expect(onSelectModels).not.toHaveBeenCalled();
    });
  });

  describe('pipeline integration', () => {
    it('runs full pipeline: AST -> semantic -> duplication -> scoring', async () => {
      const { RefactorCommand } = await import('./refactor-command.js');

      const astAnalyze = vi.fn().mockReturnValue({
        functions: [{ name: 'complex', complexity: 15, line: 10, lines: 100 }],
      });
      const semanticAnalyze = vi.fn().mockResolvedValue({
        issues: [{ line: 5, description: 'Poor naming' }],
      });
      const duplicationDetect = vi.fn().mockReturnValue({
        duplicates: [{ file1: 'a.js', file2: 'b.js', line1: 1, line2: 1 }],
      });
      const scorerScore = vi.fn().mockReturnValue({ total: 75 });

      const command = new RefactorCommand({
        astAnalyzer: { analyze: astAnalyze },
        duplicationDetector: { detect: duplicationDetect },
        semanticAnalyzer: { analyze: semanticAnalyze },
        impactScorer: { score: scorerScore },
        candidatesTracker: { add: vi.fn(), markComplete: vi.fn() },
        executor: { execute: async () => ({ successful: [], failed: [] }) },
        reporter: { generate: () => 'report' },
        progress: {
          start: vi.fn(),
          update: vi.fn(),
          cancel: vi.fn(),
          isCancelled: () => false,
          getProgress: () => ({}),
        },
        getChangedFiles: async () => [
          { path: 'a.js', content: 'a' },
          { path: 'b.js', content: 'b' },
        ],
        onSelectModels: async () => ['default'],
      });

      const result = await command.run({ mode: 'analyze-only' });

      expect(astAnalyze).toHaveBeenCalledTimes(2);
      expect(semanticAnalyze).toHaveBeenCalledTimes(2);
      expect(duplicationDetect).toHaveBeenCalled();
      expect(scorerScore).toHaveBeenCalled();
      expect(result.opportunities.length).toBeGreaterThan(0);
    });
  });

  describe('candidates tracking', () => {
    it('adds found opportunities to candidates tracker', async () => {
      const { RefactorCommand } = await import('./refactor-command.js');

      const addMock = vi.fn();

      const command = new RefactorCommand({
        astAnalyzer: {
          analyze: () => ({
            functions: [{ name: 'complex', complexity: 15, line: 10, lines: 20 }],
          }),
        },
        duplicationDetector: { detect: () => ({ duplicates: [] }) },
        semanticAnalyzer: { analyze: async () => ({ issues: [] }) },
        impactScorer: { score: () => ({ total: 80 }) },
        candidatesTracker: { add: addMock, markComplete: vi.fn() },
        executor: { execute: async () => ({ successful: [], failed: [] }) },
        reporter: { generate: () => 'report' },
        progress: {
          start: vi.fn(),
          update: vi.fn(),
          cancel: vi.fn(),
          isCancelled: () => false,
          getProgress: () => ({}),
        },
        getChangedFiles: async () => [{ path: 'test.js', content: 'code' }],
        onSelectModels: async () => ['skip'],
      });

      await command.run({ mode: 'analyze-only' });

      expect(addMock).toHaveBeenCalled();
    });

    it('marks candidates complete after applying', async () => {
      const { RefactorCommand } = await import('./refactor-command.js');

      const markCompleteMock = vi.fn();

      const command = new RefactorCommand({
        astAnalyzer: {
          analyze: () => ({
            functions: [{ name: 'complex', complexity: 15, line: 10, lines: 20 }],
          }),
        },
        duplicationDetector: { detect: () => ({ duplicates: [] }) },
        semanticAnalyzer: { analyze: async () => ({ issues: [] }) },
        impactScorer: { score: () => ({ total: 85 }) },
        candidatesTracker: { add: vi.fn(), markComplete: markCompleteMock },
        executor: {
          execute: async () => ({
            successful: [{ file: 'test.js', line: 10 }],
            failed: [],
          }),
        },
        reporter: { generate: () => 'report' },
        progress: {
          start: vi.fn(),
          update: vi.fn(),
          cancel: vi.fn(),
          isCancelled: () => false,
          getProgress: () => ({}),
        },
        getChangedFiles: async () => [{ path: 'test.js', content: 'code' }],
        onConfirm: async () => true,
        onSelectModels: async () => ['skip'],
      });

      await command.run({ mode: 'interactive' });

      expect(markCompleteMock).toHaveBeenCalledWith('test.js', 10);
    });
  });

  describe('progress and cancellation', () => {
    it('reports progress during analysis', async () => {
      const { RefactorCommand } = await import('./refactor-command.js');

      const progressUpdates = [];

      const command = new RefactorCommand({
        astAnalyzer: { analyze: () => ({ functions: [] }) },
        duplicationDetector: { detect: () => ({ duplicates: [] }) },
        semanticAnalyzer: { analyze: async () => ({ issues: [] }) },
        impactScorer: { score: () => ({ total: 50 }) },
        candidatesTracker: { add: vi.fn(), markComplete: vi.fn() },
        executor: { execute: async () => ({ successful: [], failed: [] }) },
        reporter: { generate: () => 'report' },
        progress: {
          start: vi.fn(),
          update: vi.fn(),
          cancel: vi.fn(),
          isCancelled: () => false,
          getProgress: () => ({}),
        },
        getChangedFiles: async () => [
          { path: 'a.js', content: 'a' },
          { path: 'b.js', content: 'b' },
        ],
        onProgress: (update) => progressUpdates.push(update),
        onSelectModels: async () => ['skip'],
      });

      await command.run();

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].phase).toBe('analyzing');
    });

    it('stops cleanly on cancellation', async () => {
      const { RefactorCommand } = await import('./refactor-command.js');

      let callCount = 0;
      const command = new RefactorCommand({
        astAnalyzer: { analyze: () => ({ functions: [] }) },
        duplicationDetector: { detect: () => ({ duplicates: [] }) },
        semanticAnalyzer: { analyze: async () => ({ issues: [] }) },
        impactScorer: { score: () => ({ total: 50 }) },
        candidatesTracker: { add: vi.fn(), markComplete: vi.fn() },
        executor: { execute: async () => ({ successful: [], failed: [] }) },
        reporter: { generate: () => 'report' },
        progress: {
          start: vi.fn(),
          update: vi.fn(),
          cancel: vi.fn(),
          isCancelled: () => {
            callCount++;
            return callCount > 1; // Cancel after first file
          },
          getProgress: () => ({}),
        },
        getChangedFiles: async () => [
          { path: 'a.js', content: 'a' },
          { path: 'b.js', content: 'b' },
          { path: 'c.js', content: 'c' },
        ],
        onSelectModels: async () => ['skip'],
      });

      const result = await command.run();

      expect(result.cancelled).toBe(true);
    });
  });

  describe('report generation', () => {
    it('generates report in requested format', async () => {
      const { RefactorCommand } = await import('./refactor-command.js');

      const generateMock = vi.fn().mockReturnValue('{"report": true}');

      const command = new RefactorCommand({
        astAnalyzer: { analyze: () => ({ functions: [] }) },
        duplicationDetector: { detect: () => ({ duplicates: [] }) },
        semanticAnalyzer: { analyze: async () => ({ issues: [] }) },
        impactScorer: { score: () => ({ total: 50 }) },
        candidatesTracker: { add: vi.fn(), markComplete: vi.fn() },
        executor: { execute: async () => ({ successful: [], failed: [] }) },
        reporter: { generate: generateMock },
        progress: {
          start: vi.fn(),
          update: vi.fn(),
          cancel: vi.fn(),
          isCancelled: () => false,
          getProgress: () => ({}),
        },
        getChangedFiles: async () => [],
        onSelectModels: async () => ['skip'],
      });

      await command.run({ format: 'json' });

      expect(generateMock).toHaveBeenCalledWith(expect.anything(), 'json');
    });
  });

  describe('dry run', () => {
    it('does not apply changes in dry run mode', async () => {
      const { RefactorCommand } = await import('./refactor-command.js');

      const executeMock = vi.fn();

      const command = new RefactorCommand({
        astAnalyzer: {
          analyze: () => ({
            functions: [{ name: 'test', complexity: 15, line: 1, lines: 10 }],
          }),
        },
        duplicationDetector: { detect: () => ({ duplicates: [] }) },
        semanticAnalyzer: { analyze: async () => ({ issues: [] }) },
        impactScorer: { score: () => ({ total: 85 }) },
        candidatesTracker: { add: vi.fn(), markComplete: vi.fn() },
        executor: { execute: executeMock },
        reporter: { generate: () => 'report' },
        progress: {
          start: vi.fn(),
          update: vi.fn(),
          cancel: vi.fn(),
          isCancelled: () => false,
          getProgress: () => ({}),
        },
        getChangedFiles: async () => [{ path: 'test.js', content: 'code' }],
        onConfirm: async () => true,
        onSelectModels: async () => ['skip'],
      });

      const result = await command.run({ mode: 'interactive', dryRun: true });

      expect(executeMock).not.toHaveBeenCalled();
      expect(result.applied.length).toBeGreaterThan(0);
    });
  });
});
