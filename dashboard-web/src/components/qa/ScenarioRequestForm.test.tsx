import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ScenarioRequestForm } from './ScenarioRequestForm';

describe('ScenarioRequestForm', () => {
  it('renders form', () => {
    render(<ScenarioRequestForm onSubmit={() => {}} />);
    expect(screen.getByTestId('scenario-request-form')).toBeInTheDocument();
  });

  it('has title input', () => {
    render(<ScenarioRequestForm onSubmit={() => {}} />);
    expect(screen.getByLabelText(/scenario title/i)).toBeInTheDocument();
  });

  it('has description input', () => {
    render(<ScenarioRequestForm onSubmit={() => {}} />);
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it('has feature selector', () => {
    render(<ScenarioRequestForm onSubmit={() => {}} features={['Login', 'Dashboard']} />);
    expect(screen.getByLabelText(/related feature/i)).toBeInTheDocument();
  });

  it('has priority selector', () => {
    render(<ScenarioRequestForm onSubmit={() => {}} />);
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
  });

  it('submits form with data', () => {
    const handleSubmit = vi.fn();
    render(<ScenarioRequestForm onSubmit={handleSubmit} features={['Login', 'Dashboard']} />);

    fireEvent.change(screen.getByLabelText(/scenario title/i), {
      target: { value: 'Test logout flow' },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'Verify user can log out' },
    });
    fireEvent.click(screen.getByText('Submit Request'));

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Test logout flow',
        description: 'Verify user can log out',
      })
    );
  });

  it('validates required fields', () => {
    render(<ScenarioRequestForm onSubmit={() => {}} />);

    fireEvent.click(screen.getByText('Submit Request'));

    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
  });

  it('has cancel button', () => {
    const handleCancel = vi.fn();
    render(<ScenarioRequestForm onSubmit={() => {}} onCancel={handleCancel} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(handleCancel).toHaveBeenCalled();
  });

  it('clears form after submit', () => {
    const handleSubmit = vi.fn();
    render(<ScenarioRequestForm onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByLabelText(/scenario title/i), {
      target: { value: 'Test scenario' },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'Description' },
    });
    fireEvent.click(screen.getByText('Submit Request'));

    expect(screen.getByLabelText(/scenario title/i)).toHaveValue('');
  });

  it('applies custom className', () => {
    render(<ScenarioRequestForm onSubmit={() => {}} className="custom-form" />);
    expect(screen.getByTestId('scenario-request-form')).toHaveClass('custom-form');
  });
});
