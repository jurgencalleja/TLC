import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTestSuite } from './useTestSuite';
import { api } from '../api';

vi.mock('../api', () => ({
  api: {
    projects: {
      getTestInventory: vi.fn(),
      runTests: vi.fn(),
    },
  },
}));

const mockInventoryData = {
  totalFiles: 5,
  totalTests: 42,
  groups: [
    {
      name: 'hooks',
      fileCount: 2,
      testCount: 15,
      files: [
        { relativePath: 'src/hooks/useProject.test.ts', testCount: 10 },
        { relativePath: 'src/hooks/useRoadmap.test.ts', testCount: 5 },
      ],
    },
    {
      name: 'api',
      fileCount: 1,
      testCount: 8,
      files: [
        { relativePath: 'src/api/client.test.ts', testCount: 8 },
      ],
    },
  ],
  lastRun: {
    timestamp: '2025-01-15T10:00:00Z',
    passed: 40,
    failed: 2,
    total: 42,
    duration: 3500,
  },
};

describe('useTestSuite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches inventory on mount', async () => {
    vi.mocked(api.projects.getTestInventory).mockResolvedValueOnce(mockInventoryData);

    const { result } = renderHook(() => useTestSuite('proj-1'));

    await waitFor(() => {
      expect(result.current.inventory).toEqual(mockInventoryData);
    });

    expect(api.projects.getTestInventory).toHaveBeenCalledWith('proj-1');
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('returns null when no projectId', async () => {
    const { result } = renderHook(() => useTestSuite());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.inventory).toBeNull();
    expect(api.projects.getTestInventory).not.toHaveBeenCalled();
  });

  it('sets error state on failure', async () => {
    vi.mocked(api.projects.getTestInventory).mockRejectedValueOnce(
      new Error('Failed to load tests')
    );

    const { result } = renderHook(() => useTestSuite('proj-1'));

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to load tests');
    });

    expect(result.current.inventory).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('runTests triggers API call', async () => {
    vi.mocked(api.projects.getTestInventory).mockResolvedValueOnce(mockInventoryData);
    vi.mocked(api.projects.runTests).mockResolvedValueOnce({
      started: true,
      message: 'Tests started',
    });

    const { result } = renderHook(() => useTestSuite('proj-1'));

    // Wait for initial fetch to complete
    await waitFor(() => {
      expect(result.current.inventory).toEqual(mockInventoryData);
    });

    await act(async () => {
      await result.current.runTests();
    });

    expect(api.projects.runTests).toHaveBeenCalledWith('proj-1');
  });
});
