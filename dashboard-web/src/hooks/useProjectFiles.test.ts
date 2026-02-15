import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProjectFiles } from './useProjectFiles';
import { api } from '../api';

vi.mock('../api', () => ({
  api: {
    projects: {
      getFile: vi.fn(),
    },
  },
}));

describe('useProjectFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches file content on mount', async () => {
    vi.mocked(api.projects.getFile).mockResolvedValueOnce({
      filename: 'ROADMAP.md',
      content: '# Roadmap\n\nPhase 1: Setup',
    });

    const { result } = renderHook(() => useProjectFiles('proj-1', 'ROADMAP.md'));

    await waitFor(() => {
      expect(result.current.content).toBe('# Roadmap\n\nPhase 1: Setup');
    });

    expect(result.current.filename).toBe('ROADMAP.md');
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('returns null when no projectId', async () => {
    const { result } = renderHook(() => useProjectFiles(undefined, 'ROADMAP.md'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.content).toBeNull();
    expect(api.projects.getFile).not.toHaveBeenCalled();
  });

  it('returns null when no filename', async () => {
    const { result } = renderHook(() => useProjectFiles('proj-1', undefined));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.content).toBeNull();
    expect(api.projects.getFile).not.toHaveBeenCalled();
  });

  it('sets error on fetch failure', async () => {
    vi.mocked(api.projects.getFile).mockRejectedValueOnce(new Error('File not found'));

    const { result } = renderHook(() => useProjectFiles('proj-1', 'MISSING.md'));

    await waitFor(() => {
      expect(result.current.error).toBe('File not found');
    });

    expect(result.current.content).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
