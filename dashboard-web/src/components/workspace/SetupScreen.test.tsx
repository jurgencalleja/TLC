import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SetupScreen } from './SetupScreen';

const defaultProps = {
  onScan: vi.fn().mockResolvedValue(undefined),
  onScanComplete: vi.fn(),
  isScanning: false,
  error: null as string | null,
};

describe('SetupScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders welcome message and input', () => {
    render(<SetupScreen {...defaultProps} />);
    expect(screen.getByTestId('welcome-message')).toBeInTheDocument();
    expect(screen.getByTestId('root-path-input')).toBeInTheDocument();
  });

  it('accepts path input', () => {
    render(<SetupScreen {...defaultProps} />);
    const input = screen.getByTestId('root-path-input');
    fireEvent.change(input, { target: { value: '~/Projects' } });
    expect(input).toHaveValue('~/Projects');
  });

  it('"Add Root" button adds path to list', () => {
    render(<SetupScreen {...defaultProps} />);
    const input = screen.getByTestId('root-path-input');
    const addButton = screen.getByTestId('add-root-button');

    fireEvent.change(input, { target: { value: '~/Projects' } });
    fireEvent.click(addButton);

    expect(screen.getByTestId('root-list')).toBeInTheDocument();
    expect(screen.getByText('~/Projects')).toBeInTheDocument();
  });

  it('shows validation error for empty path', () => {
    render(<SetupScreen {...defaultProps} />);
    const addButton = screen.getByTestId('add-root-button');

    fireEvent.click(addButton);

    expect(screen.getByTestId('validation-error')).toBeInTheDocument();
    expect(screen.getByTestId('validation-error')).toHaveTextContent(/enter a path/i);
  });

  it('remove button removes root from list', () => {
    render(<SetupScreen {...defaultProps} />);
    const input = screen.getByTestId('root-path-input');
    const addButton = screen.getByTestId('add-root-button');

    // Add a root
    fireEvent.change(input, { target: { value: '~/Projects' } });
    fireEvent.click(addButton);
    expect(screen.getByText('~/Projects')).toBeInTheDocument();

    // Remove it
    const removeButton = screen.getByTestId('remove-root-0');
    fireEvent.click(removeButton);
    expect(screen.queryByText('~/Projects')).not.toBeInTheDocument();
  });

  it('"Scan Projects" button calls onScan with roots', async () => {
    const onScan = vi.fn().mockResolvedValue(undefined);
    render(<SetupScreen {...defaultProps} onScan={onScan} />);
    const input = screen.getByTestId('root-path-input');
    const addButton = screen.getByTestId('add-root-button');

    // Add a root
    fireEvent.change(input, { target: { value: '~/Projects' } });
    fireEvent.click(addButton);

    // Click scan
    const scanButton = screen.getByTestId('scan-button');
    fireEvent.click(scanButton);

    expect(onScan).toHaveBeenCalledWith(['~/Projects']);
  });

  it('shows scanning state during scan', () => {
    render(<SetupScreen {...defaultProps} isScanning={true} />);
    expect(screen.getByTestId('scan-spinner')).toBeInTheDocument();
  });

  it('calls onScanComplete on successful scan', async () => {
    const onScan = vi.fn().mockResolvedValue(undefined);
    const onScanComplete = vi.fn();
    render(
      <SetupScreen
        {...defaultProps}
        onScan={onScan}
        onScanComplete={onScanComplete}
      />,
    );
    const input = screen.getByTestId('root-path-input');
    const addButton = screen.getByTestId('add-root-button');

    // Add a root
    fireEvent.change(input, { target: { value: '~/Projects' } });
    fireEvent.click(addButton);

    // Click scan
    const scanButton = screen.getByTestId('scan-button');
    fireEvent.click(scanButton);

    await waitFor(() => {
      expect(onScanComplete).toHaveBeenCalledTimes(1);
    });
  });

  it('shows error message on scan failure', () => {
    render(<SetupScreen {...defaultProps} error="Scan failed: network error" />);
    expect(screen.getByTestId('scan-error')).toBeInTheDocument();
    expect(screen.getByTestId('scan-error')).toHaveTextContent('Scan failed: network error');
  });

  it('multiple roots can be added', () => {
    render(<SetupScreen {...defaultProps} />);
    const input = screen.getByTestId('root-path-input');
    const addButton = screen.getByTestId('add-root-button');

    fireEvent.change(input, { target: { value: '~/Projects' } });
    fireEvent.click(addButton);

    fireEvent.change(input, { target: { value: '~/Work' } });
    fireEvent.click(addButton);

    fireEvent.change(input, { target: { value: '/opt/repos' } });
    fireEvent.click(addButton);

    expect(screen.getByText('~/Projects')).toBeInTheDocument();
    expect(screen.getByText('~/Work')).toBeInTheDocument();
    expect(screen.getByText('/opt/repos')).toBeInTheDocument();
  });

  it('keyboard: Enter in input adds root', () => {
    render(<SetupScreen {...defaultProps} />);
    const input = screen.getByTestId('root-path-input');

    fireEvent.change(input, { target: { value: '~/Projects' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(screen.getByText('~/Projects')).toBeInTheDocument();
  });

  it('accessible: input has label, buttons have accessible names', () => {
    render(<SetupScreen {...defaultProps} />);

    // Input should be labeled
    const input = screen.getByLabelText(/root folder path/i);
    expect(input).toBeInTheDocument();

    // Buttons should have accessible names
    const addButton = screen.getByTestId('add-root-button');
    expect(addButton).toHaveAccessibleName();

    const scanButton = screen.getByTestId('scan-button');
    expect(scanButton).toHaveAccessibleName();
  });

  it('clears input after adding a root', () => {
    render(<SetupScreen {...defaultProps} />);
    const input = screen.getByTestId('root-path-input');
    const addButton = screen.getByTestId('add-root-button');

    fireEvent.change(input, { target: { value: '~/Projects' } });
    fireEvent.click(addButton);

    expect(input).toHaveValue('');
  });

  it('clears validation error after typing', () => {
    render(<SetupScreen {...defaultProps} />);
    const input = screen.getByTestId('root-path-input');
    const addButton = screen.getByTestId('add-root-button');

    // Trigger validation error
    fireEvent.click(addButton);
    expect(screen.getByTestId('validation-error')).toBeInTheDocument();

    // Type something - error should clear
    fireEvent.change(input, { target: { value: '~' } });
    expect(screen.queryByTestId('validation-error')).not.toBeInTheDocument();
  });

  it('does not show error when no error prop', () => {
    render(<SetupScreen {...defaultProps} error={null} />);
    expect(screen.queryByTestId('scan-error')).not.toBeInTheDocument();
  });

  it('scan button disabled when no roots added', () => {
    render(<SetupScreen {...defaultProps} />);
    const scanButton = screen.getByTestId('scan-button');
    expect(scanButton).toBeDisabled();
  });

  it('scan button disabled during scanning', () => {
    render(<SetupScreen {...defaultProps} isScanning={true} />);
    const scanButton = screen.getByTestId('scan-button');
    expect(scanButton).toBeDisabled();
  });

  it('does not add duplicate roots', () => {
    render(<SetupScreen {...defaultProps} />);
    const input = screen.getByTestId('root-path-input');
    const addButton = screen.getByTestId('add-root-button');

    fireEvent.change(input, { target: { value: '~/Projects' } });
    fireEvent.click(addButton);

    fireEvent.change(input, { target: { value: '~/Projects' } });
    fireEvent.click(addButton);

    // Should only appear once in the list
    const rootItems = screen.getAllByTestId(/^root-item-/);
    expect(rootItems).toHaveLength(1);
  });
});
