import { useState, useEffect, useCallback, useRef } from 'react';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WebSocketMessage {
  type: string;
  channel?: string;
  data?: unknown;
}

export interface UseWebSocketReturn {
  status: ConnectionStatus;
  isConnected: boolean;
  error: Error | null;
  send: (message: WebSocketMessage) => void;
  subscribe: (channel: string, handler: (data: unknown) => void) => () => void;
  reconnect: () => void;
  disconnect: () => void;
}

export function useWebSocket(url: string): UseWebSocketReturn {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [error, setError] = useState<Error | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, Set<(data: unknown) => void>>>(new Map());
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    try {
      setStatus('connecting');
      setError(null);

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        setError(null);
      };

      ws.onclose = () => {
        setStatus('disconnected');
        wsRef.current = null;
      };

      ws.onerror = (event) => {
        setStatus('error');
        setError(new Error('WebSocket error'));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          const channel = message.channel || message.type;
          const handlers = handlersRef.current.get(channel);
          if (handlers) {
            handlers.forEach(handler => handler(message.data));
          }
        } catch (e) {
          // Ignore parse errors
        }
      };
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e : new Error('Failed to connect'));
    }
  }, [url]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    connect();
  }, [connect, disconnect]);

  const send = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const subscribe = useCallback((channel: string, handler: (data: unknown) => void) => {
    if (!handlersRef.current.has(channel)) {
      handlersRef.current.set(channel, new Set());
    }
    handlersRef.current.get(channel)!.add(handler);

    // Send subscribe message
    send({ type: 'subscribe', channel });

    // Return unsubscribe function
    return () => {
      const handlers = handlersRef.current.get(channel);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          handlersRef.current.delete(channel);
          send({ type: 'unsubscribe', channel });
        }
      }
    };
  }, [send]);

  // Connect on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    status,
    isConnected: status === 'connected',
    error,
    send,
    subscribe,
    reconnect,
    disconnect,
  };
}

export default useWebSocket;
