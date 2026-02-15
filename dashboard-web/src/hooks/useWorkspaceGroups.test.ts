import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkspaceGroups } from './useWorkspaceGroups';

vi.mock('../api', () => ({
  api: {
    workspace: {
      getGroups: vi.fn(),
    },
  },
}));

import { api } from '../api';

const MOCK_GROUPS = [
  {
    name: 'Platform',
    path: '/repos/Platform',
    repoCount: 2,
    hasTlc: true,
    repos: [
      { id: 'x1', name: 'svc-a', path: '/repos/Platform/svc-a', hasTlc: true },
      { id: 'x2', name: 'svc-b', path: '/repos/Platform/svc-b', hasTlc: false },
    ],
  },
];

describe('useWorkspaceGroups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches groups on call', async () => {
    vi.mocked(api.workspace.getGroups).mockResolvedValue(MOCK_GROUPS);

    const { result } = renderHook(() => useWorkspaceGroups());

    await act(async () => {
      await result.current.fetchGroups();
    });

    expect(api.workspace.getGroups).toHaveBeenCalled();
    expect(result.current.groups).toHaveLength(1);
    expect(result.current.groups[0].name).toBe('Platform');
    expect(result.current.loading).toBe(false);
  });

  it('sets loading state during fetch', async () => {
    let resolvePromise: (value: unknown) => void;
    vi.mocked(api.workspace.getGroups).mockReturnValue(
      new Promise((resolve) => { resolvePromise = resolve; })
    );

    const { result } = renderHook(() => useWorkspaceGroups());

    act(() => {
      result.current.fetchGroups();
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolvePromise!(MOCK_GROUPS);
    });

    expect(result.current.loading).toBe(false);
  });

  it('handles fetch error', async () => {
    vi.mocked(api.workspace.getGroups).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useWorkspaceGroups());

    await act(async () => {
      await result.current.fetchGroups();
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.groups).toHaveLength(0);
  });

  it('auto-fetches on mount', async () => {
    vi.mocked(api.workspace.getGroups).mockResolvedValue(MOCK_GROUPS);

    const { result } = renderHook(() => useWorkspaceGroups());

    // Wait for effect
    await vi.waitFor(() => {
      expect(result.current.groups).toHaveLength(1);
    });
  });
});
