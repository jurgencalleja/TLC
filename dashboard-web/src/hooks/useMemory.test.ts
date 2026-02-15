import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMemory } from './useMemory';
import { api } from '../api';

vi.mock('../api', () => ({
  api: {
    projects: {
      getMemoryDecisions: vi.fn(),
      getMemoryGotchas: vi.fn(),
      getMemoryStats: vi.fn(),
    },
  },
}));

const mockDecisions = [
  { id: 'd1', text: 'Use React for frontend' },
  { id: 'd2', text: 'Use Zustand for state' },
];

const mockGotchas = [
  { id: 'g1', text: 'Watch out for circular deps' },
];

const mockStats = { totalEntries: 42, vectorCount: 100 };

describe('useMemory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches decisions, gotchas, and stats on mount', async () => {
    vi.mocked(api.projects.getMemoryDecisions).mockResolvedValueOnce(mockDecisions);
    vi.mocked(api.projects.getMemoryGotchas).mockResolvedValueOnce(mockGotchas);
    vi.mocked(api.projects.getMemoryStats).mockResolvedValueOnce(mockStats);

    const { result } = renderHook(() => useMemory('proj-1'));

    await waitFor(() => {
      expect(result.current.decisions).toEqual(mockDecisions);
    });

    expect(result.current.gotchas).toEqual(mockGotchas);
    expect(result.current.stats).toEqual(mockStats);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('returns empty state when no projectId', async () => {
    const { result } = renderHook(() => useMemory());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.decisions).toEqual([]);
    expect(result.current.gotchas).toEqual([]);
    expect(result.current.stats).toBeNull();
    expect(api.projects.getMemoryDecisions).not.toHaveBeenCalled();
  });

  it('sets error state on failure', async () => {
    vi.mocked(api.projects.getMemoryDecisions).mockRejectedValueOnce(new Error('Network error'));
    vi.mocked(api.projects.getMemoryGotchas).mockResolvedValueOnce([]);
    vi.mocked(api.projects.getMemoryStats).mockResolvedValueOnce(mockStats);

    const { result } = renderHook(() => useMemory('proj-1'));

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
    });

    expect(result.current.loading).toBe(false);
  });

  it('sets loading state during fetch', async () => {
    let resolveDecisions: (value: any) => void;
    vi.mocked(api.projects.getMemoryDecisions).mockImplementation(
      () => new Promise((resolve) => { resolveDecisions = resolve; })
    );
    vi.mocked(api.projects.getMemoryGotchas).mockResolvedValueOnce([]);
    vi.mocked(api.projects.getMemoryStats).mockResolvedValueOnce(mockStats);

    const { result } = renderHook(() => useMemory('proj-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });
  });
});
