import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBugs } from './useBugs';

// Mock the api module
vi.mock('../api', () => ({
  api: {
    projects: {
      getBugs: vi.fn(),
      createBug: vi.fn(),
      updateBugStatus: vi.fn(),
    },
  },
}));

import { api } from '../api';

describe('useBugs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty bugs array initially', () => {
    const { result } = renderHook(() => useBugs('proj1'));
    expect(result.current.bugs).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('returns empty bugs when no projectId', () => {
    const { result } = renderHook(() => useBugs());
    expect(result.current.bugs).toEqual([]);
  });

  it('fetches bugs from API', async () => {
    const mockBugs = [
      { id: 'BUG-001', description: 'Login broken', severity: 'high', status: 'open', createdAt: '2026-02-10' },
    ];
    vi.mocked(api.projects.getBugs).mockResolvedValueOnce(mockBugs);

    const { result } = renderHook(() => useBugs('proj1'));

    await act(async () => {
      await result.current.fetchBugs();
    });

    expect(result.current.bugs).toEqual(mockBugs);
    expect(result.current.loading).toBe(false);
    expect(api.projects.getBugs).toHaveBeenCalledWith('proj1');
  });

  it('handles fetch error', async () => {
    vi.mocked(api.projects.getBugs).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useBugs('proj1'));

    await act(async () => {
      await result.current.fetchBugs();
    });

    expect(result.current.bugs).toEqual([]);
    expect(result.current.error).toBe('Network error');
  });

  it('creates bug and refreshes list', async () => {
    vi.mocked(api.projects.createBug).mockResolvedValueOnce({ bug: { id: 'BUG-002' } as any });
    vi.mocked(api.projects.getBugs).mockResolvedValueOnce([]);

    const { result } = renderHook(() => useBugs('proj1'));

    await act(async () => {
      await result.current.createBug({ title: 'New bug', severity: 'low', description: 'desc' });
    });

    expect(api.projects.createBug).toHaveBeenCalledWith('proj1', { title: 'New bug', severity: 'low', description: 'desc' });
    expect(api.projects.getBugs).toHaveBeenCalled();
  });

  it('updates bug status and refreshes', async () => {
    vi.mocked(api.projects.updateBugStatus).mockResolvedValueOnce({ bug: { id: 'BUG-001' } as any });
    vi.mocked(api.projects.getBugs).mockResolvedValueOnce([]);

    const { result } = renderHook(() => useBugs('proj1'));

    await act(async () => {
      await result.current.updateBugStatus('BUG-001', 'fixed');
    });

    expect(api.projects.updateBugStatus).toHaveBeenCalledWith('proj1', 'BUG-001', 'fixed');
  });
});
