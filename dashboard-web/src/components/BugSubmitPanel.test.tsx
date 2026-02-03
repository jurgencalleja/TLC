/**
 * Bug Submit Panel Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BugSubmitPanel } from './BugSubmitPanel';

describe('BugSubmitPanel', () => {
  it('renders form fields', () => {
    render(<BugSubmitPanel />);
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/severity/i)).toBeInTheDocument();
  });

  it('handles title input', () => {
    render(<BugSubmitPanel />);
    const input = screen.getByLabelText(/title/i);
    fireEvent.change(input, { target: { value: 'Bug title' } });
    expect(input).toHaveValue('Bug title');
  });

  it('handles description input', () => {
    render(<BugSubmitPanel />);
    const textarea = screen.getByLabelText(/description/i);
    fireEvent.change(textarea, { target: { value: 'Bug description' } });
    expect(textarea).toHaveValue('Bug description');
  });

  it('handles severity selection', () => {
    render(<BugSubmitPanel />);
    const select = screen.getByLabelText(/severity/i);
    fireEvent.change(select, { target: { value: 'high' } });
    expect(select).toHaveValue('high');
  });

  it('validates required fields', async () => {
    render(<BugSubmitPanel />);
    const submitBtn = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/title.*required/i)).toBeInTheDocument();
    });
  });

  it('submits form successfully', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ success: true });
    render(<BugSubmitPanel onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Bug' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Desc' } });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Bug',
        description: 'Desc'
      }));
    });
  });

  it('shows success message', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ success: true });
    render(<BugSubmitPanel onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Bug' } });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/submitted/i)).toBeInTheDocument();
    });
  });

  it('handles screenshot paste', async () => {
    render(<BugSubmitPanel />);
    const dropzone = screen.getByTestId('screenshot-dropzone');

    const file = new File(['image'], 'screenshot.png', { type: 'image/png' });
    const pasteEvent = {
      clipboardData: {
        files: [file]
      }
    };

    fireEvent.paste(dropzone, pasteEvent);

    await waitFor(() => {
      expect(screen.getByText(/screenshot attached/i)).toBeInTheDocument();
    });
  });

  it('shows screenshot preview', async () => {
    render(<BugSubmitPanel />);
    const dropzone = screen.getByTestId('screenshot-dropzone');

    const file = new File(['image'], 'screenshot.png', { type: 'image/png' });
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole('img', { name: /preview/i })).toBeInTheDocument();
    });
  });

  it('removes screenshot', async () => {
    render(<BugSubmitPanel />);
    const dropzone = screen.getByTestId('screenshot-dropzone');

    const file = new File(['image'], 'screenshot.png', { type: 'image/png' });
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

    await waitFor(() => {
      const removeBtn = screen.getByRole('button', { name: /remove/i });
      fireEvent.click(removeBtn);
    });

    expect(screen.queryByRole('img', { name: /preview/i })).not.toBeInTheDocument();
  });

  it('shows error on submit failure', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Failed'));
    render(<BugSubmitPanel onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Bug' } });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed/i)).toBeInTheDocument();
    });
  });

  it('clears form after successful submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ success: true });
    render(<BugSubmitPanel onSubmit={onSubmit} />);

    const titleInput = screen.getByLabelText(/title/i);
    fireEvent.change(titleInput, { target: { value: 'Bug' } });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(titleInput).toHaveValue('');
    });
  });
});
