import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Header } from './Header';

describe('Header', () => {
  it('renders header element', () => {
    render(<Header />);
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(<Header title="Dashboard" />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders breadcrumbs', () => {
    render(
      <Header
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: 'My App' },
        ]}
      />
    );

    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('My App')).toBeInTheDocument();
  });

  it('renders breadcrumb links with correct hrefs', () => {
    render(
      <Header
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: 'Current' },
        ]}
      />
    );

    expect(screen.getByText('Projects').closest('a')).toHaveAttribute(
      'href',
      '/projects'
    );
    // Last item should not be a link
    expect(screen.getByText('Current').closest('a')).toBeNull();
  });

  it('renders search button', () => {
    render(<Header />);
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
  });

  it('calls onSearchClick when search button clicked', () => {
    const handleSearchClick = vi.fn();
    render(<Header onSearchClick={handleSearchClick} />);

    fireEvent.click(screen.getByLabelText('Search'));
    expect(handleSearchClick).toHaveBeenCalledTimes(1);
  });

  it('renders theme toggle button', () => {
    render(<Header />);
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });

  it('calls onThemeToggle when theme button clicked', () => {
    const handleThemeToggle = vi.fn();
    render(<Header onThemeToggle={handleThemeToggle} />);

    fireEvent.click(screen.getByTestId('theme-toggle'));
    expect(handleThemeToggle).toHaveBeenCalledTimes(1);
  });

  it('shows sun icon in dark theme', () => {
    render(<Header theme="dark" />);
    expect(screen.getByLabelText('Switch to light theme')).toBeInTheDocument();
  });

  it('shows moon icon in light theme', () => {
    render(<Header theme="light" />);
    expect(screen.getByLabelText('Switch to dark theme')).toBeInTheDocument();
  });

  it('renders mobile menu button', () => {
    render(<Header />);
    expect(screen.getByTestId('mobile-menu-button')).toBeInTheDocument();
  });

  it('calls onMobileMenuToggle when mobile menu button clicked', () => {
    const handleMobileMenuToggle = vi.fn();
    render(<Header onMobileMenuToggle={handleMobileMenuToggle} />);

    fireEvent.click(screen.getByTestId('mobile-menu-button'));
    expect(handleMobileMenuToggle).toHaveBeenCalledTimes(1);
  });

  it('renders user menu button', () => {
    render(<Header />);
    expect(screen.getByLabelText('User menu')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Header className="custom-class" />);
    expect(screen.getByTestId('header')).toHaveClass('custom-class');
  });

  it('forwards ref', () => {
    const ref = vi.fn();
    render(<Header ref={ref} />);
    expect(ref).toHaveBeenCalled();
  });
});
