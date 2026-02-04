import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useProjectStore } from './project.store';

describe('project.store', () => {
  beforeEach(() => {
    // Reset store state
    const { result } = renderHook(() => useProjectStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('initial state', () => {
    it('has loading false initially', () => {
      const { result } = renderHook(() => useProjectStore());
      expect(result.current.loading).toBe(false);
    });

    it('has project null initially', () => {
      const { result } = renderHook(() => useProjectStore());
      expect(result.current.project).toBeNull();
    });

    it('has error null initially', () => {
      const { result } = renderHook(() => useProjectStore());
      expect(result.current.error).toBeNull();
    });

    it('has status null initially', () => {
      const { result } = renderHook(() => useProjectStore());
      expect(result.current.status).toBeNull();
    });
  });

  describe('setProject', () => {
    it('sets project data', () => {
      const { result } = renderHook(() => useProjectStore());
      const project = {
        name: 'TLC',
        description: 'Test-Led Coding',
        phase: 62,
        phaseName: 'Revolutionary Dashboard',
      };

      act(() => {
        result.current.setProject(project);
      });

      expect(result.current.project).toEqual(project);
    });

    it('clears loading when project is set', () => {
      const { result } = renderHook(() => useProjectStore());

      act(() => {
        result.current.setLoading(true);
        result.current.setProject({ name: 'Test' });
      });

      expect(result.current.loading).toBe(false);
    });

    it('clears error when project is set', () => {
      const { result } = renderHook(() => useProjectStore());

      act(() => {
        result.current.setError('Previous error');
        result.current.setProject({ name: 'Test' });
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('sets loading to true', () => {
      const { result } = renderHook(() => useProjectStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.loading).toBe(true);
    });

    it('sets loading to false', () => {
      const { result } = renderHook(() => useProjectStore());

      act(() => {
        result.current.setLoading(true);
        result.current.setLoading(false);
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('setError', () => {
    it('sets error message', () => {
      const { result } = renderHook(() => useProjectStore());

      act(() => {
        result.current.setError('Failed to load project');
      });

      expect(result.current.error).toBe('Failed to load project');
    });

    it('clears loading when error is set', () => {
      const { result } = renderHook(() => useProjectStore());

      act(() => {
        result.current.setLoading(true);
        result.current.setError('Error');
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('clearError', () => {
    it('removes error', () => {
      const { result } = renderHook(() => useProjectStore());

      act(() => {
        result.current.setError('Error');
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('setStatus', () => {
    it('sets project status', () => {
      const { result } = renderHook(() => useProjectStore());
      const status = {
        testsPass: 637,
        testsFail: 0,
        coverage: 85,
        phase: 62,
      };

      act(() => {
        result.current.setStatus(status);
      });

      expect(result.current.status).toEqual(status);
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', () => {
      const { result } = renderHook(() => useProjectStore());

      act(() => {
        result.current.setProject({ name: 'Test' });
        result.current.setLoading(true);
        result.current.setError('Error');
        result.current.setStatus({ testsPass: 100 });
        result.current.reset();
      });

      expect(result.current.project).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.status).toBeNull();
    });
  });
});
