import { useState, useMemo, useEffect, useRef } from 'react';
import type { MemoryDecision, MemoryGotcha } from '../api/endpoints';

export function useMemorySearch(
  decisions: MemoryDecision[],
  gotchas: MemoryGotcha[],
  debounceMs = 300
) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [query, debounceMs]);

  const filteredDecisions = useMemo(() => {
    if (!debouncedQuery) return decisions;
    const q = debouncedQuery.toLowerCase();
    return decisions.filter(
      (d) => d.text.toLowerCase().includes(q) || d.context?.toLowerCase().includes(q)
    );
  }, [decisions, debouncedQuery]);

  const filteredGotchas = useMemo(() => {
    if (!debouncedQuery) return gotchas;
    const q = debouncedQuery.toLowerCase();
    return gotchas.filter(
      (g) => g.text.toLowerCase().includes(q) || g.context?.toLowerCase().includes(q)
    );
  }, [gotchas, debouncedQuery]);

  return { query, setQuery, filteredDecisions, filteredGotchas };
}
