/**
 * Task Create Panel Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskCreatePanel } from './TaskCreatePanel';

describe('TaskCreatePanel', () => {
  it('renders form', () => {
    render(<TaskCreatePanel />);
    expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('handles subject input', () => {
    render(<TaskCreatePanel />);
    const input = screen.getByLabelText(/subject/i);
    fireEvent.change(input, { target: { value: 'New task' } });
    expect(input).toHaveValue('New task');
  });

  it('handles description input', () => {
    render(<TaskCreatePanel />);
    const textarea = screen.getByLabelText(/description/i);
    fireEvent.change(textarea, { target: { value: 'Task description' } });
    expect(textarea).toHaveValue('Task description');
  });

  it('shows phase selector', () => {
    render(<TaskCreatePanel phases={[{ number: 1, name: 'Phase 1' }, { number: 2, name: 'Phase 2' }]} />);
    expect(screen.getByLabelText(/phase/i)).toBeInTheDocument();
  });

  it('defaults to current phase', () => {
    render(<TaskCreatePanel currentPhase={2} phases={[{ number: 1 }, { number: 2 }]} />);
    const select = screen.getByLabelText(/phase/i);
    expect(select).toHaveValue('2');
  });

  it('submits to API', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ id: '123' });
    render(<TaskCreatePanel onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: 'Test task' } });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
        subject: 'Test task'
      }));
    });
  });

  it('shows validation errors', async () => {
    render(<TaskCreatePanel />);
    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText(/subject.*required/i)).toBeInTheDocument();
    });
  });

  it('shows success feedback', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ id: '123' });
    render(<TaskCreatePanel onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: 'Test' } });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText(/created/i)).toBeInTheDocument();
    });
  });

  it('shows error feedback', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Failed'));
    render(<TaskCreatePanel onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: 'Test' } });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed/i)).toBeInTheDocument();
    });
  });

  it('disables submit while loading', async () => {
    const onSubmit = vi.fn().mockImplementation(() => new Promise(() => {}));
    render(<TaskCreatePanel onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: 'Test' } });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create/i })).toBeDisabled();
    });
  });

  it('clears form after success', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ id: '123' });
    render(<TaskCreatePanel onSubmit={onSubmit} />);

    const input = screen.getByLabelText(/subject/i);
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });
});
