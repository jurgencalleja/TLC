import { create } from 'zustand';

export interface RecallResult {
  id: string;
  text: string;
  score: number;
  type: string;
  date: string;
  source?: string;
  permanent?: boolean;
}

export interface ConversationEntry {
  id: string;
  title: string;
  date: string;
  [key: string]: unknown;
}

interface MemoryState {
  searchResults: RecallResult[];
  conversations: ConversationEntry[];
  selectedConversationId: string | null;
  searchQuery: string;
}

interface MemoryActions {
  setSearchResults: (results: RecallResult[]) => void;
  setConversations: (conversations: ConversationEntry[]) => void;
  selectConversation: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  reset: () => void;
}

const initialState: MemoryState = {
  searchResults: [],
  conversations: [],
  selectedConversationId: null,
  searchQuery: '',
};

export const useMemoryStore = create<MemoryState & MemoryActions>((set) => ({
  ...initialState,
  setSearchResults: (results) => set({ searchResults: results }),
  setConversations: (conversations) => set({ conversations }),
  selectConversation: (id) => set({ selectedConversationId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  reset: () => set(initialState),
}));
