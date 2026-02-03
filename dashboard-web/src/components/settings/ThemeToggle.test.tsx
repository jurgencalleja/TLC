import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ThemeToggle } from './ThemeToggle';

describe('ThemeToggle', () => {
  it('renders toggle button', () => {
    render(<ThemeToggle theme="dark" onToggle={() => {}} />);
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });

  it('shows sun icon for dark mode', () => {
    render(<ThemeToggle theme="dark" onToggle={() => {}} />);
    expect(screen.getByTestId('sun-icon')).toBeInTheDocument();
  });

  it('shows moon icon for light mode', () => {
    render(<ThemeToggle theme="light" onToggle={() => {}} />);
    expect(screen.getByTestId('moon-icon')).toBeInTheDocument();
  });

  it('calls onToggle when clicked', () => {
    const handleToggle = vi.fn();
    render(<ThemeToggle theme="dark" onToggle={handleToggle} />);

    fireEvent.click(screen.getByTestId('theme-toggle'));
    expect(handleToggle).toHaveBeenCalled();
  });

  it('has accessible label', () => {
    render(<ThemeToggle theme="dark" onToggle={() => {}} />);
    expect(screen.getByLabelText(/switch to light mode/i)).toBeInTheDocument();
  });

  it('updates label for light mode', () => {
    render(<ThemeToggle theme="light" onToggle={() => {}} />);
    expect(screen.getByLabelText(/switch to dark mode/i)).toBeInTheDocument();
  });

  it('supports system theme option', () => {
    render(<ThemeToggle theme="system" onToggle={() => {}} />);
    expect(screen.getByTestId('system-icon')).toBeInTheDocument();
  });

  it('shows theme label when showLabel is true', () => {
    render(<ThemeToggle theme="dark" onToggle={() => {}} showLabel />);
    expect(screen.getByText('Dark')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<ThemeToggle theme="dark" onToggle={() => {}} className="custom-toggle" />);
    expect(screen.getByTestId('theme-toggle')).toHaveClass('custom-toggle');
  });
});
