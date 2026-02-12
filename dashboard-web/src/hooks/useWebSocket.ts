import { useCallback, useEffect, useRef } from 'react';
import { useWebSocketStore } from '../stores/websocket.store';
import { useLogStore } from '../stores/log.store';
import type { LogEntry, LogLevel, LogType } from '../stores/log.store';

const normalizeLogLevel = (level?: string): LogLevel => {
  switch (level) {
    case 'debug':
    case 'info':
    case 'warn':
    case 'error':
      return level;
    default:
      return 'info';
  }
};

const logTypeFromMessage = (type: string): LogType | null => {
  if (!type.endsWith('-log')) return null;
  const raw = type.replace('-log', '');
  if (raw === 'app' || raw === 'test' || raw === 'git' || raw === 'system') {
    return raw as LogType;
  }
  return null;
};

export interface WebSocketMessage {
  type: string;
  payload?: unknown;
  data?: unknown;
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
  const addBatchLogs = useLogStore((state) => state.addBatchLogs);


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

        // Handle init logs
        if (message.type === 'init' && message.data) {
          const data = message.data as {
            logs?: Record<string, Array<{ text?: string; level?: string; time?: string }>>;
          };
          if (data.logs) {
            const entries: LogEntry[] = [];
            for (const [type, logs] of Object.entries(data.logs)) {
              if (type !== 'app' && type !== 'test' && type !== 'git' && type !== 'system') {
                continue;
              }
              for (const log of logs) {
                entries.push({
                  id: '',
                  text: log.text ?? '',
                  level: normalizeLogLevel(log.level),
                  timestamp: log.time ?? new Date().toISOString(),
                  type: type as LogType,
                });
              }
            }
            if (entries.length > 0) {
              addBatchLogs(entries);
            }
          }
        }

        // Handle log messages automatically
        const logType = logTypeFromMessage(message.type);
        if (logType) {
          const payload = (message.data ?? message.payload) as { data?: string; level?: string } | undefined;
          if (payload?.data) {
            addLog({
              id: '',
              text: payload.data,
              level: normalizeLogLevel(payload.level),
              timestamp: new Date().toISOString(),
              type: logType,
            });
          }
        }

        // Call user callback
        onMessageRef.current?.(message);
      } catch {
        // Non-JSON message, ignore or handle as needed
      }
    };
  }, [addLog, addBatchLogs, logTypeFromMessage, normalizeLogLevel]);

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

  // Auto-connect on mount and reconnect when URL or projectId changes
  useEffect(() => {
    if (!autoConnect) return;
    connect();
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect, url, projectId]);

  // Notify server about project scope if supported
  useEffect(() => {
    if (projectId) {
      send({ type: 'subscribe', projectId });
    }
  }, [projectId, send]);

  return {
    isConnected,
    send,
    connect,
    disconnect,
  };
}
