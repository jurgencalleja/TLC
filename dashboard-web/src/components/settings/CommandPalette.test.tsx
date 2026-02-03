import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CommandPalette } from './CommandPalette';

const mockCommands = [
  { id: 'new-task', label: 'New Task', shortcut: 'n', action: vi.fn() },
  { id: 'search', label: 'Search Files', shortcut: '/', action: vi.fn() },
  { id: 'settings', label: 'Open Settings', shortcut: ',', action: vi.fn() },
  { id: 'refresh', label: 'Refresh', shortcut: 'r', action: vi.fn() },
];

describe('CommandPalette', () => {
  it('renders when open', () => {
    render(<CommandPalette commands={mockCommands} open onClose={() => {}} />);
    expect(screen.getByTestId('command-palette')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<CommandPalette commands={mockCommands} open={false} onClose={() => {}} />);
    expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument();
  });

  it('shows all commands initially', () => {
    render(<CommandPalette commands={mockCommands} open onClose={() => {}} />);
    expect(screen.getByText('New Task')).toBeInTheDocument();
    expect(screen.getByText('Search Files')).toBeInTheDocument();
    expect(screen.getByText('Open Settings')).toBeInTheDocument();
  });

  it('filters commands by search query', () => {
    render(<CommandPalette commands={mockCommands} open onClose={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText(/type a command/i), {
      target: { value: 'task' },
    });

    expect(screen.getByText('New Task')).toBeInTheDocument();
    expect(screen.queryByText('Search Files')).not.toBeInTheDocument();
  });

  it('supports fuzzy search', () => {
    render(<CommandPalette commands={mockCommands} open onClose={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText(/type a command/i), {
      target: { value: 'nw tsk' },
    });

    expect(screen.getByText('New Task')).toBeInTheDocument();
  });

  it('executes command on click', () => {
    render(<CommandPalette commands={mockCommands} open onClose={() => {}} />);

    fireEvent.click(screen.getByText('New Task'));
    expect(mockCommands[0].action).toHaveBeenCalled();
  });

  it('executes command on Enter', () => {
    render(<CommandPalette commands={mockCommands} open onClose={() => {}} />);

    const input = screen.getByPlaceholderText(/type a command/i);
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockCommands[0].action).toHaveBeenCalled();
  });

  it('navigates with arrow keys', () => {
    render(<CommandPalette commands={mockCommands} open onClose={() => {}} />);

    const input = screen.getByPlaceholderText(/type a command/i);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockCommands[1].action).toHaveBeenCalled();
  });

  it('closes on Escape', () => {
    const handleClose = vi.fn();
    render(<CommandPalette commands={mockCommands} open onClose={handleClose} />);

    fireEvent.keyDown(screen.getByPlaceholderText(/type a command/i), { key: 'Escape' });
    expect(handleClose).toHaveBeenCalled();
  });

  it('shows keyboard shortcuts', () => {
    render(<CommandPalette commands={mockCommands} open onClose={() => {}} />);
    expect(screen.getByText('n')).toBeInTheDocument();
    expect(screen.getByText('/')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<CommandPalette commands={mockCommands} open onClose={() => {}} className="custom-palette" />);
    expect(screen.getByTestId('command-palette')).toHaveClass('custom-palette');
  });
});
