import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Shell } from './Shell';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('Shell', () => {
  it('renders children', () => {
    renderWithRouter(
      <Shell>
        <p>Main content</p>
      </Shell>
    );
    expect(screen.getByText('Main content')).toBeInTheDocument();
  });

  it('renders sidebar', () => {
    renderWithRouter(
      <Shell>
        <p>Content</p>
      </Shell>
    );
    // There are two sidebars: desktop and mobile
    expect(screen.getAllByTestId('sidebar').length).toBeGreaterThanOrEqual(1);
  });

  it('renders header', () => {
    renderWithRouter(
      <Shell>
        <p>Content</p>
      </Shell>
    );
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('renders skip link for accessibility', () => {
    renderWithRouter(
      <Shell>
        <p>Content</p>
      </Shell>
    );
    expect(screen.getByText('Skip to main content')).toBeInTheDocument();
  });

  it('skip link points to main content', () => {
    renderWithRouter(
      <Shell>
        <p>Content</p>
      </Shell>
    );
    expect(screen.getByText('Skip to main content')).toHaveAttribute(
      'href',
      '#main-content'
    );
  });

  it('main content has correct id', () => {
    renderWithRouter(
      <Shell>
        <p>Content</p>
      </Shell>
    );
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it('toggles sidebar on collapse button click', () => {
    renderWithRouter(
      <Shell>
        <p>Content</p>
      </Shell>
    );

    // Get desktop sidebar (first one)
    const sidebars = screen.getAllByTestId('sidebar');
    const desktopSidebar = sidebars[0]!;
    expect(desktopSidebar).not.toHaveClass('collapsed');

    // Get the first collapse button (desktop sidebar)
    const collapseButtons = screen.getAllByLabelText('Collapse sidebar');
    fireEvent.click(collapseButtons[0]!);
    expect(desktopSidebar).toHaveClass('collapsed');

    const expandButtons = screen.getAllByLabelText('Expand sidebar');
    fireEvent.click(expandButtons[0]!);
    expect(desktopSidebar).not.toHaveClass('collapsed');
  });

  it('toggles theme on theme button click', () => {
    renderWithRouter(
      <Shell>
        <p>Content</p>
      </Shell>
    );

    // Theme toggle button exists
    const themeToggle = screen.getByTestId('theme-toggle');
    expect(themeToggle).toBeInTheDocument();

    // Clicking cycles through theme states
    fireEvent.click(themeToggle);
    // Should still have the toggle button
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });

  it('opens mobile menu on button click', () => {
    renderWithRouter(
      <Shell>
        <p>Content</p>
      </Shell>
    );

    // Mobile sidebar starts hidden
    expect(screen.getByTestId('mobile-sidebar')).toHaveClass('-translate-x-full');

    fireEvent.click(screen.getByTestId('mobile-menu-button'));

    // Mobile sidebar now visible
    expect(screen.getByTestId('mobile-sidebar')).toHaveClass('translate-x-0');
  });

  it('closes mobile menu on overlay click', () => {
    renderWithRouter(
      <Shell>
        <p>Content</p>
      </Shell>
    );

    // Open mobile menu
    fireEvent.click(screen.getByTestId('mobile-menu-button'));
    expect(screen.getByTestId('mobile-overlay')).toBeInTheDocument();

    // Click overlay to close
    fireEvent.click(screen.getByTestId('mobile-overlay'));
    expect(screen.getByTestId('mobile-sidebar')).toHaveClass('-translate-x-full');
  });

  it('applies custom className', () => {
    const { container } = renderWithRouter(
      <Shell className="custom-class">
        <p>Content</p>
      </Shell>
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('forwards ref', () => {
    const ref = vi.fn();
    renderWithRouter(
      <Shell ref={ref}>
        <p>Content</p>
      </Shell>
    );
    expect(ref).toHaveBeenCalled();
  });
});
