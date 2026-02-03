import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LogStream } from './LogStream';

const mockLogs = Array.from({ length: 100 }, (_, i) => ({
  id: `log-${i}`,
  timestamp: new Date(Date.now() - i * 1000).toISOString(),
  level: (['info', 'warn', 'error', 'debug'] as const)[i % 4],
  message: `Log message ${i}`,
  source: 'server',
}));

describe('LogStream', () => {
  it('renders log entries', () => {
    render(<LogStream logs={mockLogs.slice(0, 10)} />);
    expect(screen.getByText('Log message 0')).toBeInTheDocument();
    expect(screen.getByText('Log message 9')).toBeInTheDocument();
  });

  it('renders timestamps', () => {
    render(<LogStream logs={mockLogs.slice(0, 5)} />);
    const timestamps = screen.getAllByTestId('log-timestamp');
    expect(timestamps.length).toBe(5);
  });

  it('renders log levels with correct colors', () => {
    const logs = [
      { id: '1', timestamp: new Date().toISOString(), level: 'info' as const, message: 'Info', source: 'test' },
      { id: '2', timestamp: new Date().toISOString(), level: 'warn' as const, message: 'Warn', source: 'test' },
      { id: '3', timestamp: new Date().toISOString(), level: 'error' as const, message: 'Error', source: 'test' },
      { id: '4', timestamp: new Date().toISOString(), level: 'debug' as const, message: 'Debug', source: 'test' },
    ];

    render(<LogStream logs={logs} />);

    expect(screen.getByTestId('level-info')).toHaveClass('text-info');
    expect(screen.getByTestId('level-warn')).toHaveClass('text-warning');
    expect(screen.getByTestId('level-error')).toHaveClass('text-error');
    expect(screen.getByTestId('level-debug')).toHaveClass('text-muted-foreground');
  });

  it('shows empty state when no logs', () => {
    render(<LogStream logs={[]} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('auto-scrolls to bottom by default', () => {
    const { container } = render(<LogStream logs={mockLogs} autoScroll />);
    const scrollContainer = container.querySelector('[data-testid="log-container"]');
    expect(scrollContainer).toBeInTheDocument();
  });

  it('pauses auto-scroll on user scroll up', () => {
    render(<LogStream logs={mockLogs} autoScroll />);

    const container = screen.getByTestId('log-container');
    // Simulate scrolling down first, then up
    Object.defineProperty(container, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 400, configurable: true });
    Object.defineProperty(container, 'scrollTop', { value: 500, writable: true, configurable: true });

    fireEvent.scroll(container);
    // Now scroll up (lower scrollTop)
    Object.defineProperty(container, 'scrollTop', { value: 100, writable: true, configurable: true });
    fireEvent.scroll(container);

    expect(screen.getByTestId('scroll-paused')).toBeInTheDocument();
  });

  it('shows scroll to bottom button when paused', () => {
    render(<LogStream logs={mockLogs} autoScroll />);

    const container = screen.getByTestId('log-container');
    Object.defineProperty(container, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 400, configurable: true });
    Object.defineProperty(container, 'scrollTop', { value: 500, writable: true, configurable: true });

    fireEvent.scroll(container);
    Object.defineProperty(container, 'scrollTop', { value: 100, writable: true, configurable: true });
    fireEvent.scroll(container);

    expect(screen.getByLabelText('Scroll to bottom')).toBeInTheDocument();
  });

  it('resumes auto-scroll on button click', () => {
    render(<LogStream logs={mockLogs} autoScroll />);

    const container = screen.getByTestId('log-container');
    Object.defineProperty(container, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 400, configurable: true });
    Object.defineProperty(container, 'scrollTop', { value: 500, writable: true, configurable: true });

    fireEvent.scroll(container);
    Object.defineProperty(container, 'scrollTop', { value: 100, writable: true, configurable: true });
    fireEvent.scroll(container);

    fireEvent.click(screen.getByLabelText('Scroll to bottom'));
    expect(screen.queryByTestId('scroll-paused')).not.toBeInTheDocument();
  });

  it('filters by log level', () => {
    render(<LogStream logs={mockLogs.slice(0, 20)} showFilters />);

    fireEvent.click(screen.getByTestId('filter-error'));

    // Only error logs should be visible - check for ERROR level badge
    const visibleLogs = screen.getAllByTestId('log-entry');
    visibleLogs.forEach((log) => {
      expect(log).toHaveTextContent('ERROR');
    });
  });

  it('supports multiple level filters', () => {
    render(<LogStream logs={mockLogs.slice(0, 20)} showFilters />);

    fireEvent.click(screen.getByTestId('filter-error'));
    fireEvent.click(screen.getByTestId('filter-warn'));

    // Check for ERROR or WARN level badges
    const visibleLogs = screen.getAllByTestId('log-entry');
    visibleLogs.forEach((log) => {
      expect(log.textContent).toMatch(/ERROR|WARN/);
    });
  });

  it('shows log count', () => {
    render(<LogStream logs={mockLogs} showCount />);
    expect(screen.getByTestId('log-count')).toHaveTextContent('100');
  });

  it('handles large log volumes efficiently', () => {
    const largeLogs = Array.from({ length: 10000 }, (_, i) => ({
      id: `log-${i}`,
      timestamp: new Date().toISOString(),
      level: 'info' as const,
      message: `Log ${i}`,
      source: 'test',
    }));

    const { container } = render(<LogStream logs={largeLogs} virtualized />);
    // Virtualized list should not render all 10000 items
    const entries = container.querySelectorAll('[data-testid="log-entry"]');
    expect(entries.length).toBeLessThan(100);
  });

  it('copies log entry on click', () => {
    const mockClipboard = { writeText: vi.fn() };
    Object.assign(navigator, { clipboard: mockClipboard });

    render(<LogStream logs={mockLogs.slice(0, 5)} copyOnClick />);

    fireEvent.click(screen.getByText('Log message 0'));
    expect(mockClipboard.writeText).toHaveBeenCalled();
  });

  it('applies custom className', () => {
    render(<LogStream logs={mockLogs.slice(0, 5)} className="custom-logs" />);
    expect(screen.getByTestId('log-stream')).toHaveClass('custom-logs');
  });
});
