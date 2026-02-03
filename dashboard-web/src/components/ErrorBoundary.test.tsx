/**
 * Error Boundary Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

const ThrowingComponent = () => {
  throw new Error('Test error');
};

const WorkingComponent = () => <div>Working</div>;

describe('ErrorBoundary', () => {
  // Suppress console.error for expected errors
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <WorkingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Working')).toBeInTheDocument();
  });

  it('catches errors', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it('renders fallback', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
  });

  it('shows retry button', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('retry resets error state', async () => {
    let shouldThrow = true;
    const ConditionalThrow = () => {
      if (shouldThrow) throw new Error('Error');
      return <div>Recovered</div>;
    };

    const { rerender } = render(
      <ErrorBoundary>
        <ConditionalThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    rerender(
      <ErrorBoundary>
        <ConditionalThrow />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.getByText('Recovered')).toBeInTheDocument();
    });
  });

  it('shows error message', () => {
    render(
      <ErrorBoundary showError>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Test error/)).toBeInTheDocument();
  });

  it('reports error to callback', () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object)
    );
  });

  it('reports to server', () => {
    const mockReport = vi.fn();
    render(
      <ErrorBoundary reportToServer={mockReport}>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(mockReport).toHaveBeenCalled();
  });

  it('shows friendly message', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText(/sorry/i)).toBeInTheDocument();
  });
});
