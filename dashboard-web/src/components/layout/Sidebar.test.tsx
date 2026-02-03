import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('Sidebar', () => {
  it('renders navigation items', () => {
    renderWithRouter(<Sidebar />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Logs')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders logo', () => {
    renderWithRouter(<Sidebar />);
    expect(screen.getByText('T')).toBeInTheDocument();
    expect(screen.getByText('TLC')).toBeInTheDocument();
  });

  it('has correct width when expanded', () => {
    renderWithRouter(<Sidebar />);
    expect(screen.getByTestId('sidebar')).toHaveClass('w-60');
  });

  it('has collapsed class when collapsed', () => {
    renderWithRouter(<Sidebar collapsed />);
    expect(screen.getByTestId('sidebar')).toHaveClass('collapsed');
  });

  it('has narrower width when collapsed', () => {
    renderWithRouter(<Sidebar collapsed />);
    expect(screen.getByTestId('sidebar')).toHaveClass('w-16');
  });

  it('hides text labels when collapsed', () => {
    renderWithRouter(<Sidebar collapsed />);
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('TLC')).not.toBeInTheDocument();
  });

  it('calls onToggle when collapse button clicked', () => {
    const handleToggle = vi.fn();
    renderWithRouter(<Sidebar onToggle={handleToggle} />);

    fireEvent.click(screen.getByLabelText('Collapse sidebar'));
    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it('shows expand button when collapsed', () => {
    renderWithRouter(<Sidebar collapsed />);
    expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
  });

  it('shows collapse button when expanded', () => {
    renderWithRouter(<Sidebar />);
    expect(screen.getByLabelText('Collapse sidebar')).toBeInTheDocument();
  });

  it('navigation links have correct hrefs', () => {
    renderWithRouter(<Sidebar />);

    expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('href', '/');
    expect(screen.getByText('Projects').closest('a')).toHaveAttribute('href', '/projects');
    expect(screen.getByText('Tasks').closest('a')).toHaveAttribute('href', '/tasks');
    expect(screen.getByText('Logs').closest('a')).toHaveAttribute('href', '/logs');
    expect(screen.getByText('Settings').closest('a')).toHaveAttribute('href', '/settings');
  });

  it('active item has active class', () => {
    renderWithRouter(<Sidebar />);
    // Dashboard is active by default (route is /)
    expect(screen.getByText('Dashboard').closest('a')).toHaveClass('active');
  });

  it('applies custom className', () => {
    renderWithRouter(<Sidebar className="custom-class" />);
    expect(screen.getByTestId('sidebar')).toHaveClass('custom-class');
  });

  it('forwards ref', () => {
    const ref = vi.fn();
    renderWithRouter(<Sidebar ref={ref} />);
    expect(ref).toHaveBeenCalled();
  });
});
