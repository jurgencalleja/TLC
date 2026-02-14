import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRoadmap } from './useRoadmap';
import { api } from '../api';

vi.mock('../api', () => ({
  api: {
    projects: {
      getRoadmap: vi.fn(),
    },
  },
}));

const mockRoadmapData = {
  milestones: [
    {
      name: 'Milestone 1',
      phases: [
        {
          number: 1,
          name: 'Setup',
          goal: 'Project setup',
          status: 'done' as const,
          deliverables: [{ text: 'Init project', done: true }],
          taskCount: 5,
          completedTaskCount: 5,
          testCount: 10,
          testFileCount: 3,
          hasTests: true,
          verified: true,
        },
      ],
    },
  ],
  currentPhase: { number: 2, name: 'Development' },
  totalPhases: 10,
  completedPhases: 1,
  testSummary: { totalFiles: 3, totalTests: 10 },
  recentCommits: [
    { hash: 'abc123', message: 'Initial commit', date: '2025-01-01', author: 'dev' },
  ],
  projectInfo: { name: 'TLC', version: '1.0.0', description: 'Test project' },
};

describe('useRoadmap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches roadmap on mount', async () => {
    vi.mocked(api.projects.getRoadmap).mockResolvedValueOnce(mockRoadmapData);

    const { result } = renderHook(() => useRoadmap('proj-1'));

    await waitFor(() => {
      expect(result.current.roadmap).toEqual(mockRoadmapData);
    });

    expect(api.projects.getRoadmap).toHaveBeenCalledWith('proj-1');
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('returns null roadmap when no projectId', async () => {
    const { result } = renderHook(() => useRoadmap());

    // Give it a tick to settle
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.roadmap).toBeNull();
    expect(api.projects.getRoadmap).not.toHaveBeenCalled();
  });

  it('sets loading state during fetch', async () => {
    let resolveRoadmap: (value: any) => void;
    vi.mocked(api.projects.getRoadmap).mockImplementation(
      () => new Promise((resolve) => { resolveRoadmap = resolve; })
    );

    const { result } = renderHook(() => useRoadmap('proj-1'));

    // The useEffect triggers fetchRoadmap, which sets loading to true
    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    await act(async () => {
      resolveRoadmap!(mockRoadmapData);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.roadmap).toEqual(mockRoadmapData);
  });

  it('sets error state on failure', async () => {
    vi.mocked(api.projects.getRoadmap).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useRoadmap('proj-1'));

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
    });

    expect(result.current.roadmap).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
