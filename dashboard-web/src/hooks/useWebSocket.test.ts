import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebSocketStore } from '../stores/websocket.store';
import { useLogStore } from '../stores/log.store';

// Mock WebSocket - must be before importing useWebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((error: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  readyState = 0;
  CONNECTING = 0;
  OPEN = 1;
  CLOSING = 2;
  CLOSED = 3;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = this.CLOSED;
    // Don't auto-call onclose - let tests control this
  });

  simulateOpen() {
    this.readyState = this.OPEN;
    this.onopen?.();
  }

  simulateClose() {
    this.readyState = this.CLOSED;
    this.onclose?.();
  }

  simulateError(error: Event) {
    this.onerror?.(error);
  }

  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }
}

// Set up global WebSocket before importing hook
(globalThis as unknown as { WebSocket: typeof MockWebSocket }).WebSocket = MockWebSocket;

// Now import the hook
import { useWebSocket } from './useWebSocket';

describe('useWebSocket', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    // Reset stores
    useWebSocketStore.getState().reset();
    useLogStore.getState().reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('connection', () => {
    it('connects to WebSocket on mount', () => {
      renderHook(() => useWebSocket({ url: 'ws://localhost:3001' }));

      expect(MockWebSocket.instances).toHaveLength(1);
      expect(MockWebSocket.instances[0].url).toBe('ws://localhost:3001');
    });

    it('sets status to connected on open', async () => {
      renderHook(() => useWebSocket({ url: 'ws://localhost:3001' }));

      act(() => {
        MockWebSocket.instances[0].simulateOpen();
      });

      expect(useWebSocketStore.getState().status).toBe('connected');
    });

    it('does not connect if autoConnect is false', () => {
      renderHook(() => useWebSocket({ url: 'ws://localhost:3001', autoConnect: false }));

      expect(MockWebSocket.instances).toHaveLength(0);
    });

    it('closes connection on unmount', () => {
      const { unmount } = renderHook(() => useWebSocket({ url: 'ws://localhost:3001' }));

      act(() => {
        MockWebSocket.instances[0].simulateOpen();
      });

      unmount();

      expect(MockWebSocket.instances[0].close).toHaveBeenCalled();
    });
  });

  describe('message handling', () => {
    it('processes incoming log messages', async () => {
      renderHook(() => useWebSocket({ url: 'ws://localhost:3001' }));

      act(() => {
        MockWebSocket.instances[0].simulateOpen();
        MockWebSocket.instances[0].simulateMessage({
          type: 'log',
          payload: {
            id: 'log-1',
            text: 'Test log message',
            level: 'info',
            type: 'app',
          },
        });
      });

      const logs = useLogStore.getState().logs.app;
      expect(logs).toHaveLength(1);
      expect(logs[0].text).toBe('Test log message');
    });

    it('calls onMessage callback with parsed data', () => {
      const onMessage = vi.fn();
      renderHook(() => useWebSocket({ url: 'ws://localhost:3001', onMessage }));

      act(() => {
        MockWebSocket.instances[0].simulateOpen();
        MockWebSocket.instances[0].simulateMessage({ type: 'custom', data: 'test' });
      });

      expect(onMessage).toHaveBeenCalledWith({ type: 'custom', data: 'test' });
    });
  });

  describe('sending messages', () => {
    it('provides send function', () => {
      const { result } = renderHook(() => useWebSocket({ url: 'ws://localhost:3001' }));

      act(() => {
        MockWebSocket.instances[0].simulateOpen();
      });

      act(() => {
        result.current.send({ type: 'ping' });
      });

      expect(MockWebSocket.instances[0].send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'ping' })
      );
    });

    it('does not send if not connected', () => {
      const { result } = renderHook(() => useWebSocket({ url: 'ws://localhost:3001' }));

      act(() => {
        result.current.send({ type: 'ping' });
      });

      expect(MockWebSocket.instances[0].send).not.toHaveBeenCalled();
    });
  });

  describe('reconnection', () => {
    it('sets status to disconnected on close', () => {
      renderHook(() => useWebSocket({ url: 'ws://localhost:3001' }));

      act(() => {
        MockWebSocket.instances[0].simulateOpen();
        MockWebSocket.instances[0].simulateClose();
      });

      expect(useWebSocketStore.getState().status).toBe('disconnected');
    });

    it('increments reconnect attempts on unexpected close', () => {
      vi.useFakeTimers();

      renderHook(() => useWebSocket({ url: 'ws://localhost:3001' }));

      act(() => {
        MockWebSocket.instances[0].simulateOpen();
        MockWebSocket.instances[0].simulateClose();
      });

      expect(useWebSocketStore.getState().reconnectAttempts).toBe(1);

      vi.useRealTimers();
    });

    it('sets error on WebSocket error', () => {
      renderHook(() => useWebSocket({ url: 'ws://localhost:3001' }));

      act(() => {
        MockWebSocket.instances[0].simulateError(new Event('error'));
      });

      expect(useWebSocketStore.getState().error).toBeTruthy();
    });
  });

  describe('manual controls', () => {
    it('provides connect function', () => {
      const { result } = renderHook(() =>
        useWebSocket({ url: 'ws://localhost:3001', autoConnect: false })
      );

      expect(MockWebSocket.instances).toHaveLength(0);

      act(() => {
        result.current.connect();
      });

      expect(MockWebSocket.instances).toHaveLength(1);
    });

    it('provides disconnect function', () => {
      const { result } = renderHook(() => useWebSocket({ url: 'ws://localhost:3001' }));

      act(() => {
        MockWebSocket.instances[0].simulateOpen();
      });

      act(() => {
        result.current.disconnect();
      });

      expect(MockWebSocket.instances[0].close).toHaveBeenCalled();
    });
  });

  describe('return value', () => {
    it('returns connection status', () => {
      const { result } = renderHook(() => useWebSocket({ url: 'ws://localhost:3001' }));

      expect(result.current.isConnected).toBe(false);

      act(() => {
        MockWebSocket.instances[0].simulateOpen();
      });

      expect(result.current.isConnected).toBe(true);
    });

    it('returns send, connect, disconnect functions', () => {
      const { result } = renderHook(() => useWebSocket({ url: 'ws://localhost:3001' }));

      expect(result.current.send).toBeInstanceOf(Function);
      expect(result.current.connect).toBeInstanceOf(Function);
      expect(result.current.disconnect).toBeInstanceOf(Function);
    });
  });
});
