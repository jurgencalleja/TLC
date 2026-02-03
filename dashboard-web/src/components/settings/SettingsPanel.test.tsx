import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SettingsPanel } from './SettingsPanel';

const mockConfig = {
  project: 'my-app',
  testFrameworks: {
    primary: 'vitest',
  },
  quality: {
    coverageThreshold: 80,
    qualityScoreThreshold: 75,
  },
};

describe('SettingsPanel', () => {
  it('renders settings form', () => {
    render(<SettingsPanel config={mockConfig} onSave={() => {}} />);
    expect(screen.getByTestId('settings-panel')).toBeInTheDocument();
  });

  it('displays current config values', () => {
    render(<SettingsPanel config={mockConfig} onSave={() => {}} />);
    expect(screen.getByDisplayValue('my-app')).toBeInTheDocument();
    expect(screen.getByDisplayValue('80')).toBeInTheDocument();
  });

  it('calls onSave with updated config', () => {
    const handleSave = vi.fn();
    render(<SettingsPanel config={mockConfig} onSave={handleSave} />);

    fireEvent.change(screen.getByLabelText(/coverage threshold/i), {
      target: { value: '90' },
    });
    fireEvent.click(screen.getByText('Save'));

    expect(handleSave).toHaveBeenCalled();
  });

  it('shows validation errors', () => {
    render(<SettingsPanel config={mockConfig} onSave={() => {}} />);

    fireEvent.change(screen.getByLabelText(/coverage threshold/i), {
      target: { value: '150' },
    });
    fireEvent.click(screen.getByText('Save'));

    expect(screen.getByText(/must be between 0 and 100/i)).toBeInTheDocument();
  });

  it('has cancel button that reverts changes', () => {
    const handleCancel = vi.fn();
    render(<SettingsPanel config={mockConfig} onSave={() => {}} onCancel={handleCancel} />);

    fireEvent.change(screen.getByLabelText(/coverage threshold/i), {
      target: { value: '90' },
    });
    fireEvent.click(screen.getByText('Cancel'));

    expect(handleCancel).toHaveBeenCalled();
  });

  it('shows loading state while saving', () => {
    render(<SettingsPanel config={mockConfig} onSave={() => {}} saving />);
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('organizes settings into sections', () => {
    render(<SettingsPanel config={mockConfig} onSave={() => {}} />);
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Quality')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<SettingsPanel config={mockConfig} onSave={() => {}} className="custom-settings" />);
    expect(screen.getByTestId('settings-panel')).toHaveClass('custom-settings');
  });
});
