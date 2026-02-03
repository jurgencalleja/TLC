/**
 * Refactor Stepper Tests
 */
import { describe, it, expect, vi } from 'vitest';
import {
  createRefactorSession,
  getNextStep,
  previewStep,
  executeStep,
  skipStep,
  abortSession,
  saveCheckpoint,
  loadCheckpoint,
  resumeFromCheckpoint
} from './refactor-stepper.js';

describe('refactor-stepper', () => {
  describe('createRefactorSession', () => {
    it('creates session from audit results', async () => {
      const auditResults = {
        flatFolders: { issues: [{ folder: 'services', files: ['src/services/user.ts'] }] },
        hardcodedUrls: { issues: [{ file: 'src/api.ts', value: 'http://localhost' }] },
        summary: { totalIssues: 2 }
      };

      const session = await createRefactorSession('/test', auditResults);

      expect(session.id).toBeDefined();
      expect(session.steps.length).toBe(2);
      expect(session.currentStep).toBe(0);
      expect(session.status).toBe('pending');
    });

    it('orders steps by priority', async () => {
      const auditResults = {
        hardcodedUrls: { issues: [{ file: 'a.ts' }] },
        flatFolders: { issues: [{ folder: 'services' }] },
        magicStrings: { issues: [{ file: 'b.ts' }] },
        summary: { totalIssues: 3 }
      };

      const session = await createRefactorSession('/test', auditResults);

      // Config extraction should come before folder migration
      const stepTypes = session.steps.map(s => s.type);
      const configIndex = stepTypes.indexOf('extract-config');
      const migrateIndex = stepTypes.indexOf('migrate-folder');
      expect(configIndex).toBeLessThan(migrateIndex);
    });
  });

  describe('getNextStep', () => {
    it('returns next pending step', () => {
      const session = {
        steps: [
          { id: '1', status: 'completed' },
          { id: '2', status: 'pending' },
          { id: '3', status: 'pending' }
        ],
        currentStep: 1
      };

      const step = getNextStep(session);

      expect(step.id).toBe('2');
    });

    it('returns null when all complete', () => {
      const session = {
        steps: [
          { id: '1', status: 'completed' },
          { id: '2', status: 'completed' }
        ],
        currentStep: 2
      };

      const step = getNextStep(session);

      expect(step).toBeNull();
    });
  });

  describe('previewStep', () => {
    it('shows preview before change', async () => {
      const step = {
        type: 'migrate-folder',
        sourcePath: 'src/services/user.service.ts',
        entity: 'user'
      };
      const mockFs = {
        readFile: vi.fn().mockResolvedValue('export class UserService {}')
      };

      const preview = await previewStep(step, { fs: mockFs });

      expect(preview.before).toContain('src/services/');
      expect(preview.after).toContain('src/user/');
      expect(preview.changes).toBeDefined();
    });

    it('shows diff for code changes', async () => {
      const step = {
        type: 'extract-config',
        file: 'src/api.ts',
        value: 'http://localhost:3000'
      };
      const mockFs = {
        readFile: vi.fn().mockResolvedValue("fetch('http://localhost:3000')")
      };

      const preview = await previewStep(step, { fs: mockFs });

      expect(preview.diff).toBeDefined();
      expect(preview.diff).toContain('-');
      expect(preview.diff).toContain('+');
    });
  });

  describe('executeStep', () => {
    it('executes step and marks complete', async () => {
      const session = {
        steps: [{ id: '1', type: 'extract-config', status: 'pending' }],
        currentStep: 0,
        projectPath: '/test'
      };
      const mockExecutor = vi.fn().mockResolvedValue({ success: true });

      const result = await executeStep(session, { executor: mockExecutor });

      expect(result.session.steps[0].status).toBe('completed');
      expect(result.session.currentStep).toBe(1);
    });

    it('handles execution errors', async () => {
      const session = {
        steps: [{ id: '1', type: 'migrate-folder', status: 'pending' }],
        currentStep: 0,
        projectPath: '/test'
      };
      const mockExecutor = vi.fn().mockRejectedValue(new Error('Permission denied'));

      const result = await executeStep(session, { executor: mockExecutor });

      expect(result.session.steps[0].status).toBe('failed');
      expect(result.error).toBeDefined();
    });
  });

  describe('skipStep', () => {
    it('skips step on user request', () => {
      const session = {
        steps: [{ id: '1', status: 'pending' }],
        currentStep: 0
      };

      const result = skipStep(session);

      expect(result.steps[0].status).toBe('skipped');
      expect(result.currentStep).toBe(1);
    });

    it('records skip reason', () => {
      const session = {
        steps: [{ id: '1', status: 'pending' }],
        currentStep: 0
      };

      const result = skipStep(session, 'Not applicable to this project');

      expect(result.steps[0].skipReason).toBe('Not applicable to this project');
    });
  });

  describe('abortSession', () => {
    it('aborts cleanly', () => {
      const session = {
        steps: [
          { id: '1', status: 'completed' },
          { id: '2', status: 'pending' }
        ],
        currentStep: 1,
        status: 'in-progress'
      };

      const result = abortSession(session);

      expect(result.status).toBe('aborted');
      expect(result.steps[0].status).toBe('completed'); // Completed steps preserved
      expect(result.steps[1].status).toBe('aborted');
    });

    it('records abort reason', () => {
      const session = {
        steps: [{ id: '1', status: 'pending' }],
        currentStep: 0,
        status: 'in-progress'
      };

      const result = abortSession(session, 'User requested abort');

      expect(result.abortReason).toBe('User requested abort');
    });
  });

  describe('saveCheckpoint', () => {
    it('saves checkpoint to file', async () => {
      const session = {
        id: 'session-123',
        steps: [{ id: '1', status: 'completed' }],
        currentStep: 1
      };
      const mockFs = {
        writeFile: vi.fn().mockResolvedValue(undefined),
        mkdir: vi.fn().mockResolvedValue(undefined)
      };

      await saveCheckpoint(session, '/test', { fs: mockFs });

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.planning/refactor-checkpoint'),
        expect.any(String)
      );
    });

    it('includes timestamp', async () => {
      const session = { id: 'test', steps: [], currentStep: 0 };
      const mockFs = {
        writeFile: vi.fn().mockResolvedValue(undefined),
        mkdir: vi.fn().mockResolvedValue(undefined)
      };

      await saveCheckpoint(session, '/test', { fs: mockFs });

      const savedData = JSON.parse(mockFs.writeFile.mock.calls[0][1]);
      expect(savedData.savedAt).toBeDefined();
    });
  });

  describe('loadCheckpoint', () => {
    it('loads existing checkpoint', async () => {
      const checkpointData = {
        id: 'session-123',
        steps: [{ id: '1', status: 'completed' }],
        currentStep: 1,
        savedAt: new Date().toISOString()
      };
      const mockFs = {
        readFile: vi.fn().mockResolvedValue(JSON.stringify(checkpointData))
      };

      const session = await loadCheckpoint('/test', { fs: mockFs });

      expect(session.id).toBe('session-123');
      expect(session.steps[0].status).toBe('completed');
    });

    it('returns null if no checkpoint', async () => {
      const mockFs = {
        readFile: vi.fn().mockRejectedValue(new Error('ENOENT'))
      };

      const session = await loadCheckpoint('/test', { fs: mockFs });

      expect(session).toBeNull();
    });
  });

  describe('resumeFromCheckpoint', () => {
    it('resumes from checkpoint', async () => {
      const checkpoint = {
        id: 'session-123',
        steps: [
          { id: '1', status: 'completed' },
          { id: '2', status: 'pending' }
        ],
        currentStep: 1
      };
      const mockFs = {
        readFile: vi.fn().mockResolvedValue(JSON.stringify(checkpoint))
      };

      const session = await resumeFromCheckpoint('/test', { fs: mockFs });

      expect(session.status).toBe('resumed');
      expect(session.currentStep).toBe(1);
    });

    it('validates checkpoint integrity', async () => {
      const corruptedCheckpoint = '{ invalid json }';
      const mockFs = {
        readFile: vi.fn().mockResolvedValue(corruptedCheckpoint)
      };

      await expect(resumeFromCheckpoint('/test', { fs: mockFs }))
        .rejects.toThrow();
    });
  });
});
