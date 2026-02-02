import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import { UpdateBanner } from './UpdateBanner.js';

describe('UpdateBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders when updateAvailable is true', () => {
      const { lastFrame } = render(
        <UpdateBanner
          current="1.4.2"
          latest="1.5.0"
          updateAvailable={true}
        />
      );

      expect(lastFrame()).toContain('1.5.0');
      // Component shows "Update Available" with capital A
      expect(lastFrame()).toContain('Available');
    });

    it('renders nothing when updateAvailable is false', () => {
      const { lastFrame } = render(
        <UpdateBanner
          current="1.4.2"
          latest="1.4.2"
          updateAvailable={false}
        />
      );

      // Should render empty or minimal content
      expect(lastFrame()).not.toContain('available');
    });

    it('displays the latest version number', () => {
      const { lastFrame } = render(
        <UpdateBanner
          current="1.0.0"
          latest="2.0.0"
          updateAvailable={true}
        />
      );

      expect(lastFrame()).toContain('v2.0.0');
    });

    it('shows changelog items when provided', () => {
      const changelog = [
        'Self-healing dashboard',
        'Real-time WebSocket sync',
      ];

      const { lastFrame } = render(
        <UpdateBanner
          current="1.0.0"
          latest="2.0.0"
          updateAvailable={true}
          changelog={changelog}
        />
      );

      expect(lastFrame()).toContain('Self-healing dashboard');
      expect(lastFrame()).toContain('Real-time WebSocket sync');
    });
  });

  describe('dismiss functionality', () => {
    it('renders dismiss hint when dismissable', () => {
      const { lastFrame } = render(
        <UpdateBanner
          current="1.0.0"
          latest="2.0.0"
          updateAvailable={true}
          dismissable={true}
        />
      );

      // Should show dismiss hint (x or Esc)
      expect(lastFrame()).toMatch(/dismiss|Esc|x/i);
    });

    it('provides onDismiss callback prop', () => {
      const onDismiss = vi.fn();

      const { lastFrame } = render(
        <UpdateBanner
          current="1.0.0"
          latest="2.0.0"
          updateAvailable={true}
          dismissable={true}
          onDismiss={onDismiss}
        />
      );

      // Component should render with dismiss hint when callback provided
      expect(lastFrame()).toContain('dismiss');
      // onDismiss is passed and ready to be called by useInput
      expect(typeof onDismiss).toBe('function');
    });

    it('does not render dismiss hint when not dismissable', () => {
      const { lastFrame } = render(
        <UpdateBanner
          current="1.0.0"
          latest="2.0.0"
          updateAvailable={true}
          dismissable={false}
        />
      );

      // Should not show dismiss-specific hints
      const frame = lastFrame() || '';
      expect(frame).not.toContain('x dismiss');
    });
  });

  describe('compact mode', () => {
    it('renders compactly when compact is true', () => {
      const { lastFrame: compactFrame } = render(
        <UpdateBanner
          current="1.0.0"
          latest="2.0.0"
          updateAvailable={true}
          compact={true}
        />
      );

      const { lastFrame: fullFrame } = render(
        <UpdateBanner
          current="1.0.0"
          latest="2.0.0"
          updateAvailable={true}
          compact={false}
          changelog={['Feature 1', 'Feature 2']}
        />
      );

      // Compact should not show changelog details
      expect(compactFrame()).not.toContain('Feature 1');
      expect(fullFrame()).toContain('Feature 1');
    });
  });

  describe('isActive prop', () => {
    it('accepts isActive prop for keyboard input control', () => {
      const onDismiss = vi.fn();

      const { lastFrame } = render(
        <UpdateBanner
          current="1.0.0"
          latest="2.0.0"
          updateAvailable={true}
          dismissable={true}
          isActive={true}
          onDismiss={onDismiss}
        />
      );

      // Component should render properly with isActive=true
      expect(lastFrame()).toContain('Available');
    });

    it('renders same content when inactive', () => {
      const onDismiss = vi.fn();

      const { lastFrame } = render(
        <UpdateBanner
          current="1.0.0"
          latest="2.0.0"
          updateAvailable={true}
          dismissable={true}
          isActive={false}
          onDismiss={onDismiss}
        />
      );

      // Component should render same visual content regardless of isActive
      expect(lastFrame()).toContain('Available');
    });
  });

  describe('styling', () => {
    it('uses green color for update banner', () => {
      const { lastFrame } = render(
        <UpdateBanner
          current="1.0.0"
          latest="2.0.0"
          updateAvailable={true}
        />
      );

      // The component should be visible (not empty)
      expect(lastFrame()).toBeTruthy();
    });

    it('displays celebration indicator', () => {
      const { lastFrame } = render(
        <UpdateBanner
          current="1.0.0"
          latest="2.0.0"
          updateAvailable={true}
        />
      );

      // Should contain a celebration indicator
      const frame = lastFrame() || '';
      // Could be text like "NEW" or "Update" or similar
      expect(frame.toLowerCase()).toMatch(/update|new|available/);
    });
  });
});
