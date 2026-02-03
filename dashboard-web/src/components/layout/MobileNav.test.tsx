import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { MobileNav } from './MobileNav';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('MobileNav', () => {
  it('renders bottom navigation bar', () => {
    renderWithRouter(<MobileNav />);
    expect(screen.getByTestId('mobile-nav')).toBeInTheDocument();
  });

  it('renders all navigation items', () => {
    renderWithRouter(<MobileNav />);

    expect(screen.getByLabelText('Dashboard')).toBeInTheDocument();
    expect(screen.getByLabelText('Tasks')).toBeInTheDocument();
    expect(screen.getByLabelText('Logs')).toBeInTheDocument();
    expect(screen.getByLabelText('Settings')).toBeInTheDocument();
  });

  it('highlights active item', () => {
    renderWithRouter(<MobileNav activeItem="tasks" />);

    const tasksButton = screen.getByLabelText('Tasks');
    expect(tasksButton).toHaveClass('text-primary');
  });

  it('calls onNavigate when item clicked', () => {
    const handleNavigate = vi.fn();
    renderWithRouter(<MobileNav onNavigate={handleNavigate} />);

    fireEvent.click(screen.getByLabelText('Tasks'));
    expect(handleNavigate).toHaveBeenCalledWith('tasks');
  });

  it('renders with fixed position at bottom', () => {
    renderWithRouter(<MobileNav />);
    expect(screen.getByTestId('mobile-nav')).toHaveClass('fixed', 'bottom-0');
  });

  it('has safe area padding for notched phones', () => {
    renderWithRouter(<MobileNav />);
    expect(screen.getByTestId('mobile-nav')).toHaveClass('pb-safe');
  });

  it('renders notification badge when specified', () => {
    renderWithRouter(<MobileNav notifications={{ tasks: 3 }} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('hides notification badge when count is 0', () => {
    renderWithRouter(<MobileNav notifications={{ tasks: 0 }} />);
    expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument();
  });

  it('shows 99+ for large notification counts', () => {
    renderWithRouter(<MobileNav notifications={{ tasks: 150 }} />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('renders icons for each nav item', () => {
    renderWithRouter(<MobileNav />);

    expect(screen.getByTestId('icon-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('icon-tasks')).toBeInTheDocument();
    expect(screen.getByTestId('icon-logs')).toBeInTheDocument();
    expect(screen.getByTestId('icon-settings')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    renderWithRouter(<MobileNav className="custom-nav" />);
    expect(screen.getByTestId('mobile-nav')).toHaveClass('custom-nav');
  });

  it('is hidden on desktop by default', () => {
    renderWithRouter(<MobileNav />);
    expect(screen.getByTestId('mobile-nav')).toHaveClass('md:hidden');
  });
});
