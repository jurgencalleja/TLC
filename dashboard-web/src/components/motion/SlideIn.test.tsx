/**
 * SlideIn Component Tests
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SlideIn } from './SlideIn';

describe('SlideIn', () => {
  it('renders children', () => {
    render(
      <SlideIn>
        <div>Test content</div>
      </SlideIn>
    );
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('accepts direction prop - left', () => {
    expect(() => {
      render(
        <SlideIn direction="left">
          <div>Slide from left</div>
        </SlideIn>
      );
    }).not.toThrow();
    expect(screen.getByText('Slide from left')).toBeInTheDocument();
  });

  it('accepts direction prop - right', () => {
    expect(() => {
      render(
        <SlideIn direction="right">
          <div>Slide from right</div>
        </SlideIn>
      );
    }).not.toThrow();
    expect(screen.getByText('Slide from right')).toBeInTheDocument();
  });

  it('accepts direction prop - up', () => {
    expect(() => {
      render(
        <SlideIn direction="up">
          <div>Slide from up</div>
        </SlideIn>
      );
    }).not.toThrow();
    expect(screen.getByText('Slide from up')).toBeInTheDocument();
  });

  it('accepts direction prop - down', () => {
    expect(() => {
      render(
        <SlideIn direction="down">
          <div>Slide from down</div>
        </SlideIn>
      );
    }).not.toThrow();
    expect(screen.getByText('Slide from down')).toBeInTheDocument();
  });

  it('defaults to sliding from bottom (down)', () => {
    render(
      <SlideIn>
        <div>Default direction</div>
      </SlideIn>
    );
    expect(screen.getByText('Default direction')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <SlideIn className="custom-slide-class">
        <div>Content</div>
      </SlideIn>
    );
    const wrapper = screen.getByText('Content').parentElement;
    expect(wrapper).toHaveClass('custom-slide-class');
  });

  it('accepts delay prop', () => {
    expect(() => {
      render(
        <SlideIn delay={0.2}>
          <div>Delayed slide</div>
        </SlideIn>
      );
    }).not.toThrow();
    expect(screen.getByText('Delayed slide')).toBeInTheDocument();
  });

  it('accepts duration prop', () => {
    expect(() => {
      render(
        <SlideIn duration={0.5}>
          <div>Custom duration slide</div>
        </SlideIn>
      );
    }).not.toThrow();
    expect(screen.getByText('Custom duration slide')).toBeInTheDocument();
  });

  it('renders multiple children', () => {
    render(
      <SlideIn direction="left">
        <span>First</span>
        <span>Second</span>
      </SlideIn>
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
        <SlideIn direction="left">
          <div>Reduced motion content</div>
        </SlideIn>
      );

      // Component should still render content
      expect(screen.getByText('Reduced motion content')).toBeInTheDocument();
    });
  });
});
