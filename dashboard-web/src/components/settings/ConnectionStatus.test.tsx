import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConnectionStatus } from './ConnectionStatus';

describe('ConnectionStatus', () => {
  it('shows connected state', () => {
    render(<ConnectionStatus status="connected" />);
    expect(screen.getByTestId('connection-indicator')).toHaveClass('bg-success');
  });

  it('shows disconnected state', () => {
    render(<ConnectionStatus status="disconnected" />);
    expect(screen.getByTestId('connection-indicator')).toHaveClass('bg-error');
  });

  it('shows connecting state', () => {
    render(<ConnectionStatus status="connecting" />);
    expect(screen.getByTestId('connection-indicator')).toHaveClass('bg-warning');
  });

  it('shows reconnecting state', () => {
    render(<ConnectionStatus status="reconnecting" />);
    expect(screen.getByTestId('connection-indicator')).toHaveClass('animate-pulse');
  });

  it('displays status text when showLabel is true', () => {
    render(<ConnectionStatus status="connected" showLabel />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('hides label by default', () => {
    render(<ConnectionStatus status="connected" />);
    expect(screen.queryByText('Connected')).not.toBeInTheDocument();
  });

  it('shows tooltip on hover', async () => {
    render(<ConnectionStatus status="connected" />);
    const indicator = screen.getByTestId('connection-status');

    fireEvent.mouseEnter(indicator);
    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });

  it('shows retry button when disconnected', () => {
    render(<ConnectionStatus status="disconnected" onRetry={() => {}} />);
    expect(screen.getByLabelText('Retry connection')).toBeInTheDocument();
  });

  it('calls onRetry when retry button clicked', () => {
    const handleRetry = vi.fn();
    render(<ConnectionStatus status="disconnected" onRetry={handleRetry} />);

    fireEvent.click(screen.getByLabelText('Retry connection'));
    expect(handleRetry).toHaveBeenCalled();
  });

  it('shows last connected time', () => {
    const lastConnected = new Date().toISOString();
    render(<ConnectionStatus status="disconnected" lastConnected={lastConnected} showLabel />);
    expect(screen.getByText(/last connected/i)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<ConnectionStatus status="connected" className="custom-status" />);
    expect(screen.getByTestId('connection-status')).toHaveClass('custom-status');
  });
});
