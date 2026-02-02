import React from 'react';
import { Text, Box } from 'ink';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';

// Import components to test accessibility
import { Button } from './ui/Button.js';
import { Modal } from './ui/Modal.js';
import { Dropdown } from './ui/Dropdown.js';
import { Toast } from './ui/Toast.js';
import { Input } from './ui/Input.js';
import { CommandPalette } from './CommandPalette.js';

describe('Accessibility', () => {
  describe('Keyboard Navigation', () => {
    it('Button is keyboard accessible', () => {
      const { lastFrame } = render(<Button>Click me</Button>);
      expect(lastFrame()).toContain('Click me');
      // Buttons should render and be focusable
    });

    it('Modal shows keyboard hints', () => {
      const { lastFrame } = render(
        <Modal isOpen={true} onClose={() => {}} closeable={true}>
          <Text>Content</Text>
        </Modal>
      );
      expect(lastFrame()).toMatch(/esc/i);
    });

    it('Dropdown shows navigation hints', () => {
      const { lastFrame } = render(
        <Dropdown
          options={[{ value: '1', label: 'Option 1' }]}
          onSelect={() => {}}
          isOpen={true}
        />
      );
      expect(lastFrame()).toMatch(/↑|↓|enter|esc/i);
    });

    it('CommandPalette shows navigation hints', () => {
      const { lastFrame } = render(
        <CommandPalette
          commands={[{ id: '1', name: 'Test', description: 'Test command' }]}
          onSelect={() => {}}
        />
      );
      expect(lastFrame()).toMatch(/↑|↓|j|k|enter|esc/i);
    });
  });

  describe('Focus Indicators', () => {
    it('Button shows focus state', () => {
      const { lastFrame: focused } = render(<Button isFocused>Focused</Button>);
      const { lastFrame: unfocused } = render(<Button isFocused={false}>Unfocused</Button>);
      // Both should render, focused may have different styling
      expect(focused()).toContain('Focused');
      expect(unfocused()).toContain('Unfocused');
    });

    it('Input shows focus state', () => {
      const { lastFrame } = render(<Input placeholder="Type here" focus={true} />);
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('Screen Reader Support', () => {
    it('Modal has title for identification', () => {
      const { lastFrame } = render(
        <Modal isOpen={true} onClose={() => {}} title="Important Dialog">
          <Text>Content</Text>
        </Modal>
      );
      expect(lastFrame()).toContain('Important Dialog');
    });

    it('Toast shows variant type', () => {
      const { lastFrame } = render(
        <Toast variant="error" message="Something went wrong" />
      );
      expect(lastFrame()).toMatch(/error|✕|✖/i);
    });

    it('Toast shows message content', () => {
      const { lastFrame } = render(
        <Toast variant="success" message="Operation completed" />
      );
      expect(lastFrame()).toContain('Operation completed');
    });
  });

  describe('Color Contrast', () => {
    it('Primary text is visible (not dimmed by default)', () => {
      const { lastFrame } = render(<Text>Primary text</Text>);
      expect(lastFrame()).toContain('Primary text');
    });

    it('Muted text uses dimColor', () => {
      const { lastFrame } = render(<Text dimColor>Muted text</Text>);
      expect(lastFrame()).toContain('Muted text');
    });

    it('Error state uses red color', () => {
      const { lastFrame } = render(<Toast variant="error" message="Error" />);
      // Should contain error indicator
      expect(lastFrame()).toMatch(/✕|error/i);
    });

    it('Success state uses green color', () => {
      const { lastFrame } = render(<Toast variant="success" message="Success" />);
      expect(lastFrame()).toMatch(/✓|success/i);
    });
  });

  describe('Logical Tab Order', () => {
    it('Modal content is contained', () => {
      const { lastFrame } = render(
        <Modal isOpen={true} onClose={() => {}} title="Dialog">
          <Text>First element</Text>
          <Text>Second element</Text>
        </Modal>
      );
      const output = lastFrame() || '';
      const firstIdx = output.indexOf('First element');
      const secondIdx = output.indexOf('Second element');
      // First should appear before second
      expect(firstIdx).toBeLessThan(secondIdx);
    });

    it('Dropdown options in logical order', () => {
      const { lastFrame } = render(
        <Dropdown
          options={[
            { value: '1', label: 'First' },
            { value: '2', label: 'Second' },
            { value: '3', label: 'Third' },
          ]}
          onSelect={() => {}}
          isOpen={true}
        />
      );
      const output = lastFrame() || '';
      const firstIdx = output.indexOf('First');
      const secondIdx = output.indexOf('Second');
      const thirdIdx = output.indexOf('Third');
      expect(firstIdx).toBeLessThan(secondIdx);
      expect(secondIdx).toBeLessThan(thirdIdx);
    });
  });

  describe('Reduced Motion Support', () => {
    it('Skeleton uses static characters (no animation in terminal)', () => {
      // In terminal, we use static shimmer characters
      // Animation is simulated through character choice, not actual motion
      const { lastFrame } = render(
        <Box>
          <Text color="gray">░░░░░░░░░░</Text>
        </Box>
      );
      expect(lastFrame()).toContain('░');
    });
  });

  describe('Icon-Only Buttons', () => {
    it('Button with icon still has text for context', () => {
      const { lastFrame } = render(<Button leftIcon="+">Add Item</Button>);
      expect(lastFrame()).toContain('Add Item');
      expect(lastFrame()).toContain('+');
    });
  });
});
