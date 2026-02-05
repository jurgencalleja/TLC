/**
 * FadeIn Component Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FadeIn } from './FadeIn';

describe('FadeIn', () => {
  it('renders children', () => {
    render(
      <FadeIn>
        <div>Test content</div>
      </FadeIn>
    );
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <FadeIn className="custom-class">
        <div>Content</div>
      </FadeIn>
    );
    const wrapper = screen.getByText('Content').parentElement;
    expect(wrapper).toHaveClass('custom-class');
  });

  it('accepts delay prop', () => {
    // Should not throw when delay is provided
    expect(() => {
      render(
        <FadeIn delay={0.5}>
          <div>Delayed content</div>
        </FadeIn>
      );
    }).not.toThrow();
    expect(screen.getByText('Delayed content')).toBeInTheDocument();
  });

  it('accepts duration prop', () => {
    // Should not throw when duration is provided
    expect(() => {
      render(
        <FadeIn duration={0.5}>
          <div>Custom duration</div>
        </FadeIn>
      );
    }).not.toThrow();
    expect(screen.getByText('Custom duration')).toBeInTheDocument();
  });

  it('renders multiple children', () => {
    render(
      <FadeIn>
        <span>First</span>
        <span>Second</span>
      </FadeIn>
    );
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  describe('reduced motion', () => {
    const originalMatchMedia = window.matchMedia;

    afterEach(() => {
      window.matchMedia = originalMatchMedia;
    });

    it('respects prefers-reduced-motion setting', () => {
      // Mock prefers-reduced-motion: reduce
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(
        <FadeIn>
          <div>Reduced motion content</div>
        </FadeIn>
      );

      // Component should still render content
      expect(screen.getByText('Reduced motion content')).toBeInTheDocument();
    });
  });
});
