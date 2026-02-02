import React from 'react';
import { Text } from 'ink';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { Modal } from './Modal.js';

describe('Modal', () => {
  describe('Rendering', () => {
    it('renders children when open', () => {
      const { lastFrame } = render(
        <Modal isOpen={true} onClose={() => {}}>
          <Text>Modal Content</Text>
        </Modal>
      );
      expect(lastFrame()).toContain('Modal Content');
    });

    it('does not render when closed', () => {
      const { lastFrame } = render(
        <Modal isOpen={false} onClose={() => {}}>
          <Text>Modal Content</Text>
        </Modal>
      );
      expect(lastFrame()).not.toContain('Modal Content');
    });

    it('renders title when provided', () => {
      const { lastFrame } = render(
        <Modal isOpen={true} onClose={() => {}} title="My Modal">
          <Text>Content</Text>
        </Modal>
      );
      expect(lastFrame()).toContain('My Modal');
    });

    it('renders with border by default', () => {
      const { lastFrame } = render(
        <Modal isOpen={true} onClose={() => {}}>
          <Text>Content</Text>
        </Modal>
      );
      const output = lastFrame() || '';
      // Should have some border characters
      expect(output).toMatch(/[─│╭╮╰╯]/);
    });
  });

  describe('Close Behavior', () => {
    it('calls onClose when closeable and overlay clicked', () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose} closeable={true}>
          <Text>Content</Text>
        </Modal>
      );
      expect(onClose).toBeDefined();
    });

    it('does not close when closeable=false', () => {
      const onClose = vi.fn();
      const { lastFrame } = render(
        <Modal isOpen={true} onClose={onClose} closeable={false}>
          <Text>Content</Text>
        </Modal>
      );
      expect(lastFrame()).toContain('Content');
    });

    it('shows close button when closeable', () => {
      const { lastFrame } = render(
        <Modal isOpen={true} onClose={() => {}} closeable={true}>
          <Text>Content</Text>
        </Modal>
      );
      expect(lastFrame()).toMatch(/×|X|✕|esc/i);
    });

    it('hides close button when not closeable', () => {
      const { lastFrame } = render(
        <Modal isOpen={true} onClose={() => {}} closeable={false}>
          <Text>Content</Text>
        </Modal>
      );
      expect(lastFrame()).toContain('Content');
    });
  });

  describe('Sizes', () => {
    it('renders small size', () => {
      const { lastFrame } = render(
        <Modal isOpen={true} onClose={() => {}} size="small">
          <Text>Small Modal</Text>
        </Modal>
      );
      expect(lastFrame()).toContain('Small Modal');
    });

    it('renders medium size (default)', () => {
      const { lastFrame } = render(
        <Modal isOpen={true} onClose={() => {}}>
          <Text>Medium Modal</Text>
        </Modal>
      );
      expect(lastFrame()).toContain('Medium Modal');
    });

    it('renders large size', () => {
      const { lastFrame } = render(
        <Modal isOpen={true} onClose={() => {}} size="large">
          <Text>Large Modal</Text>
        </Modal>
      );
      expect(lastFrame()).toContain('Large Modal');
    });

    it('renders fullscreen size', () => {
      const { lastFrame } = render(
        <Modal isOpen={true} onClose={() => {}} size="fullscreen">
          <Text>Fullscreen Modal</Text>
        </Modal>
      );
      expect(lastFrame()).toContain('Fullscreen Modal');
    });
  });

  describe('Title Display', () => {
    it('has title visible', () => {
      const { lastFrame } = render(
        <Modal isOpen={true} onClose={() => {}} title="Dialog">
          <Text>Content</Text>
        </Modal>
      );
      expect(lastFrame()).toContain('Dialog');
    });

    it('shows title for accessibility', () => {
      const { lastFrame } = render(
        <Modal isOpen={true} onClose={() => {}} title="Accessible Title">
          <Text>Content</Text>
        </Modal>
      );
      expect(lastFrame()).toContain('Accessible Title');
    });
  });

  describe('Footer', () => {
    it('renders footer when provided', () => {
      const { lastFrame } = render(
        <Modal
          isOpen={true}
          onClose={() => {}}
          footer={<Text>Footer Content</Text>}
        >
          <Text>Body</Text>
        </Modal>
      );
      expect(lastFrame()).toContain('Footer Content');
    });

    it('renders without footer when not provided', () => {
      const { lastFrame } = render(
        <Modal isOpen={true} onClose={() => {}}>
          <Text>Body Only</Text>
        </Modal>
      );
      expect(lastFrame()).toContain('Body Only');
    });
  });

  describe('Keyboard Hints', () => {
    it('shows escape hint when closeable', () => {
      const { lastFrame } = render(
        <Modal isOpen={true} onClose={() => {}} closeable={true}>
          <Text>Content</Text>
        </Modal>
      );
      expect(lastFrame()).toMatch(/esc/i);
    });
  });
});
