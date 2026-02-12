import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWorkspace } from './useWorkspace';
import { useWorkspaceStore } from '../stores/workspace.store';
import { api } from '../api';

vi.mock('../api', () => ({
  api: {
    workspace: {
      getConfig: vi.fn(),
      scan: vi.fn(),
      getProjects: vi.fn(),
    },
  },
}));

describe('useWorkspace', () => {
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
    useWorkspaceStore.getState().reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns isConfigured=false when no roots configured', () => {
    vi.mocked(api.workspace.getConfig).mockResolvedValueOnce({ roots: [] });

    const { result } = renderHook(() => useWorkspace());

    expect(result.current.isConfigured).toBe(false);
  });

  it('returns isConfigured=true when roots exist', async () => {
    vi.mocked(api.workspace.getConfig).mockResolvedValueOnce({ roots: ['/projects'] });
    vi.mocked(api.workspace.getProjects).mockResolvedValueOnce([]);

    const { result } = renderHook(() => useWorkspace());

    await waitFor(() => {
      expect(result.current.isConfigured).toBe(true);
    });
  });

  it('fetches config on mount', async () => {
    vi.mocked(api.workspace.getConfig).mockResolvedValueOnce({ roots: ['/projects'] });
    vi.mocked(api.workspace.getProjects).mockResolvedValueOnce([]);

    renderHook(() => useWorkspace());

    await waitFor(() => {
      expect(api.workspace.getConfig).toHaveBeenCalledTimes(1);
    });
  });

  it('returns projects from store', async () => {
    const projects = [
      { id: 'p1', name: 'Project 1', path: '/projects/p1' },
      { id: 'p2', name: 'Project 2', path: '/projects/p2' },
    ];
    vi.mocked(api.workspace.getConfig).mockResolvedValueOnce({ roots: ['/projects'] });
    vi.mocked(api.workspace.getProjects).mockResolvedValueOnce(projects);

    const { result } = renderHook(() => useWorkspace());

    await waitFor(() => {
      expect(result.current.projects).toEqual(projects);
    });
  });

  it('selectProject updates store', async () => {
    vi.mocked(api.workspace.getConfig).mockResolvedValueOnce({ roots: [] });

    const { result } = renderHook(() => useWorkspace());

    act(() => {
      result.current.selectProject('p1');
    });

    // selectedProject is null because no projects are loaded, but the store id is set
    expect(result.current.selectedProject).toBeNull();
    expect(useWorkspaceStore.getState().selectedProjectId).toBe('p1');
  });

  it('scan triggers API call and updates projects', async () => {
    const projects = [
      { id: 'p1', name: 'Project 1', path: '/projects/p1' },
    ];
    vi.mocked(api.workspace.getConfig).mockResolvedValueOnce({ roots: ['/projects'] });
    vi.mocked(api.workspace.getProjects).mockResolvedValueOnce([]);
    vi.mocked(api.workspace.scan).mockResolvedValueOnce({ started: true });
    vi.mocked(api.workspace.getProjects).mockResolvedValueOnce(projects);

    const { result } = renderHook(() => useWorkspace());

    await waitFor(() => {
      expect(api.workspace.getConfig).toHaveBeenCalled();
    });

    await act(async () => {
      await result.current.scan();
    });

    expect(api.workspace.scan).toHaveBeenCalledTimes(1);
    expect(result.current.projects).toEqual(projects);
  });

  it('isScanning tracks scan state', async () => {
    let resolveScan: (value: { started: boolean }) => void;
    vi.mocked(api.workspace.getConfig).mockResolvedValueOnce({ roots: [] });
    vi.mocked(api.workspace.scan).mockImplementation(
      () => new Promise((resolve) => { resolveScan = resolve; })
    );
    vi.mocked(api.workspace.getProjects).mockResolvedValue([]);

    const { result } = renderHook(() => useWorkspace());

    act(() => {
      result.current.scan();
    });

    expect(result.current.isScanning).toBe(true);

    await act(async () => {
      resolveScan!({ started: true });
    });

    expect(result.current.isScanning).toBe(false);
  });

  it('handles scan errors', async () => {
    vi.mocked(api.workspace.getConfig).mockResolvedValueOnce({ roots: [] });
    vi.mocked(api.workspace.scan).mockRejectedValueOnce(new Error('Scan failed'));

    const { result } = renderHook(() => useWorkspace());

    await act(async () => {
      await result.current.scan();
    });

    expect(result.current.error).toBe('Scan failed');
  });

  it('restores selected project from localStorage on mount', async () => {
    localStorageMock['tlc-selected-project-id'] = 'saved-project';
    vi.mocked(api.workspace.getConfig).mockResolvedValueOnce({ roots: [] });

    const { result } = renderHook(() => useWorkspace());

    // selectedProject is null because no matching project in store,
    // but the store id is restored from localStorage
    await waitFor(() => {
      expect(useWorkspaceStore.getState().selectedProjectId).toBe('saved-project');
    });
  });
});
