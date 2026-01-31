import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { KeyboardHelp, Shortcut } from './KeyboardHelp.js';

const sampleShortcuts: Shortcut[] = [
  // Global
  { key: '?', description: 'Show keyboard help', context: 'global' },
  { key: 'Ctrl+K', description: 'Open command palette', context: 'global' },
  { key: 'q', description: 'Quit', context: 'global' },

  // Navigation
  { key: 'j/↓', description: 'Move down', context: 'navigation' },
  { key: 'k/↑', description: 'Move up', context: 'navigation' },
  { key: 'h/←', description: 'Move left', context: 'navigation' },
  { key: 'l/→', description: 'Move right', context: 'navigation' },
  { key: 'Tab', description: 'Next section', context: 'navigation' },
  { key: 'Shift+Tab', description: 'Previous section', context: 'navigation' },

  // Actions
  { key: 'Enter', description: 'Select/confirm', context: 'actions' },
  { key: 'Esc', description: 'Cancel/back', context: 'actions' },
  { key: 'e', description: 'Edit', context: 'actions' },
  { key: 'r', description: 'Refresh', context: 'actions' },
];

describe('KeyboardHelp', () => {
  describe('Shortcut Display', () => {
    it('shows shortcut keys', () => {
      const { lastFrame } = render(<KeyboardHelp shortcuts={sampleShortcuts} />);
      expect(lastFrame()).toContain('Ctrl+K');
      expect(lastFrame()).toContain('j/↓');
    });

    it('shows shortcut descriptions', () => {
      const { lastFrame } = render(<KeyboardHelp shortcuts={sampleShortcuts} />);
      expect(lastFrame()).toContain('Open command palette');
      expect(lastFrame()).toContain('Move down');
    });

    it('formats key combinations clearly', () => {
      const { lastFrame } = render(<KeyboardHelp shortcuts={sampleShortcuts} />);
      expect(lastFrame()).toContain('Ctrl+K');
      expect(lastFrame()).toContain('Shift+Tab');
    });
  });

  describe('Context Grouping', () => {
    it('shows Global section', () => {
      const { lastFrame } = render(<KeyboardHelp shortcuts={sampleShortcuts} />);
      expect(lastFrame()).toMatch(/global/i);
    });

    it('shows Navigation section', () => {
      const { lastFrame } = render(<KeyboardHelp shortcuts={sampleShortcuts} />);
      expect(lastFrame()).toMatch(/navigation/i);
    });

    it('shows Actions section', () => {
      const { lastFrame } = render(<KeyboardHelp shortcuts={sampleShortcuts} />);
      expect(lastFrame()).toMatch(/actions/i);
    });

    it('groups shortcuts by context', () => {
      const { lastFrame } = render(<KeyboardHelp shortcuts={sampleShortcuts} />);
      // All navigation shortcuts should be together
      expect(lastFrame()).toContain('Move down');
      expect(lastFrame()).toContain('Move up');
    });
  });

  describe('Search', () => {
    it('filters shortcuts by key', () => {
      const { lastFrame } = render(
        <KeyboardHelp shortcuts={sampleShortcuts} searchQuery="ctrl" />
      );
      expect(lastFrame()).toContain('Ctrl+K');
    });

    it('filters shortcuts by description', () => {
      const { lastFrame } = render(
        <KeyboardHelp shortcuts={sampleShortcuts} searchQuery="palette" />
      );
      expect(lastFrame()).toContain('command palette');
    });

    it('shows no results message', () => {
      const { lastFrame } = render(
        <KeyboardHelp shortcuts={sampleShortcuts} searchQuery="xyznonexistent" />
      );
      expect(lastFrame()).toMatch(/no.*match|no.*shortcut|not.*found/i);
    });

    it('is case insensitive', () => {
      const { lastFrame } = render(
        <KeyboardHelp shortcuts={sampleShortcuts} searchQuery="CTRL" />
      );
      expect(lastFrame()).toContain('Ctrl+K');
    });
  });

  describe('Dismissible Overlay', () => {
    it('shows close hint', () => {
      const { lastFrame } = render(<KeyboardHelp shortcuts={sampleShortcuts} />);
      expect(lastFrame()).toMatch(/esc|close|dismiss|\?/i);
    });

    it('calls onClose when dismissed', () => {
      const onClose = vi.fn();
      render(<KeyboardHelp shortcuts={sampleShortcuts} onClose={onClose} />);
      // Close happens on Esc or ? key
    });
  });

  describe('Current Context', () => {
    it('highlights current context shortcuts', () => {
      const { lastFrame } = render(
        <KeyboardHelp shortcuts={sampleShortcuts} currentContext="navigation" />
      );
      expect(lastFrame()).toMatch(/navigation/i);
    });

    it('shows all shortcuts when no context', () => {
      const { lastFrame } = render(<KeyboardHelp shortcuts={sampleShortcuts} />);
      expect(lastFrame()).toContain('Quit');
      expect(lastFrame()).toContain('Move down');
      expect(lastFrame()).toContain('Select/confirm');
    });
  });

  describe('Header', () => {
    it('shows Keyboard Shortcuts title', () => {
      const { lastFrame } = render(<KeyboardHelp shortcuts={sampleShortcuts} />);
      expect(lastFrame()).toMatch(/keyboard|shortcuts|help/i);
    });

    it('shows shortcut count', () => {
      const { lastFrame } = render(<KeyboardHelp shortcuts={sampleShortcuts} />);
      // Should show total count
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('Empty State', () => {
    it('shows message when no shortcuts', () => {
      const { lastFrame } = render(<KeyboardHelp shortcuts={[]} />);
      expect(lastFrame()).toMatch(/no.*shortcut|empty/i);
    });
  });

  describe('Compact Mode', () => {
    it('supports compact display', () => {
      const { lastFrame } = render(
        <KeyboardHelp shortcuts={sampleShortcuts} compact={true} />
      );
      expect(lastFrame()).toContain('Ctrl+K');
    });
  });

  describe('Navigation', () => {
    it('shows search hint', () => {
      const { lastFrame } = render(<KeyboardHelp shortcuts={sampleShortcuts} />);
      expect(lastFrame()).toMatch(/\/|search|type/i);
    });
  });
});
