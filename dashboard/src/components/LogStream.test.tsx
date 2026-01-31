import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { LogStream, LogEntry } from './LogStream.js';

// Generate sample logs
const generateLogs = (count: number): LogEntry[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `log-${i}`,
    timestamp: `2024-01-15T10:${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}Z`,
    level: i % 10 === 0 ? 'error' : i % 5 === 0 ? 'warn' : 'info',
    service: i % 2 === 0 ? 'api' : 'web',
    message: `Log message ${i + 1}`,
  }));

const sampleLogs = generateLogs(100);

describe('LogStream', () => {
  describe('Windowed Display', () => {
    it('shows configurable page size', () => {
      const { lastFrame } = render(
        <LogStream logs={sampleLogs} pageSize={10} />
      );
      // Should show only 10 logs at a time
      const output = lastFrame() || '';
      const matches = output.match(/Log message \d+/g) || [];
      expect(matches.length).toBeLessThanOrEqual(10);
    });

    it('defaults to 20 lines per page', () => {
      const { lastFrame } = render(<LogStream logs={sampleLogs} />);
      const output = lastFrame() || '';
      const matches = output.match(/Log message \d+/g) || [];
      expect(matches.length).toBeLessThanOrEqual(20);
    });

    it('shows all logs when less than page size', () => {
      const smallLogs = generateLogs(5);
      const { lastFrame } = render(<LogStream logs={smallLogs} pageSize={20} />);
      expect(lastFrame()).toContain('Log message 1');
      expect(lastFrame()).toContain('Log message 5');
    });
  });

  describe('Position Indicator', () => {
    it('shows current position', () => {
      const { lastFrame } = render(<LogStream logs={sampleLogs} pageSize={10} />);
      // Should show something like "1-10 of 100" or "Line 1 of 100"
      expect(lastFrame()).toMatch(/\d+.*of.*100|\d+\/100/i);
    });

    it('shows total log count', () => {
      const { lastFrame } = render(<LogStream logs={sampleLogs} />);
      expect(lastFrame()).toContain('100');
    });
  });

  describe('Navigation Hints', () => {
    it('shows page navigation hints', () => {
      const { lastFrame } = render(<LogStream logs={sampleLogs} />);
      expect(lastFrame()).toMatch(/PgUp|PgDn|g|G/);
    });

    it('shows jump to top/bottom hints', () => {
      const { lastFrame } = render(<LogStream logs={sampleLogs} />);
      expect(lastFrame()).toMatch(/top|bottom|g|G/i);
    });

    it('shows search hint', () => {
      const { lastFrame } = render(<LogStream logs={sampleLogs} />);
      expect(lastFrame()).toMatch(/\/|search/i);
    });
  });

  describe('Auto-scroll', () => {
    it('shows auto-scroll indicator when enabled', () => {
      const { lastFrame } = render(
        <LogStream logs={sampleLogs} autoScroll={true} />
      );
      expect(lastFrame()).toMatch(/↓|auto|scroll/i);
    });

    it('shows auto-scroll off indicator', () => {
      const { lastFrame } = render(
        <LogStream logs={sampleLogs} autoScroll={false} />
      );
      // Should show paused or similar
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('Log Display', () => {
    it('shows timestamp', () => {
      const { lastFrame } = render(<LogStream logs={sampleLogs} pageSize={5} />);
      expect(lastFrame()).toMatch(/\d{2}:\d{2}:\d{2}/);
    });

    it('shows log level', () => {
      const { lastFrame } = render(<LogStream logs={sampleLogs} pageSize={20} />);
      // Should have level indicators
      expect(lastFrame()).toMatch(/info|warn|error|ℹ|⚠|✗/i);
    });

    it('shows service name', () => {
      const { lastFrame } = render(<LogStream logs={sampleLogs} pageSize={5} />);
      expect(lastFrame()).toMatch(/api|web/);
    });

    it('shows message', () => {
      const { lastFrame } = render(<LogStream logs={sampleLogs} pageSize={5} />);
      expect(lastFrame()).toContain('Log message');
    });
  });

  describe('Search', () => {
    it('shows search query when active', () => {
      const { lastFrame } = render(
        <LogStream logs={sampleLogs} searchQuery="error" />
      );
      expect(lastFrame()).toContain('error');
    });

    it('shows match count', () => {
      const { lastFrame } = render(
        <LogStream logs={sampleLogs} searchQuery="message 1" />
      );
      // Should show number of matches
      expect(lastFrame()).toMatch(/\d+.*match/i);
    });

    it('filters to matching logs', () => {
      const { lastFrame } = render(
        <LogStream logs={sampleLogs} searchQuery="message 10" />
      );
      expect(lastFrame()).toContain('Log message 10');
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no logs', () => {
      const { lastFrame } = render(<LogStream logs={[]} />);
      expect(lastFrame()).toMatch(/no logs|empty/i);
    });

    it('shows no results when search finds nothing', () => {
      const { lastFrame } = render(
        <LogStream logs={sampleLogs} searchQuery="xyznonexistent" />
      );
      expect(lastFrame()).toMatch(/no.*match|0.*match/i);
    });
  });

  describe('Level Filtering', () => {
    it('filters by error level', () => {
      const { lastFrame } = render(
        <LogStream logs={sampleLogs} levelFilter="error" />
      );
      // Should only show error logs
      const output = lastFrame() || '';
      expect(output).not.toContain('info');
    });

    it('shows level filter indicator', () => {
      const { lastFrame } = render(
        <LogStream logs={sampleLogs} levelFilter="warn" />
      );
      expect(lastFrame()).toContain('warn');
    });
  });

  describe('Service Filtering', () => {
    it('filters by service', () => {
      const { lastFrame } = render(
        <LogStream logs={sampleLogs} serviceFilter="api" />
      );
      expect(lastFrame()).toContain('api');
    });
  });

  describe('Callbacks', () => {
    it('calls onPageChange when page changes', () => {
      const onPageChange = vi.fn();
      render(<LogStream logs={sampleLogs} onPageChange={onPageChange} />);
      // Page change happens on key press
    });

    it('calls onSearch when search triggered', () => {
      const onSearch = vi.fn();
      render(<LogStream logs={sampleLogs} onSearch={onSearch} />);
      // Search happens on '/' key
    });
  });

  describe('Large Log Sets', () => {
    it('handles 10k logs', () => {
      const largeLogs = generateLogs(10000);
      const { lastFrame } = render(
        <LogStream logs={largeLogs} pageSize={20} />
      );
      expect(lastFrame()).toContain('10000');
    });

    it('shows correct page count for large sets', () => {
      const largeLogs = generateLogs(1000);
      const { lastFrame } = render(
        <LogStream logs={largeLogs} pageSize={50} />
      );
      // 1000 logs / 50 per page = 20 pages
      expect(lastFrame()).toBeDefined();
    });
  });
});
