import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import {
  LogsPane,
  formatTimestamp,
  filterLogsByService,
  filterLogsByLevel,
} from './LogsPane.js';

describe('LogsPane', () => {
  describe('formatTimestamp', () => {
    it('formats ISO timestamp to HH:MM:SS', () => {
      expect(formatTimestamp('2024-01-15T10:30:45.000Z')).toBe('10:30:45');
    });

    it('returns empty string for undefined', () => {
      expect(formatTimestamp(undefined)).toBe('');
    });

    it('handles invalid timestamp', () => {
      expect(formatTimestamp('not-a-date')).toBe('');
    });
  });

  describe('filterLogsByService', () => {
    const logs = [
      { service: 'api', message: 'API log 1' },
      { service: 'web', message: 'Web log 1' },
      { service: 'api', message: 'API log 2' },
    ];

    it('returns all logs when no service filter', () => {
      expect(filterLogsByService(logs, undefined)).toHaveLength(3);
    });

    it('filters by service name', () => {
      const filtered = filterLogsByService(logs, 'api');
      expect(filtered).toHaveLength(2);
      expect(filtered.every((l) => l.service === 'api')).toBe(true);
    });
  });

  describe('filterLogsByLevel', () => {
    const logs = [
      { level: 'error' as const, message: 'Error' },
      { level: 'warn' as const, message: 'Warning' },
      { level: 'info' as const, message: 'Info' },
      { level: 'debug' as const, message: 'Debug' },
    ];

    it('returns all logs when no level filter', () => {
      expect(filterLogsByLevel(logs, undefined)).toHaveLength(4);
    });

    it('filters to error only', () => {
      const filtered = filterLogsByLevel(logs, 'error');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].message).toBe('Error');
    });

    it('filters to warn and above', () => {
      const filtered = filterLogsByLevel(logs, 'warn');
      expect(filtered).toHaveLength(2);
    });

    it('filters to info and above', () => {
      const filtered = filterLogsByLevel(logs, 'info');
      expect(filtered).toHaveLength(3);
    });
  });

  describe('component rendering', () => {
    it('renders empty state when no logs', () => {
      const { lastFrame } = render(<LogsPane logs={[]} isActive={false} />);
      const output = lastFrame();

      expect(output).toContain('No logs yet');
    });

    it('renders log entries', () => {
      const logs = [
        { message: 'Server started', level: 'info' as const },
        { message: 'Request received', level: 'debug' as const },
      ];

      const { lastFrame } = render(<LogsPane logs={logs} isActive={false} />);
      const output = lastFrame();

      expect(output).toContain('Server started');
      expect(output).toContain('Request received');
    });

    it('shows entry count', () => {
      const logs = [
        { message: 'Log 1' },
        { message: 'Log 2' },
        { message: 'Log 3' },
      ];

      const { lastFrame } = render(<LogsPane logs={logs} isActive={false} />);
      const output = lastFrame();

      expect(output).toContain('3 entries');
    });

    it('shows service name in log line', () => {
      const logs = [{ service: 'api', message: 'Hello' }];

      const { lastFrame } = render(<LogsPane logs={logs} isActive={false} />);
      const output = lastFrame();

      expect(output).toContain('[api]');
    });

    it('shows timestamp in log line', () => {
      const logs = [
        { timestamp: '2024-01-15T10:30:00.000Z', message: 'Hello' },
      ];

      const { lastFrame } = render(<LogsPane logs={logs} isActive={false} />);
      const output = lastFrame();

      expect(output).toContain('10:30:00');
    });

    it('shows service filter when services provided', () => {
      const logs = [{ message: 'Hello' }];
      const services = ['api', 'web'];

      const { lastFrame } = render(
        <LogsPane logs={logs} services={services} isActive={false} />
      );
      const output = lastFrame();

      expect(output).toContain('[api]');
      expect(output).toContain('[web]');
    });

    it('shows controls when active', () => {
      const logs = [{ message: 'Hello' }];

      const { lastFrame } = render(<LogsPane logs={logs} isActive={true} />);
      const output = lastFrame();

      expect(output).toContain('[a] All');
      expect(output).toContain('Level');
    });

    it('hides controls when inactive', () => {
      const logs = [{ message: 'Hello' }];

      const { lastFrame } = render(<LogsPane logs={logs} isActive={false} />);
      const output = lastFrame();

      expect(output).not.toContain('[a] All');
    });

    it('limits displayed lines to maxLines', () => {
      const logs = Array.from({ length: 50 }, (_, i) => ({
        message: `Log ${i + 1}`,
      }));

      const { lastFrame } = render(
        <LogsPane logs={logs} isActive={false} maxLines={5} />
      );
      const output = lastFrame();

      expect(output).toContain('Log 50');
      expect(output).toContain('Log 46');
      expect(output).not.toContain('Log 1');
    });
  });
});
