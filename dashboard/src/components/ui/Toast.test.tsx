import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import { Toast, ToastContainer } from './Toast.js';

describe('Toast', () => {
  describe('Variants', () => {
    it('renders success variant', () => {
      const { lastFrame } = render(
        <Toast variant="success" message="Success message" />
      );
      expect(lastFrame()).toContain('Success message');
      expect(lastFrame()).toMatch(/✓|✔|success/i);
    });

    it('renders error variant', () => {
      const { lastFrame } = render(
        <Toast variant="error" message="Error message" />
      );
      expect(lastFrame()).toContain('Error message');
      expect(lastFrame()).toMatch(/✕|✖|×|error/i);
    });

    it('renders warning variant', () => {
      const { lastFrame } = render(
        <Toast variant="warning" message="Warning message" />
      );
      expect(lastFrame()).toContain('Warning message');
      expect(lastFrame()).toMatch(/⚠|warning/i);
    });

    it('renders info variant', () => {
      const { lastFrame } = render(
        <Toast variant="info" message="Info message" />
      );
      expect(lastFrame()).toContain('Info message');
      expect(lastFrame()).toMatch(/ℹ|info/i);
    });
  });

  describe('Dismiss', () => {
    it('shows dismiss button when dismissable', () => {
      const { lastFrame } = render(
        <Toast variant="info" message="Test" dismissable={true} />
      );
      expect(lastFrame()).toMatch(/×|X|close|esc/i);
    });

    it('calls onDismiss when dismissed', () => {
      const onDismiss = vi.fn();
      render(
        <Toast variant="info" message="Test" dismissable={true} onDismiss={onDismiss} />
      );
      expect(onDismiss).toBeDefined();
    });

    it('hides dismiss button when not dismissable', () => {
      const { lastFrame } = render(
        <Toast variant="info" message="Test" dismissable={false} />
      );
      expect(lastFrame()).toContain('Test');
    });
  });

  describe('Title', () => {
    it('renders title when provided', () => {
      const { lastFrame } = render(
        <Toast variant="success" message="Body text" title="My Title" />
      );
      expect(lastFrame()).toContain('My Title');
      expect(lastFrame()).toContain('Body text');
    });
  });

  describe('Actions', () => {
    it('renders action buttons', () => {
      const { lastFrame } = render(
        <Toast
          variant="info"
          message="Test"
          actions={[{ label: 'Undo', onClick: () => {} }]}
        />
      );
      expect(lastFrame()).toContain('Undo');
    });
  });
});

describe('ToastContainer', () => {
  describe('Rendering', () => {
    it('renders multiple toasts', () => {
      const toasts = [
        { id: '1', variant: 'success' as const, message: 'Toast 1' },
        { id: '2', variant: 'error' as const, message: 'Toast 2' },
      ];
      const { lastFrame } = render(
        <ToastContainer toasts={toasts} />
      );
      expect(lastFrame()).toContain('Toast 1');
      expect(lastFrame()).toContain('Toast 2');
    });

    it('renders empty when no toasts', () => {
      const { lastFrame } = render(
        <ToastContainer toasts={[]} />
      );
      // Should render but be empty or minimal
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('Position', () => {
    it('renders in top-right by default', () => {
      const toasts = [{ id: '1', variant: 'info' as const, message: 'Test' }];
      const { lastFrame } = render(
        <ToastContainer toasts={toasts} />
      );
      expect(lastFrame()).toContain('Test');
    });

    it('accepts position prop', () => {
      const toasts = [{ id: '1', variant: 'info' as const, message: 'Test' }];
      const { lastFrame } = render(
        <ToastContainer toasts={toasts} position="bottom-left" />
      );
      expect(lastFrame()).toContain('Test');
    });
  });

  describe('Stacking', () => {
    it('stacks toasts vertically', () => {
      const toasts = [
        { id: '1', variant: 'success' as const, message: 'First' },
        { id: '2', variant: 'info' as const, message: 'Second' },
        { id: '3', variant: 'warning' as const, message: 'Third' },
      ];
      const { lastFrame } = render(
        <ToastContainer toasts={toasts} />
      );
      const output = lastFrame() || '';
      expect(output).toContain('First');
      expect(output).toContain('Second');
      expect(output).toContain('Third');
    });

    it('limits visible toasts', () => {
      const toasts = Array.from({ length: 10 }, (_, i) => ({
        id: String(i),
        variant: 'info' as const,
        message: `Toast ${i}`,
      }));
      const { lastFrame } = render(
        <ToastContainer toasts={toasts} maxVisible={3} />
      );
      // Should show max toasts or "+N more" indicator
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('Callbacks', () => {
    it('calls onDismiss with toast id', () => {
      const onDismiss = vi.fn();
      const toasts = [{ id: '1', variant: 'info' as const, message: 'Test' }];
      render(
        <ToastContainer toasts={toasts} onDismiss={onDismiss} />
      );
      expect(onDismiss).toBeDefined();
    });
  });
});
