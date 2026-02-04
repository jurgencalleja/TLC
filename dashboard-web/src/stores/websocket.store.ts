import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_DELAY = 1000;
const MAX_DELAY = 30000;

interface WebSocketState {
  status: ConnectionStatus;
  reconnectAttempts: number;
  lastConnected: number | null;
  error: string | null;
  isConnected: boolean;
  shouldReconnect: boolean;
  reconnectDelay: number;
}

interface WebSocketActions {
  setStatus: (status: ConnectionStatus) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

const computeReconnectDelay = (attempts: number): number => {
  const delay = BASE_DELAY * Math.pow(2, attempts);
  return Math.min(delay, MAX_DELAY);
};

const initialState = {
  status: 'disconnected' as ConnectionStatus,
  reconnectAttempts: 0,
  lastConnected: null as number | null,
  error: null as string | null,
};

const computeDerivedState = (
  status: ConnectionStatus,
  reconnectAttempts: number
) => ({
  isConnected: status === 'connected',
  shouldReconnect: status !== 'connected' && reconnectAttempts < MAX_RECONNECT_ATTEMPTS,
  reconnectDelay: computeReconnectDelay(reconnectAttempts),
});

export const useWebSocketStore = create<WebSocketState & WebSocketActions>()(
  subscribeWithSelector((set) => ({
    ...initialState,
    ...computeDerivedState(initialState.status, initialState.reconnectAttempts),

    setStatus: (status) =>
      set((state) => {
        if (status === 'connected') {
          return {
            status,
            lastConnected: Date.now(),
            reconnectAttempts: 0,
            error: null,
            ...computeDerivedState(status, 0),
          };
        }
        return {
          status,
          ...computeDerivedState(status, state.reconnectAttempts),
        };
      }),

    incrementReconnectAttempts: () =>
      set((state) => {
        const reconnectAttempts = state.reconnectAttempts + 1;
        return {
          reconnectAttempts,
          ...computeDerivedState(state.status, reconnectAttempts),
        };
      }),

    resetReconnectAttempts: () =>
      set((state) => ({
        reconnectAttempts: 0,
        ...computeDerivedState(state.status, 0),
      })),

    setError: (error) => set({ error }),

    clearError: () => set({ error: null }),

    reset: () =>
      set({
        ...initialState,
        ...computeDerivedState(initialState.status, initialState.reconnectAttempts),
      }),
  }))
);
