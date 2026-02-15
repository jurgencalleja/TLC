import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMemorySearch } from './useMemorySearch';
import { api } from '../api';

vi.mock('../api', () => ({
  api: {
    projects: {
      getMemoryDecisions: vi.fn(),
      getMemoryGotchas: vi.fn(),
    },
  },
}));

const ALL_DECISIONS = [
  { id: 'd1', text: 'Use React for frontend' },
  { id: 'd2', text: 'Use Zustand for state management' },
  { id: 'd3', text: 'Use Tailwind for styling' },
];

const ALL_GOTCHAS = [
  { id: 'g1', text: 'Watch out for circular dependencies' },
  { id: 'g2', text: 'React hooks must be at top level' },
];

describe('useMemorySearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns all items when query is empty', () => {
    const { result } = renderHook(() =>
      useMemorySearch(ALL_DECISIONS, ALL_GOTCHAS)
    );

    expect(result.current.filteredDecisions).toEqual(ALL_DECISIONS);
    expect(result.current.filteredGotchas).toEqual(ALL_GOTCHAS);
  });

  it('filters decisions by query text', () => {
    const { result } = renderHook(() =>
      useMemorySearch(ALL_DECISIONS, ALL_GOTCHAS)
    );

    act(() => {
      result.current.setQuery('React');
    });

    // Debounce fires
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.filteredDecisions).toHaveLength(1);
    expect(result.current.filteredDecisions[0].text).toContain('React');
  });

  it('filters gotchas by query text', () => {
    const { result } = renderHook(() =>
      useMemorySearch(ALL_DECISIONS, ALL_GOTCHAS)
    );

    act(() => {
      result.current.setQuery('circular');
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.filteredGotchas).toHaveLength(1);
    expect(result.current.filteredGotchas[0].text).toContain('circular');
  });

  it('debounces the search (does not filter immediately)', () => {
    const { result } = renderHook(() =>
      useMemorySearch(ALL_DECISIONS, ALL_GOTCHAS)
    );

    act(() => {
      result.current.setQuery('Zustand');
    });

    // Before debounce fires, still shows all
    expect(result.current.filteredDecisions).toEqual(ALL_DECISIONS);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // After debounce, filtered
    expect(result.current.filteredDecisions).toHaveLength(1);
  });

  it('is case-insensitive', () => {
    const { result } = renderHook(() =>
      useMemorySearch(ALL_DECISIONS, ALL_GOTCHAS)
    );

    act(() => {
      result.current.setQuery('tailwind');
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.filteredDecisions).toHaveLength(1);
    expect(result.current.filteredDecisions[0].text).toContain('Tailwind');
  });

  it('returns empty arrays when nothing matches', () => {
    const { result } = renderHook(() =>
      useMemorySearch(ALL_DECISIONS, ALL_GOTCHAS)
    );

    act(() => {
      result.current.setQuery('xyznonexistent');
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.filteredDecisions).toHaveLength(0);
    expect(result.current.filteredGotchas).toHaveLength(0);
  });
});
