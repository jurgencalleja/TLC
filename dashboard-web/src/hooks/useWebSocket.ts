import { useCallback, useEffect, useRef } from 'react';
import { useWebSocketStore } from '../stores/websocket.store';
import { useLogStore } from '../stores/log.store';
import type { LogEntry } from '../stores/log.store';

export interface WebSocketMessage {
  type: string;
  payload?: unknown;
  projectId?: string;
}

export interface UseWebSocketOptions {
  url: string;
  autoConnect?: boolean;
  projectId?: string;
  onMessage?: (message: WebSocketMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  send: (data: unknown) => void;
  connect: () => void;
  disconnect: () => void;
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const { url, autoConnect = true, projectId, onMessage, onOpen, onClose, onError } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalCloseRef = useRef(false);
  const urlRef = useRef(url);

  // Update URL ref when it changes
  useEffect(() => {
    urlRef.current = url;
  }, [url]);

  // Store ref for projectId filter
  const projectIdRef = useRef(projectId);
  useEffect(() => {
    projectIdRef.current = projectId;
  }, [projectId]);

  // Store refs for callbacks to avoid dependency issues
  const onMessageRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage;
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
    onErrorRef.current = onError;
  }, [onMessage, onOpen, onClose, onError]);

  // Get store functions directly (stable references)
  const isConnected = useWebSocketStore((state) => state.isConnected);
  const addLog = useLogStore((state) => state.addLog);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    intentionalCloseRef.current = false;
    useWebSocketStore.getState().setStatus('connecting');

    const ws = new WebSocket(urlRef.current);
    wsRef.current = ws;

    ws.onopen = () => {
      useWebSocketStore.getState().setStatus('connected');
      onOpenRef.current?.();
    };

    ws.onclose = () => {
      useWebSocketStore.getState().setStatus('disconnected');
      onCloseRef.current?.();

      // Attempt reconnection if it wasn't intentional
      if (!intentionalCloseRef.current) {
        const state = useWebSocketStore.getState();
        if (state.shouldReconnect) {
          useWebSocketStore.getState().incrementReconnectAttempts();
          const delay = useWebSocketStore.getState().reconnectDelay;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      }
    };

    ws.onerror = (error) => {
      useWebSocketStore.getState().setError('WebSocket connection error');
      onErrorRef.current?.(error);
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;

        // Filter by projectId if a filter is active
        // Messages with a different projectId are skipped
        // Messages without projectId (workspace-level) are always processed
        if (projectIdRef.current && message.projectId && message.projectId !== projectIdRef.current) {
          return;
        }

        // Handle log messages automatically
        if (message.type === 'log' && message.payload) {
          const logEntry = message.payload as LogEntry;
          addLog(logEntry);
        }

        // Call user callback
        onMessageRef.current?.(message);
      } catch {
        // Non-JSON message, ignore or handle as needed
      }
    };
  }, [addLog]);

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    send,
    connect,
    disconnect,
  };
}
