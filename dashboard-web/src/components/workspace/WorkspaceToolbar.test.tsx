import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorkspaceToolbar } from './WorkspaceToolbar';
import { formatRelativeTime } from './WorkspaceToolbar';

const defaultProps = {
  onScan: vi.fn().mockResolvedValue(undefined),
  lastScan: null,
  isScanning: false,
  projectCount: 0,
  error: null,
};

describe('WorkspaceToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders refresh button', () => {
    render(<WorkspaceToolbar {...defaultProps} />);
    expect(screen.getByTestId('refresh-button')).toBeInTheDocument();
  });

  it('shows spinner during scan', () => {
    render(<WorkspaceToolbar {...defaultProps} isScanning={true} />);
    expect(screen.getByTestId('scan-spinner')).toBeInTheDocument();
  });

  it('does not show spinner when not scanning', () => {
    render(<WorkspaceToolbar {...defaultProps} isScanning={false} />);
    expect(screen.queryByTestId('scan-spinner')).not.toBeInTheDocument();
  });

  it('displays last scan timestamp', () => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    render(<WorkspaceToolbar {...defaultProps} lastScan={fiveMinutesAgo} />);
    expect(screen.getByTestId('last-scan')).toHaveTextContent('Last scanned: 5 minutes ago');
  });

  it('updates project list after successful scan', async () => {
    const onScan = vi.fn().mockResolvedValue(undefined);
    render(<WorkspaceToolbar {...defaultProps} onScan={onScan} projectCount={5} />);
    expect(screen.getByTestId('project-count')).toHaveTextContent('5 projects');
  });

  it('shows error on scan failure', () => {
    render(<WorkspaceToolbar {...defaultProps} error="Scan failed: network error" />);
    expect(screen.getByTestId('scan-error')).toHaveTextContent('Scan failed: network error');
  });

  it('does not show error when no error', () => {
    render(<WorkspaceToolbar {...defaultProps} error={null} />);
    expect(screen.queryByTestId('scan-error')).not.toBeInTheDocument();
  });

  it('refresh button triggers scan API call', async () => {
    const onScan = vi.fn().mockResolvedValue(undefined);
    render(<WorkspaceToolbar {...defaultProps} onScan={onScan} />);

    fireEvent.click(screen.getByTestId('refresh-button'));
    expect(onScan).toHaveBeenCalledTimes(1);
  });

  it('shows "Never scanned" when no previous scan', () => {
    render(<WorkspaceToolbar {...defaultProps} lastScan={null} />);
    expect(screen.getByTestId('last-scan')).toHaveTextContent('Never scanned');
  });

  it('button disabled during scan', () => {
    render(<WorkspaceToolbar {...defaultProps} isScanning={true} />);
    expect(screen.getByTestId('refresh-button')).toBeDisabled();
  });

  it('button enabled when not scanning', () => {
    render(<WorkspaceToolbar {...defaultProps} isScanning={false} />);
    expect(screen.getByTestId('refresh-button')).not.toBeDisabled();
  });

  it('displays project count with singular form', () => {
    render(<WorkspaceToolbar {...defaultProps} projectCount={1} />);
    expect(screen.getByTestId('project-count')).toHaveTextContent('1 project');
  });

  it('displays project count with plural form', () => {
    render(<WorkspaceToolbar {...defaultProps} projectCount={12} />);
    expect(screen.getByTestId('project-count')).toHaveTextContent('12 projects');
  });

  it('displays zero projects', () => {
    render(<WorkspaceToolbar {...defaultProps} projectCount={0} />);
    expect(screen.getByTestId('project-count')).toHaveTextContent('0 projects');
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for less than 60 seconds ago', () => {
    const thirtySecondsAgo = Date.now() - 30 * 1000;
    expect(formatRelativeTime(thirtySecondsAgo)).toBe('just now');
  });

  it('returns "1 minute ago" for 60 seconds ago', () => {
    const oneMinuteAgo = Date.now() - 60 * 1000;
    expect(formatRelativeTime(oneMinuteAgo)).toBe('1 minute ago');
  });

  it('returns "N minutes ago" for less than 60 minutes', () => {
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    expect(formatRelativeTime(tenMinutesAgo)).toBe('10 minutes ago');
  });

  it('returns "1 hour ago" for 60 minutes ago', () => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    expect(formatRelativeTime(oneHourAgo)).toBe('1 hour ago');
  });

  it('returns "N hours ago" for less than 24 hours', () => {
    const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
    expect(formatRelativeTime(threeHoursAgo)).toBe('3 hours ago');
  });

  it('returns "1 day ago" for 24 hours ago', () => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    expect(formatRelativeTime(oneDayAgo)).toBe('1 day ago');
  });

  it('returns "N days ago" for more than 24 hours', () => {
    const fiveDaysAgo = Date.now() - 5 * 24 * 60 * 60 * 1000;
    expect(formatRelativeTime(fiveDaysAgo)).toBe('5 days ago');
  });
});
