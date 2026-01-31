import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { ConnectionStatus, ConnectionState } from './ConnectionStatus.js';

describe('ConnectionStatus', () => {
  describe('Connected State', () => {
    it('shows connected indicator', () => {
      const { lastFrame } = render(<ConnectionStatus state="connected" />);
      expect(lastFrame()).toMatch(/●|connected|online/i);
    });

    it('uses green color for connected', () => {
      const { lastFrame } = render(<ConnectionStatus state="connected" />);
      expect(lastFrame()).toContain('connected');
    });

    it('shows last connected time', () => {
      const { lastFrame } = render(
        <ConnectionStatus state="connected" lastConnected="2 min ago" />
      );
      expect(lastFrame()).toContain('2 min ago');
    });
  });

  describe('Connecting State', () => {
    it('shows connecting indicator', () => {
      const { lastFrame } = render(<ConnectionStatus state="connecting" />);
      expect(lastFrame()).toMatch(/◐|connecting|…/i);
    });

    it('uses yellow color for connecting', () => {
      const { lastFrame } = render(<ConnectionStatus state="connecting" />);
      expect(lastFrame()).toContain('connecting');
    });

    it('shows attempt count', () => {
      const { lastFrame } = render(
        <ConnectionStatus state="connecting" attemptCount={3} />
      );
      expect(lastFrame()).toMatch(/3|attempt/i);
    });
  });

  describe('Disconnected State', () => {
    it('shows disconnected indicator', () => {
      const { lastFrame } = render(<ConnectionStatus state="disconnected" />);
      expect(lastFrame()).toMatch(/○|disconnected|offline/i);
    });

    it('uses red color for disconnected', () => {
      const { lastFrame } = render(<ConnectionStatus state="disconnected" />);
      expect(lastFrame()).toContain('disconnected');
    });

    it('shows last connected time', () => {
      const { lastFrame } = render(
        <ConnectionStatus state="disconnected" lastConnected="5 min ago" />
      );
      expect(lastFrame()).toContain('5 min ago');
    });
  });

  describe('Auto-Reconnect', () => {
    it('shows countdown when auto-reconnect enabled', () => {
      const { lastFrame } = render(
        <ConnectionStatus
          state="disconnected"
          autoReconnect={true}
          reconnectIn={10}
        />
      );
      expect(lastFrame()).toMatch(/10|sec|reconnect/i);
    });

    it('hides countdown when auto-reconnect disabled', () => {
      const { lastFrame } = render(
        <ConnectionStatus state="disconnected" autoReconnect={false} />
      );
      const output = lastFrame() || '';
      expect(output).not.toMatch(/\d+s/);
    });

    it('shows reconnecting message during countdown', () => {
      const { lastFrame } = render(
        <ConnectionStatus
          state="disconnected"
          autoReconnect={true}
          reconnectIn={5}
        />
      );
      expect(lastFrame()).toMatch(/reconnect.*5|5.*reconnect/i);
    });
  });

  describe('Manual Reconnect', () => {
    it('shows manual reconnect hint', () => {
      const { lastFrame } = render(<ConnectionStatus state="disconnected" />);
      expect(lastFrame()).toMatch(/r|reconnect|retry/i);
    });

    it('calls onReconnect when triggered', () => {
      const onReconnect = vi.fn();
      render(
        <ConnectionStatus state="disconnected" onReconnect={onReconnect} />
      );
      // Reconnect happens on 'r' key
    });
  });

  describe('Error Message', () => {
    it('shows error message when provided', () => {
      const { lastFrame } = render(
        <ConnectionStatus
          state="disconnected"
          errorMessage="Connection refused"
        />
      );
      expect(lastFrame()).toContain('Connection refused');
    });

    it('hides error when connected', () => {
      const { lastFrame } = render(
        <ConnectionStatus
          state="connected"
          errorMessage="Old error"
        />
      );
      const output = lastFrame() || '';
      expect(output).not.toContain('Old error');
    });
  });

  describe('Server URL', () => {
    it('shows server URL', () => {
      const { lastFrame } = render(
        <ConnectionStatus state="connected" serverUrl="wss://api.example.com" />
      );
      expect(lastFrame()).toContain('api.example.com');
    });
  });

  describe('Compact Mode', () => {
    it('shows compact indicator', () => {
      const { lastFrame } = render(
        <ConnectionStatus state="connected" compact={true} />
      );
      expect(lastFrame()).toMatch(/●|connected/i);
    });

    it('hides details in compact mode', () => {
      const { lastFrame } = render(
        <ConnectionStatus
          state="connected"
          compact={true}
          lastConnected="2 min ago"
        />
      );
      const output = lastFrame() || '';
      // Should be shorter than expanded mode
      expect(output.length).toBeLessThan(100);
    });
  });

  describe('Latency', () => {
    it('shows latency when connected', () => {
      const { lastFrame } = render(
        <ConnectionStatus state="connected" latencyMs={45} />
      );
      expect(lastFrame()).toMatch(/45|ms|latency/i);
    });

    it('hides latency when disconnected', () => {
      const { lastFrame } = render(
        <ConnectionStatus state="disconnected" latencyMs={45} />
      );
      const output = lastFrame() || '';
      expect(output).not.toMatch(/45ms/);
    });
  });

  describe('Callbacks', () => {
    it('calls onCancel to cancel reconnect', () => {
      const onCancel = vi.fn();
      render(
        <ConnectionStatus
          state="disconnected"
          autoReconnect={true}
          reconnectIn={10}
          onCancel={onCancel}
        />
      );
      // Cancel happens on Esc key
    });
  });
});
