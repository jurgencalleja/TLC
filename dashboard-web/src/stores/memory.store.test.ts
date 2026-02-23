import { describe, it, expect, beforeEach } from 'vitest';
import { useMemoryStore } from './memory.store';

describe('memory.store', () => {
  beforeEach(() => {
    useMemoryStore.getState().reset();
  });

  it('initializes with empty state', () => {
    const state = useMemoryStore.getState();
    expect(state.searchResults).toEqual([]);
    expect(state.conversations).toEqual([]);
    expect(state.selectedConversationId).toBeNull();
    expect(state.searchQuery).toBe('');
  });

  it('setSearchResults updates results', () => {
    const results = [{ id: '1', text: 'Use React', score: 0.9, type: 'decision', date: '2026-01-15' }];
    useMemoryStore.getState().setSearchResults(results);
    expect(useMemoryStore.getState().searchResults).toEqual(results);
  });

  it('setConversations updates conversation list', () => {
    const convos = [{ id: 'c1', title: 'Test', date: '2026-01-15' }];
    useMemoryStore.getState().setConversations(convos);
    expect(useMemoryStore.getState().conversations).toEqual(convos);
  });

  it('selectConversation sets selected ID', () => {
    useMemoryStore.getState().selectConversation('c1');
    expect(useMemoryStore.getState().selectedConversationId).toBe('c1');
  });

  it('selectConversation with null clears selection', () => {
    useMemoryStore.getState().selectConversation('c1');
    useMemoryStore.getState().selectConversation(null);
    expect(useMemoryStore.getState().selectedConversationId).toBeNull();
  });

  it('setSearchQuery updates query', () => {
    useMemoryStore.getState().setSearchQuery('react architecture');
    expect(useMemoryStore.getState().searchQuery).toBe('react architecture');
  });

  it('reset clears all state', () => {
    useMemoryStore.getState().setSearchResults([{ id: '1', text: 'x', score: 0.5, type: 'decision', date: '' }]);
    useMemoryStore.getState().setSearchQuery('test');
    useMemoryStore.getState().selectConversation('c1');
    useMemoryStore.getState().reset();

    const state = useMemoryStore.getState();
    expect(state.searchResults).toEqual([]);
    expect(state.searchQuery).toBe('');
    expect(state.selectedConversationId).toBeNull();
  });
});
