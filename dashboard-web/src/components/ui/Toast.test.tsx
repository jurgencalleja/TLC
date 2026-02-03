import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Toast, ToastContainer, useToast, ToastProvider } from './Toast';

describe('Toast', () => {
  it('renders message', () => {
    render(<Toast id="1" message="Test message" onDismiss={() => {}} />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('renders success variant', () => {
    render(<Toast id="1" message="Success!" variant="success" onDismiss={() => {}} />);
    expect(screen.getByTestId('toast')).toHaveClass('toast-success');
  });

  it('renders error variant', () => {
    render(<Toast id="1" message="Error!" variant="error" onDismiss={() => {}} />);
    expect(screen.getByTestId('toast')).toHaveClass('toast-error');
  });

  it('renders warning variant', () => {
    render(<Toast id="1" message="Warning!" variant="warning" onDismiss={() => {}} />);
    expect(screen.getByTestId('toast')).toHaveClass('toast-warning');
  });

  it('renders info variant', () => {
    render(<Toast id="1" message="Info" variant="info" onDismiss={() => {}} />);
    expect(screen.getByTestId('toast')).toHaveClass('toast-info');
  });

  it('calls onDismiss when close clicked', () => {
    const handleDismiss = vi.fn();
    render(<Toast id="1" message="Test" onDismiss={handleDismiss} />);

    fireEvent.click(screen.getByLabelText('Dismiss'));
    expect(handleDismiss).toHaveBeenCalledWith('1');
  });

  it('renders with title', () => {
    render(<Toast id="1" message="Body" title="Header" onDismiss={() => {}} />);
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('renders appropriate icon for variant', () => {
    const { rerender } = render(
      <Toast id="1" message="Test" variant="success" onDismiss={() => {}} />
    );
    expect(screen.getByTestId('toast-icon')).toBeInTheDocument();

    rerender(<Toast id="1" message="Test" variant="error" onDismiss={() => {}} />);
    expect(screen.getByTestId('toast-icon')).toBeInTheDocument();
  });
});

describe('ToastContainer', () => {
  it('renders multiple toasts', () => {
    const toasts = [
      { id: '1', message: 'First' },
      { id: '2', message: 'Second' },
      { id: '3', message: 'Third' },
    ];

    render(<ToastContainer toasts={toasts} onDismiss={() => {}} />);

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('Third')).toBeInTheDocument();
  });

  it('stacks toasts vertically', () => {
    const toasts = [
      { id: '1', message: 'First' },
      { id: '2', message: 'Second' },
    ];

    render(<ToastContainer toasts={toasts} onDismiss={() => {}} />);
    expect(screen.getByTestId('toast-container')).toHaveClass('flex-col');
  });

  it('positions at bottom right by default', () => {
    render(<ToastContainer toasts={[{ id: '1', message: 'Test' }]} onDismiss={() => {}} />);
    const container = screen.getByTestId('toast-container');
    expect(container).toHaveClass('bottom-4', 'right-4');
  });

  it('supports top-right position', () => {
    render(
      <ToastContainer
        toasts={[{ id: '1', message: 'Test' }]}
        onDismiss={() => {}}
        position="top-right"
      />
    );
    const container = screen.getByTestId('toast-container');
    expect(container).toHaveClass('top-4', 'right-4');
  });
});

describe('useToast hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function TestComponent() {
    const { toasts, addToast, dismissToast } = useToast();

    return (
      <div>
        <button onClick={() => addToast({ message: 'New toast' })}>Add</button>
        <button onClick={() => dismissToast('test-id')}>Dismiss</button>
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  it('adds toast', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Add'));
    expect(screen.getByText('New toast')).toBeInTheDocument();
  });

  it('auto-dismisses after duration', () => {
    function AutoDismissTest() {
      const { toasts, addToast, dismissToast } = useToast();

      return (
        <div>
          <button onClick={() => addToast({ message: 'Auto dismiss', duration: 3000 })}>
            Add
          </button>
          <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </div>
      );
    }

    render(
      <ToastProvider>
        <AutoDismissTest />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Add'));
    expect(screen.getByText('Auto dismiss')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByText('Auto dismiss')).not.toBeInTheDocument();
  });

  it('limits max toasts displayed', () => {
    function MaxToastsTest() {
      const { toasts, addToast, dismissToast } = useToast();

      return (
        <div>
          <button
            onClick={() => {
              addToast({ message: 'Toast 1' });
              addToast({ message: 'Toast 2' });
              addToast({ message: 'Toast 3' });
              addToast({ message: 'Toast 4' });
              addToast({ message: 'Toast 5' });
              addToast({ message: 'Toast 6' });
            }}
          >
            Add Many
          </button>
          <ToastContainer toasts={toasts} onDismiss={dismissToast} maxToasts={5} />
        </div>
      );
    }

    render(
      <ToastProvider>
        <MaxToastsTest />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Add Many'));

    // Should only show 5 toasts max
    const toastElements = screen.getAllByTestId('toast');
    expect(toastElements.length).toBeLessThanOrEqual(5);
  });
});
