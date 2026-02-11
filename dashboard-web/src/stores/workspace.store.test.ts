import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useWorkspaceStore } from './workspace.store';

const STORAGE_KEY = 'tlc-selected-project-id';

describe('workspace.store', () => {
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    localStorageMock = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => localStorageMock[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
      clear: vi.fn(() => {
        localStorageMock = {};
      }),
      length: 0,
      key: vi.fn(),
    });

    // Reset store state
    const { result } = renderHook(() => useWorkspaceStore());
    act(() => {
      result.current.reset();
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('initial state', () => {
    it('initializes with empty roots', () => {
      const { result } = renderHook(() => useWorkspaceStore());
      expect(result.current.roots).toEqual([]);
    });

    it('initializes with empty projects', () => {
      const { result } = renderHook(() => useWorkspaceStore());
      expect(result.current.projects).toEqual([]);
    });

    it('initializes with null selectedProjectId', () => {
      const { result } = renderHook(() => useWorkspaceStore());
      expect(result.current.selectedProjectId).toBeNull();
    });

    it('initializes with isConfigured false', () => {
      const { result } = renderHook(() => useWorkspaceStore());
      expect(result.current.isConfigured).toBe(false);
    });

    it('initializes with isScanning false', () => {
      const { result } = renderHook(() => useWorkspaceStore());
      expect(result.current.isScanning).toBe(false);
    });

    it('initializes with null lastScan', () => {
      const { result } = renderHook(() => useWorkspaceStore());
      expect(result.current.lastScan).toBeNull();
    });
  });

  describe('setRoots', () => {
    it('updates roots array', () => {
      const { result } = renderHook(() => useWorkspaceStore());
      const roots = ['/home/user/projects', '/home/user/work'];

      act(() => {
        result.current.setRoots(roots);
      });

      expect(result.current.roots).toEqual(roots);
    });
  });

  describe('setProjects', () => {
    it('updates project list', () => {
      const { result } = renderHook(() => useWorkspaceStore());
      const projects = [
        { id: 'proj-1', name: 'Project Alpha', path: '/home/user/projects/alpha' },
        { id: 'proj-2', name: 'Project Beta', path: '/home/user/projects/beta' },
      ];

      act(() => {
        result.current.setProjects(projects);
      });

      expect(result.current.projects).toEqual(projects);
    });
  });

  describe('selectProject', () => {
    it('sets selectedProjectId', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      act(() => {
        result.current.selectProject('proj-1');
      });

      expect(result.current.selectedProjectId).toBe('proj-1');
    });

    it('persists selectedProjectId to localStorage', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      act(() => {
        result.current.selectProject('proj-42');
      });

      expect(localStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, 'proj-42');
    });

    it('sets selectedProjectId to null', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      act(() => {
        result.current.selectProject('proj-1');
        result.current.selectProject(null);
      });

      expect(result.current.selectedProjectId).toBeNull();
    });

    it('removes localStorage entry when selecting null', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      act(() => {
        result.current.selectProject(null);
      });

      expect(localStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    });
  });

  describe('restoreSelectedProject', () => {
    it('restores selectedProjectId from localStorage on init', () => {
      localStorageMock[STORAGE_KEY] = 'proj-saved';

      const { result } = renderHook(() => useWorkspaceStore());

      act(() => {
        result.current.restoreSelectedProject();
      });

      expect(result.current.selectedProjectId).toBe('proj-saved');
    });

    it('does not change state when localStorage has no saved value', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      act(() => {
        result.current.restoreSelectedProject();
      });

      expect(result.current.selectedProjectId).toBeNull();
    });
  });

  describe('isConfigured', () => {
    it('is false when no roots', () => {
      const { result } = renderHook(() => useWorkspaceStore());
      expect(result.current.isConfigured).toBe(false);
    });

    it('is true when roots exist', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      act(() => {
        result.current.setRoots(['/home/user/projects']);
      });

      expect(result.current.isConfigured).toBe(true);
    });

    it('becomes false when roots are cleared', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      act(() => {
        result.current.setRoots(['/home/user/projects']);
      });
      expect(result.current.isConfigured).toBe(true);

      act(() => {
        result.current.setRoots([]);
      });
      expect(result.current.isConfigured).toBe(false);
    });
  });

  describe('setIsScanning', () => {
    it('sets isScanning to true', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      act(() => {
        result.current.setIsScanning(true);
      });

      expect(result.current.isScanning).toBe(true);
    });

    it('sets isScanning to false', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      act(() => {
        result.current.setIsScanning(true);
        result.current.setIsScanning(false);
      });

      expect(result.current.isScanning).toBe(false);
    });
  });

  describe('setLastScan', () => {
    it('sets lastScan timestamp', () => {
      const { result } = renderHook(() => useWorkspaceStore());
      const timestamp = '2026-02-11T10:00:00Z';

      act(() => {
        result.current.setLastScan(timestamp);
      });

      expect(result.current.lastScan).toBe(timestamp);
    });
  });

  describe('reset', () => {
    it('clears all state to initial values', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      act(() => {
        result.current.setRoots(['/home/user/projects']);
        result.current.setProjects([{ id: 'proj-1', name: 'P', path: '/p' }]);
        result.current.selectProject('proj-1');
        result.current.setIsScanning(true);
        result.current.setLastScan('2026-02-11T10:00:00Z');
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.roots).toEqual([]);
      expect(result.current.projects).toEqual([]);
      expect(result.current.selectedProjectId).toBeNull();
      expect(result.current.isConfigured).toBe(false);
      expect(result.current.isScanning).toBe(false);
      expect(result.current.lastScan).toBeNull();
    });
  });
});
