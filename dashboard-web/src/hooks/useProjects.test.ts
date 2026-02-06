/**
 * useProjects Hook Tests
 * TDD: Tests written first to define expected behavior
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProjects } from './useProjects';
import { useProjectStore } from '../stores/project.store';
import { api } from '../api';

vi.mock('../api', () => ({
  api: {
    project: {
      getProject: vi.fn(),
      getStatus: vi.fn().mockResolvedValue({ testsPass: 0, testsFail: 0, coverage: 0 }),
    },
  },
}));

describe('useProjects', () => {
  beforeEach(() => {
    useProjectStore.getState().reset();
    vi.clearAllMocks();
    vi.mocked(api.project.getStatus).mockResolvedValue({ testsPass: 0, testsFail: 0, coverage: 0 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('returns initial empty state', () => {
      const { result } = renderHook(() => useProjects());

      expect(result.current.projects).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  describe('fetchProjects', () => {
    it('fetches and stores project data as a list', async () => {
      const projectData = {
        name: 'TLC Dashboard',
        description: 'Revolutionary TLC Dashboard v2.0',
        phase: 62,
        phaseName: 'Dashboard',
        branch: 'main',
      };
      vi.mocked(api.project.getProject).mockResolvedValueOnce(projectData);

      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.fetchProjects();
      });

      expect(result.current.projects).toHaveLength(1);
      expect(result.current.projects[0].name).toBe('TLC Dashboard');
    });

    it('sets loading state during fetch', async () => {
      let resolveProject: (value: { name: string }) => void;
      let resolveStatus: (value: unknown) => void;
      vi.mocked(api.project.getProject).mockImplementation(
        () => new Promise((resolve) => { resolveProject = resolve; })
      );
      vi.mocked(api.project.getStatus).mockImplementation(
        () => new Promise((resolve) => { resolveStatus = resolve; })
      );

      const { result } = renderHook(() => useProjects());

      act(() => {
        result.current.fetchProjects();
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolveProject!({ name: 'TLC' });
        resolveStatus!({ testsPass: 0, testsFail: 0, coverage: 0 });
      });

      expect(result.current.loading).toBe(false);
    });

    it('handles fetch errors', async () => {
      vi.mocked(api.project.getProject).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.fetchProjects();
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.projects).toEqual([]);
    });

    it('clears previous error on successful fetch', async () => {
      vi.mocked(api.project.getProject).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.fetchProjects();
      });

      expect(result.current.error).toBe('Network error');

      vi.mocked(api.project.getProject).mockResolvedValueOnce({ name: 'TLC' });

      await act(async () => {
        await result.current.fetchProjects();
      });

      expect(result.current.error).toBe(null);
      expect(result.current.projects).toHaveLength(1);
    });
  });

  describe('project transformation', () => {
    it('transforms ProjectInfo to Project format with defaults', async () => {
      const projectData = {
        name: 'TLC Dashboard',
        description: 'A great project',
        phase: 5,
        phaseName: 'Testing',
        branch: 'feature-branch',
      };
      vi.mocked(api.project.getProject).mockResolvedValueOnce(projectData);

      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.fetchProjects();
      });

      const project = result.current.projects[0];
      expect(project.id).toBeDefined();
      expect(project.name).toBe('TLC Dashboard');
      expect(project.description).toBe('A great project');
      expect(project.branch).toBe('feature-branch');
      expect(project.status).toBe('healthy');
      expect(project.tests).toEqual({ passed: 0, failed: 0, total: 0 });
      expect(project.coverage).toBe(0);
      expect(project.lastActivity).toBeDefined();
    });

    it('handles project without optional fields', async () => {
      const projectData = {
        name: 'Minimal Project',
      };
      vi.mocked(api.project.getProject).mockResolvedValueOnce(projectData);

      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.fetchProjects();
      });

      const project = result.current.projects[0];
      expect(project.name).toBe('Minimal Project');
      expect(project.description).toBeUndefined();
      expect(project.branch).toBe('main');
    });
  });

  describe('refresh', () => {
    it('provides a refresh function', async () => {
      vi.mocked(api.project.getProject).mockResolvedValue({ name: 'TLC' });

      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.refresh();
      });

      expect(api.project.getProject).toHaveBeenCalled();
      expect(result.current.projects).toHaveLength(1);
    });
  });
});
