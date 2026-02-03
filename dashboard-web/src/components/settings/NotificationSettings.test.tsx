import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NotificationSettings } from './NotificationSettings';

const mockSettings = {
  enabled: true,
  sound: true,
  taskUpdates: true,
  testResults: true,
  teamActivity: false,
  deployments: true,
};

describe('NotificationSettings', () => {
  it('renders notification toggles', () => {
    render(<NotificationSettings settings={mockSettings} onChange={() => {}} />);
    expect(screen.getByTestId('notification-settings')).toBeInTheDocument();
  });

  it('displays current settings', () => {
    render(<NotificationSettings settings={mockSettings} onChange={() => {}} />);
    expect(screen.getByLabelText(/task updates/i)).toBeChecked();
    expect(screen.getByLabelText(/team activity/i)).not.toBeChecked();
  });

  it('calls onChange when toggled', () => {
    const handleChange = vi.fn();
    render(<NotificationSettings settings={mockSettings} onChange={handleChange} />);

    fireEvent.click(screen.getByLabelText(/team activity/i));
    expect(handleChange).toHaveBeenCalledWith(expect.objectContaining({
      teamActivity: true,
    }));
  });

  it('has master toggle for all notifications', () => {
    render(<NotificationSettings settings={mockSettings} onChange={() => {}} />);
    expect(screen.getByLabelText(/enable notifications/i)).toBeInTheDocument();
  });

  it('disables all toggles when notifications disabled', () => {
    render(<NotificationSettings settings={{ ...mockSettings, enabled: false }} onChange={() => {}} />);
    expect(screen.getByLabelText(/task updates/i)).toBeDisabled();
  });

  it('has sound toggle', () => {
    render(<NotificationSettings settings={mockSettings} onChange={() => {}} />);
    expect(screen.getByLabelText(/notification sound/i)).toBeInTheDocument();
  });

  it('shows description for each setting', () => {
    render(<NotificationSettings settings={mockSettings} onChange={() => {}} />);
    expect(screen.getByText(/when tasks are claimed or completed/i)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<NotificationSettings settings={mockSettings} onChange={() => {}} className="custom-notifications" />);
    expect(screen.getByTestId('notification-settings')).toHaveClass('custom-notifications');
  });
});
