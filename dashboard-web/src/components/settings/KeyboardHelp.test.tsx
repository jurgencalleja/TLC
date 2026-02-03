import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { KeyboardHelp } from './KeyboardHelp';

const mockShortcuts = [
  { key: '?', description: 'Show keyboard help', category: 'General' },
  { key: 'k', description: 'Open command palette', category: 'General', modifier: '⌘' },
  { key: 'n', description: 'New task', category: 'Tasks' },
  { key: 'j', description: 'Next item', category: 'Navigation' },
  { key: 'k', description: 'Previous item', category: 'Navigation' },
];

describe('KeyboardHelp', () => {
  it('renders when open', () => {
    render(<KeyboardHelp shortcuts={mockShortcuts} open onClose={() => {}} />);
    expect(screen.getByTestId('keyboard-help')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<KeyboardHelp shortcuts={mockShortcuts} open={false} onClose={() => {}} />);
    expect(screen.queryByTestId('keyboard-help')).not.toBeInTheDocument();
  });

  it('shows all shortcuts', () => {
    render(<KeyboardHelp shortcuts={mockShortcuts} open onClose={() => {}} />);
    expect(screen.getByText('Show keyboard help')).toBeInTheDocument();
    expect(screen.getByText('New task')).toBeInTheDocument();
  });

  it('groups shortcuts by category', () => {
    render(<KeyboardHelp shortcuts={mockShortcuts} open onClose={() => {}} />);
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Navigation')).toBeInTheDocument();
  });

  it('shows modifier keys', () => {
    render(<KeyboardHelp shortcuts={mockShortcuts} open onClose={() => {}} />);
    expect(screen.getByText('⌘')).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    const handleClose = vi.fn();
    render(<KeyboardHelp shortcuts={mockShortcuts} open onClose={handleClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalled();
  });

  it('closes on backdrop click', () => {
    const handleClose = vi.fn();
    render(<KeyboardHelp shortcuts={mockShortcuts} open onClose={handleClose} />);

    fireEvent.click(screen.getByTestId('keyboard-help-backdrop'));
    expect(handleClose).toHaveBeenCalled();
  });

  it('has title', () => {
    render(<KeyboardHelp shortcuts={mockShortcuts} open onClose={() => {}} />);
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<KeyboardHelp shortcuts={mockShortcuts} open onClose={() => {}} className="custom-help" />);
    expect(screen.getByTestId('keyboard-help')).toHaveClass('custom-help');
  });
});
