import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSettings } from './useSettings';
import { api } from '../api';

vi.mock('../api', () => ({
  api: {
    config: {
      getConfig: vi.fn(),
      saveConfig: vi.fn(),
    },
  },
}));

const mockConfig = {
  project: 'Test Project',
  testFrameworks: {
    primary: 'vitest',
  },
  quality: {
    coverageThreshold: 80,
    qualityScoreThreshold: 75,
  },
};

describe('useSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchConfig', () => {
    it('fetches config on initial load', async () => {
      vi.mocked(api.config.getConfig).mockResolvedValueOnce(mockConfig);

      const { result } = renderHook(() => useSettings());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(api.config.getConfig).toHaveBeenCalledTimes(1);
      expect(result.current.config).toEqual(mockConfig);
    });

    it('sets error state when fetch fails', async () => {
      const error = new Error('Failed to fetch config');
      vi.mocked(api.config.getConfig).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch config');
      expect(result.current.config).toBeNull();
    });

    it('returns null config when loading', () => {
      vi.mocked(api.config.getConfig).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useSettings());

      expect(result.current.loading).toBe(true);
      expect(result.current.config).toBeNull();
    });
  });

  describe('saveConfig', () => {
    it('saves config successfully', async () => {
      vi.mocked(api.config.getConfig).mockResolvedValueOnce(mockConfig);
      vi.mocked(api.config.saveConfig).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newConfig = { ...mockConfig, project: 'Updated Project' };

      await act(async () => {
        await result.current.saveConfig(newConfig);
      });

      expect(api.config.saveConfig).toHaveBeenCalledWith(newConfig);
      expect(result.current.config).toEqual(newConfig);
    });

    it('sets saving state while saving', async () => {
      vi.mocked(api.config.getConfig).mockResolvedValueOnce(mockConfig);

      let resolveSave: () => void;
      vi.mocked(api.config.saveConfig).mockImplementation(
        () => new Promise((resolve) => { resolveSave = resolve; })
      );

      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let savePromise: Promise<void>;
      act(() => {
        savePromise = result.current.saveConfig(mockConfig);
      });

      expect(result.current.saving).toBe(true);

      await act(async () => {
        resolveSave!();
        await savePromise!;
      });

      expect(result.current.saving).toBe(false);
    });

    it('sets error state when save fails', async () => {
      vi.mocked(api.config.getConfig).mockResolvedValueOnce(mockConfig);
      vi.mocked(api.config.saveConfig).mockRejectedValueOnce(new Error('Save failed'));

      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.saveConfig(mockConfig);
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Save failed');
    });

    it('throws error when save fails', async () => {
      vi.mocked(api.config.getConfig).mockResolvedValueOnce(mockConfig);
      vi.mocked(api.config.saveConfig).mockRejectedValueOnce(new Error('Save failed'));

      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.saveConfig(mockConfig);
        })
      ).rejects.toThrow('Save failed');
    });
  });

  describe('refetch', () => {
    it('refetches config when called', async () => {
      vi.mocked(api.config.getConfig).mockResolvedValueOnce(mockConfig);

      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updatedConfig = { ...mockConfig, project: 'Refetched Project' };
      vi.mocked(api.config.getConfig).mockResolvedValueOnce(updatedConfig);

      await act(async () => {
        await result.current.refetch();
      });

      expect(api.config.getConfig).toHaveBeenCalledTimes(2);
      expect(result.current.config).toEqual(updatedConfig);
    });

    it('clears error on successful refetch', async () => {
      vi.mocked(api.config.getConfig).mockRejectedValueOnce(new Error('Initial error'));

      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.error).toBe('Initial error');
      });

      vi.mocked(api.config.getConfig).mockResolvedValueOnce(mockConfig);

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.config).toEqual(mockConfig);
    });
  });
});
