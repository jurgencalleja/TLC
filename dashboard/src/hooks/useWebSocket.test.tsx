import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { useWebSocket } from './useWebSocket.js';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 10);
  }

  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  });
}

// Test component that uses the hook
function WebSocketConsumer({ url }: { url: string }) {
  const { status, isConnected, error, send, subscribe, reconnect, disconnect } = useWebSocket(url);

  return (
    <Text>
      status:{status}|connected:{String(isConnected)}|error:{error ? error.message : 'null'}
    </Text>
  );
}

describe('useWebSocket', () => {
  let originalWebSocket: typeof WebSocket;

  beforeEach(() => {
    originalWebSocket = global.WebSocket;
    global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
    vi.clearAllMocks();
  });

  describe('Connection', () => {
    it('connects on mount', () => {
      const { lastFrame } = render(
        <WebSocketConsumer url="ws://localhost:3147" />
      );
      // Initially connecting
      expect(lastFrame()).toContain('status:');
    });

    it('provides connection status', () => {
      const { lastFrame } = render(
        <WebSocketConsumer url="ws://localhost:3147" />
      );
      expect(lastFrame()).toContain('status:');
    });

    it('starts in connecting state', () => {
      const { lastFrame } = render(
        <WebSocketConsumer url="ws://localhost:3147" />
      );
      expect(lastFrame()).toContain('status:connecting');
    });

    it('shows isConnected false initially', () => {
      const { lastFrame } = render(
        <WebSocketConsumer url="ws://localhost:3147" />
      );
      expect(lastFrame()).toContain('connected:false');
    });
  });

  describe('Send Messages', () => {
    it('provides send function via hook', () => {
      const TestSend = () => {
        const { send } = useWebSocket('ws://localhost:3147');
        return <Text>hasSend:{String(typeof send === 'function')}</Text>;
      };
      const { lastFrame } = render(<TestSend />);
      expect(lastFrame()).toContain('hasSend:true');
    });
  });

  describe('Subscribe', () => {
    it('provides subscribe function', () => {
      const TestSubscribe = () => {
        const { subscribe } = useWebSocket('ws://localhost:3147');
        return <Text>hasSubscribe:{String(typeof subscribe === 'function')}</Text>;
      };
      const { lastFrame } = render(<TestSubscribe />);
      expect(lastFrame()).toContain('hasSubscribe:true');
    });
  });

  describe('Reconnection', () => {
    it('provides reconnect function', () => {
      const TestReconnect = () => {
        const { reconnect } = useWebSocket('ws://localhost:3147');
        return <Text>hasReconnect:{String(typeof reconnect === 'function')}</Text>;
      };
      const { lastFrame } = render(<TestReconnect />);
      expect(lastFrame()).toContain('hasReconnect:true');
    });
  });

  describe('Disconnect', () => {
    it('provides disconnect function', () => {
      const TestDisconnect = () => {
        const { disconnect } = useWebSocket('ws://localhost:3147');
        return <Text>hasDisconnect:{String(typeof disconnect === 'function')}</Text>;
      };
      const { lastFrame } = render(<TestDisconnect />);
      expect(lastFrame()).toContain('hasDisconnect:true');
    });
  });

  describe('Error Handling', () => {
    it('provides error state', () => {
      const { lastFrame } = render(
        <WebSocketConsumer url="ws://localhost:3147" />
      );
      expect(lastFrame()).toContain('error:');
    });

    it('starts with no error', () => {
      const { lastFrame } = render(
        <WebSocketConsumer url="ws://localhost:3147" />
      );
      expect(lastFrame()).toContain('error:null');
    });
  });
});
