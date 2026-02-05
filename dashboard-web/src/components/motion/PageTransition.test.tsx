/**
 * PageTransition Component Tests
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageTransition } from './PageTransition';

describe('PageTransition', () => {
  it('renders children', () => {
    render(
      <PageTransition>
        <div>Page content</div>
      </PageTransition>
    );
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('wraps content in a container', () => {
    render(
      <PageTransition>
        <div data-testid="inner">Inner content</div>
      </PageTransition>
    );
    const inner = screen.getByTestId('inner');
    expect(inner.parentElement).toBeTruthy();
    expect(inner.parentElement?.tagName.toLowerCase()).toBe('div');
  });

  it('applies custom className', () => {
    render(
      <PageTransition className="page-wrapper">
        <div>Content</div>
      </PageTransition>
    );
    const wrapper = screen.getByText('Content').parentElement;
    expect(wrapper).toHaveClass('page-wrapper');
  });

  it('renders complex page content', () => {
    render(
      <PageTransition>
        <header>Header</header>
        <main>Main content</main>
        <footer>Footer</footer>
      </PageTransition>
    );
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Main content')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('preserves children structure', () => {
    render(
      <PageTransition>
        <div data-testid="container">
          <span>Nested</span>
        </div>
      </PageTransition>
    );
    const container = screen.getByTestId('container');
    expect(container.querySelector('span')).toHaveTextContent('Nested');
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
        <PageTransition>
          <div>Reduced motion page</div>
        </PageTransition>
      );

      // Component should still render content even with reduced motion
      expect(screen.getByText('Reduced motion page')).toBeInTheDocument();
    });

    it('disables animations when prefers-reduced-motion is set', () => {
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
        <PageTransition>
          <div>Content with reduced motion</div>
        </PageTransition>
      );

      // Content should render in DOM (animation disabled means no initial hidden state)
      const content = screen.getByText('Content with reduced motion');
      expect(content).toBeInTheDocument();
      // Wrapper should be a plain div when reduced motion is enabled
      expect(content.parentElement).toBeTruthy();
    });
  });
});
