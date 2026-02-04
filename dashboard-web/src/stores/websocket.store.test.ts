import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useWebSocketStore, type ConnectionStatus } from './websocket.store';

describe('websocket.store', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useWebSocketStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('initial state', () => {
    it('has disconnected status', () => {
      const { result } = renderHook(() => useWebSocketStore());
      expect(result.current.status).toBe('disconnected');
    });

    it('has zero reconnect attempts', () => {
      const { result } = renderHook(() => useWebSocketStore());
      expect(result.current.reconnectAttempts).toBe(0);
    });

    it('has null lastConnected time', () => {
      const { result } = renderHook(() => useWebSocketStore());
      expect(result.current.lastConnected).toBeNull();
    });

    it('has null error', () => {
      const { result } = renderHook(() => useWebSocketStore());
      expect(result.current.error).toBeNull();
    });
  });

  describe('setStatus', () => {
    it('sets connected status', () => {
      const { result } = renderHook(() => useWebSocketStore());

      act(() => {
        result.current.setStatus('connected');
      });

      expect(result.current.status).toBe('connected');
    });

    it('sets reconnecting status', () => {
      const { result } = renderHook(() => useWebSocketStore());

      act(() => {
        result.current.setStatus('reconnecting');
      });

      expect(result.current.status).toBe('reconnecting');
    });

    it('sets disconnected status', () => {
      const { result } = renderHook(() => useWebSocketStore());

      act(() => {
        result.current.setStatus('connected');
        result.current.setStatus('disconnected');
      });

      expect(result.current.status).toBe('disconnected');
    });

    it('updates lastConnected when connected', () => {
      const { result } = renderHook(() => useWebSocketStore());
      const before = Date.now();

      act(() => {
        result.current.setStatus('connected');
      });

      const after = Date.now();
      expect(result.current.lastConnected).toBeGreaterThanOrEqual(before);
      expect(result.current.lastConnected).toBeLessThanOrEqual(after);
    });

    it('resets reconnect attempts when connected', () => {
      const { result } = renderHook(() => useWebSocketStore());

      act(() => {
        result.current.incrementReconnectAttempts();
        result.current.incrementReconnectAttempts();
        result.current.setStatus('connected');
      });

      expect(result.current.reconnectAttempts).toBe(0);
    });

    it('clears error when connected', () => {
      const { result } = renderHook(() => useWebSocketStore());

      act(() => {
        result.current.setError('Connection failed');
        result.current.setStatus('connected');
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('reconnect attempts', () => {
    it('increments reconnect attempts', () => {
      const { result } = renderHook(() => useWebSocketStore());

      act(() => {
        result.current.incrementReconnectAttempts();
      });

      expect(result.current.reconnectAttempts).toBe(1);
    });

    it('increments multiple times', () => {
      const { result } = renderHook(() => useWebSocketStore());

      act(() => {
        result.current.incrementReconnectAttempts();
        result.current.incrementReconnectAttempts();
        result.current.incrementReconnectAttempts();
      });

      expect(result.current.reconnectAttempts).toBe(3);
    });

    it('resets reconnect attempts to zero', () => {
      const { result } = renderHook(() => useWebSocketStore());

      act(() => {
        result.current.incrementReconnectAttempts();
        result.current.incrementReconnectAttempts();
        result.current.resetReconnectAttempts();
      });

      expect(result.current.reconnectAttempts).toBe(0);
    });
  });

  describe('error handling', () => {
    it('sets error message', () => {
      const { result } = renderHook(() => useWebSocketStore());

      act(() => {
        result.current.setError('Connection refused');
      });

      expect(result.current.error).toBe('Connection refused');
    });

    it('clears error', () => {
      const { result } = renderHook(() => useWebSocketStore());

      act(() => {
        result.current.setError('Error');
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('computed properties', () => {
    it('isConnected returns true when connected', () => {
      const { result } = renderHook(() => useWebSocketStore());

      act(() => {
        result.current.setStatus('connected');
      });

      expect(result.current.isConnected).toBe(true);
    });

    it('isConnected returns false when disconnected', () => {
      const { result } = renderHook(() => useWebSocketStore());

      expect(result.current.isConnected).toBe(false);
    });

    it('isConnected returns false when reconnecting', () => {
      const { result } = renderHook(() => useWebSocketStore());

      act(() => {
        result.current.setStatus('reconnecting');
      });

      expect(result.current.isConnected).toBe(false);
    });

    it('shouldReconnect returns true when disconnected', () => {
      const { result } = renderHook(() => useWebSocketStore());

      expect(result.current.shouldReconnect).toBe(true);
    });

    it('shouldReconnect returns false when connected', () => {
      const { result } = renderHook(() => useWebSocketStore());

      act(() => {
        result.current.setStatus('connected');
      });

      expect(result.current.shouldReconnect).toBe(false);
    });

    it('shouldReconnect returns false after max attempts', () => {
      const { result } = renderHook(() => useWebSocketStore());

      act(() => {
        // Simulate max attempts (10)
        for (let i = 0; i < 10; i++) {
          result.current.incrementReconnectAttempts();
        }
      });

      expect(result.current.shouldReconnect).toBe(false);
    });

    it('reconnectDelay increases with attempts', () => {
      const { result } = renderHook(() => useWebSocketStore());

      // First attempt: 1000ms
      expect(result.current.reconnectDelay).toBe(1000);

      act(() => {
        result.current.incrementReconnectAttempts();
      });

      // Second attempt: 2000ms
      expect(result.current.reconnectDelay).toBe(2000);

      act(() => {
        result.current.incrementReconnectAttempts();
      });

      // Third attempt: 4000ms
      expect(result.current.reconnectDelay).toBe(4000);
    });

    it('reconnectDelay caps at 30 seconds', () => {
      const { result } = renderHook(() => useWebSocketStore());

      act(() => {
        // Simulate many attempts
        for (let i = 0; i < 10; i++) {
          result.current.incrementReconnectAttempts();
        }
      });

      expect(result.current.reconnectDelay).toBeLessThanOrEqual(30000);
    });
  });

  describe('reset', () => {
    it('resets all state to initial', () => {
      const { result } = renderHook(() => useWebSocketStore());

      act(() => {
        result.current.setStatus('connected');
        result.current.incrementReconnectAttempts();
        result.current.setError('Error');
        result.current.reset();
      });

      expect(result.current.status).toBe('disconnected');
      expect(result.current.reconnectAttempts).toBe(0);
      expect(result.current.lastConnected).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });
});
