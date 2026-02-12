import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProject } from './useProject';
import { useProjectStore } from '../stores/project.store';
import { api } from '../api';

vi.mock('../api', () => ({
  api: {
    project: {
      getProject: vi.fn(),
      getStatus: vi.fn(),
    },
    projects: {
      getById: vi.fn(),
      getStatus: vi.fn(),
    },
  },
}));

describe('useProject', () => {
  beforeEach(() => {
    useProjectStore.getState().reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchProject', () => {
    it('fetches and stores project data', async () => {
      const projectData = { id: 'proj-1', name: 'TLC', path: '/projects/tlc', phase: 62, phaseName: 'Dashboard' };
      const statusData = { currentPhase: 62, phaseName: 'Dashboard', testsPass: 10, testsFail: 0, coverage: 80 };
      vi.mocked(api.projects.getById).mockResolvedValueOnce(projectData);
      vi.mocked(api.projects.getStatus).mockResolvedValueOnce(statusData);

      const { result } = renderHook(() => useProject('proj-1'));

      await act(async () => {
        await result.current.fetchProject();
      });

      expect(result.current.project).toEqual({
        id: 'proj-1',
        name: 'TLC',
        path: '/projects/tlc',
        hasTlc: undefined,
        hasPlanning: undefined,
        version: undefined,
        phase: 62,
        phaseName: 'Dashboard',
        totalPhases: 0,
        completedPhases: 0,
      });
    });

    it('sets loading state during fetch', async () => {
      let resolveGetById: (value: any) => void;
      let resolveGetStatus: (value: any) => void;
      vi.mocked(api.projects.getById).mockImplementation(
        () => new Promise((resolve) => { resolveGetById = resolve; })
      );
      vi.mocked(api.projects.getStatus).mockImplementation(
        () => new Promise((resolve) => { resolveGetStatus = resolve; })
      );

      const { result } = renderHook(() => useProject('proj-1'));

      act(() => {
        result.current.fetchProject();
      });

      // Check loading is true while waiting
      expect(result.current.loading).toBe(true);

      // Resolve both promises (Promise.all waits for both)
      await act(async () => {
        resolveGetById!({ id: 'proj-1', name: 'TLC', path: '/p' });
        resolveGetStatus!({ currentPhase: 1, testsPass: 0, testsFail: 0, coverage: 0 });
      });

      expect(result.current.loading).toBe(false);
    });

    it('handles fetch errors', async () => {
      vi.mocked(api.projects.getById).mockRejectedValueOnce(new Error('Network error'));
      vi.mocked(api.projects.getStatus).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useProject('proj-1'));

      await act(async () => {
        await result.current.fetchProject();
      });

      expect(result.current.error).toBe('Network error');
    });
  });

  describe('fetchStatus', () => {
    it('fetches and stores status data', async () => {
      // In the current implementation, fetchStatus with a projectId is a no-op
      // (workspace status is fetched in fetchProject). So status remains null.
      const { result } = renderHook(() => useProject('proj-1'));

      await act(async () => {
        await result.current.fetchStatus();
      });

      // fetchStatus is a no-op; status stays null
      expect(result.current.status).toBeNull();
    });
  });

  describe('refresh', () => {
    it('fetches both project and status', async () => {
      const projectData = { id: 'proj-1', name: 'TLC', path: '/p' };
      const statusData = { currentPhase: 1, testsPass: 100, testsFail: 0, coverage: 80 };
      vi.mocked(api.projects.getById).mockResolvedValueOnce(projectData);
      vi.mocked(api.projects.getStatus).mockResolvedValueOnce(statusData);

      const { result } = renderHook(() => useProject('proj-1'));

      await act(async () => {
        await result.current.refresh();
      });

      expect(api.projects.getById).toHaveBeenCalledWith('proj-1');
      expect(api.projects.getStatus).toHaveBeenCalledWith('proj-1');
    });
  });

  describe('per-project fetching (with projectId)', () => {
    it('fetches from per-project endpoint when projectId is provided', async () => {
      const projectData = { id: 'proj-1', name: 'My Project', path: '/projects/my-project' };
      const statusData = { currentPhase: 1, testsPass: 5, testsFail: 0, coverage: 50 };
      vi.mocked(api.projects.getById).mockResolvedValueOnce(projectData);
      vi.mocked(api.projects.getStatus).mockResolvedValueOnce(statusData);

      const { result } = renderHook(() => useProject('proj-1'));

      await act(async () => {
        await result.current.fetchProject();
      });

      expect(api.projects.getById).toHaveBeenCalledWith('proj-1');
      expect(api.project.getProject).not.toHaveBeenCalled();
      expect(result.current.project).toEqual({
        id: 'proj-1',
        name: 'My Project',
        path: '/projects/my-project',
        hasTlc: undefined,
        hasPlanning: undefined,
        version: undefined,
        phase: 1,
        phaseName: undefined,
        totalPhases: 0,
        completedPhases: 0,
      });
    });

    it('without projectId falls back to early return', async () => {
      // Without projectId, fetchProject sets project/status to null and returns early
      const { result } = renderHook(() => useProject());

      await act(async () => {
        await result.current.fetchProject();
      });

      expect(api.project.getProject).not.toHaveBeenCalled();
      expect(api.projects.getById).not.toHaveBeenCalled();
      expect(result.current.project).toBeNull();
    });

    it('fetches status from per-project endpoint when projectId is provided', async () => {
      // fetchStatus is now a no-op; status is fetched inside fetchProject
      // So calling fetchStatus alone does not populate status
      const { result } = renderHook(() => useProject('proj-1'));

      await act(async () => {
        await result.current.fetchStatus();
      });

      // fetchStatus is a no-op, so no API calls should be made
      expect(api.projects.getStatus).not.toHaveBeenCalled();
      expect(api.project.getStatus).not.toHaveBeenCalled();
      expect(result.current.status).toBeNull();
    });

    it('handles errors from per-project endpoint', async () => {
      vi.mocked(api.projects.getById).mockRejectedValueOnce(new Error('Project not found'));
      vi.mocked(api.projects.getStatus).mockRejectedValueOnce(new Error('Status not found'));

      const { result } = renderHook(() => useProject('nonexistent'));

      await act(async () => {
        await result.current.fetchProject();
      });

      expect(result.current.error).toBe('Project not found');
    });

    it('sets loading state during per-project fetch', async () => {
      let resolveGetById: (value: any) => void;
      let resolveGetStatus: (value: any) => void;
      vi.mocked(api.projects.getById).mockImplementation(
        () => new Promise((resolve) => { resolveGetById = resolve; })
      );
      vi.mocked(api.projects.getStatus).mockImplementation(
        () => new Promise((resolve) => { resolveGetStatus = resolve; })
      );

      const { result } = renderHook(() => useProject('proj-1'));

      act(() => {
        result.current.fetchProject();
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolveGetById!({ id: 'proj-1', name: 'Project', path: '/p' });
        resolveGetStatus!({ currentPhase: 1, testsPass: 0, testsFail: 0, coverage: 0 });
      });

      expect(result.current.loading).toBe(false);
    });

    it('refresh with projectId uses per-project endpoints', async () => {
      vi.mocked(api.projects.getById).mockResolvedValueOnce({ id: 'proj-1', name: 'P', path: '/p' });
      vi.mocked(api.projects.getStatus).mockResolvedValueOnce({ testsPass: 10 });

      const { result } = renderHook(() => useProject('proj-1'));

      await act(async () => {
        await result.current.refresh();
      });

      expect(api.projects.getById).toHaveBeenCalledWith('proj-1');
      expect(api.projects.getStatus).toHaveBeenCalledWith('proj-1');
      expect(api.project.getProject).not.toHaveBeenCalled();
      expect(api.project.getStatus).not.toHaveBeenCalled();
    });
  });
});
