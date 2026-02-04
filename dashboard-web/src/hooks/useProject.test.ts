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
      const projectData = { name: 'TLC', phase: 62, phaseName: 'Dashboard' };
      vi.mocked(api.project.getProject).mockResolvedValueOnce(projectData);

      const { result } = renderHook(() => useProject());

      await act(async () => {
        await result.current.fetchProject();
      });

      expect(result.current.project).toEqual(projectData);
    });

    it('sets loading state during fetch', async () => {
      let resolvePromise: (value: { name: string }) => void;
      vi.mocked(api.project.getProject).mockImplementation(
        () => new Promise((resolve) => { resolvePromise = resolve; })
      );

      const { result } = renderHook(() => useProject());

      act(() => {
        result.current.fetchProject();
      });

      // Check loading is true while waiting
      expect(result.current.loading).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolvePromise!({ name: 'TLC' });
      });

      expect(result.current.loading).toBe(false);
    });

    it('handles fetch errors', async () => {
      vi.mocked(api.project.getProject).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useProject());

      await act(async () => {
        await result.current.fetchProject();
      });

      expect(result.current.error).toBe('Network error');
    });
  });

  describe('fetchStatus', () => {
    it('fetches and stores status data', async () => {
      const statusData = { testsPass: 637, testsFail: 0, coverage: 85 };
      vi.mocked(api.project.getStatus).mockResolvedValueOnce(statusData);

      const { result } = renderHook(() => useProject());

      await act(async () => {
        await result.current.fetchStatus();
      });

      expect(result.current.status).toEqual(statusData);
    });
  });

  describe('refresh', () => {
    it('fetches both project and status', async () => {
      vi.mocked(api.project.getProject).mockResolvedValueOnce({ name: 'TLC' });
      vi.mocked(api.project.getStatus).mockResolvedValueOnce({ testsPass: 100 });

      const { result } = renderHook(() => useProject());

      await act(async () => {
        await result.current.refresh();
      });

      expect(api.project.getProject).toHaveBeenCalled();
      expect(api.project.getStatus).toHaveBeenCalled();
    });
  });
});
