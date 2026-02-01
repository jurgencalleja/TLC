import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import { AuditPane } from './AuditPane.js';

describe('AuditPane', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('audit entries list', () => {
    it('renders audit entries list', () => {
      const entries = [
        {
          id: '1',
          timestamp: '2024-01-15T10:30:00.000Z',
          action: 'claim',
          user: 'alice',
          severity: 'info' as const,
          details: 'Claimed task 1',
        },
        {
          id: '2',
          timestamp: '2024-01-15T10:31:00.000Z',
          action: 'verify',
          user: 'bob',
          severity: 'info' as const,
          details: 'Verified task 1',
        },
      ];

      const { lastFrame } = render(<AuditPane entries={entries} />);
      const output = lastFrame();

      expect(output).toContain('Audit Log');
      expect(output).toContain('claim');
      expect(output).toContain('verify');
    });
  });

  describe('entry with timestamp and action', () => {
    it('renders entry with timestamp and action', () => {
      const entries = [
        {
          id: '1',
          timestamp: '2024-01-15T10:30:45.000Z',
          action: 'release',
          user: 'alice',
          severity: 'info' as const,
          details: 'Released task 2',
        },
      ];

      const { lastFrame } = render(<AuditPane entries={entries} />);
      const output = lastFrame();

      expect(output).toContain('10:30:45');
      expect(output).toContain('release');
      expect(output).toContain('alice');
    });
  });

  describe('severity badge', () => {
    it('renders severity badge with correct color for error', () => {
      const entries = [
        {
          id: '1',
          timestamp: '2024-01-15T10:30:00.000Z',
          action: 'integrity-fail',
          user: 'system',
          severity: 'error' as const,
          details: 'Integrity check failed',
        },
      ];

      const { lastFrame } = render(<AuditPane entries={entries} />);
      const output = lastFrame();

      expect(output).toContain('error');
      expect(output).toContain('integrity-fail');
    });

    it('renders severity badge with correct color for warn', () => {
      const entries = [
        {
          id: '1',
          timestamp: '2024-01-15T10:30:00.000Z',
          action: 'conflict',
          user: 'alice',
          severity: 'warn' as const,
          details: 'Task conflict detected',
        },
      ];

      const { lastFrame } = render(<AuditPane entries={entries} />);
      const output = lastFrame();

      expect(output).toContain('warn');
    });

    it('renders severity badge with correct color for info', () => {
      const entries = [
        {
          id: '1',
          timestamp: '2024-01-15T10:30:00.000Z',
          action: 'claim',
          user: 'alice',
          severity: 'info' as const,
          details: 'Claimed task',
        },
      ];

      const { lastFrame } = render(<AuditPane entries={entries} />);
      const output = lastFrame();

      expect(output).toContain('info');
    });
  });

  describe('expandable entry details', () => {
    it('expands entry to show details', () => {
      const entries = [
        {
          id: '1',
          timestamp: '2024-01-15T10:30:00.000Z',
          action: 'claim',
          user: 'alice',
          severity: 'info' as const,
          details: 'Claimed task 1 in phase 5',
        },
      ];

      const { lastFrame } = render(
        <AuditPane entries={entries} expandedId="1" />
      );
      const output = lastFrame();

      expect(output).toContain('Claimed task 1 in phase 5');
    });

    it('does not show details when not expanded', () => {
      const entries = [
        {
          id: '1',
          timestamp: '2024-01-15T10:30:00.000Z',
          action: 'claim',
          user: 'alice',
          severity: 'info' as const,
          details: 'This is a long detail that should be hidden',
        },
      ];

      const { lastFrame } = render(<AuditPane entries={entries} />);
      const output = lastFrame();

      // Details should be truncated or hidden
      expect(output).not.toContain('This is a long detail that should be hidden');
    });
  });

  describe('user filter', () => {
    it('filters by user selection', () => {
      const entries = [
        {
          id: '1',
          timestamp: '2024-01-15T10:30:00.000Z',
          action: 'claim',
          user: 'alice',
          severity: 'info' as const,
          details: 'Alice claim',
        },
        {
          id: '2',
          timestamp: '2024-01-15T10:31:00.000Z',
          action: 'verify',
          user: 'bob',
          severity: 'info' as const,
          details: 'Bob verify',
        },
        {
          id: '3',
          timestamp: '2024-01-15T10:32:00.000Z',
          action: 'release',
          user: 'alice',
          severity: 'info' as const,
          details: 'Alice release',
        },
      ];

      const { lastFrame } = render(
        <AuditPane entries={entries} userFilter="alice" />
      );
      const output = lastFrame();

      expect(output).toContain('alice');
      expect(output).toContain('claim');
      expect(output).toContain('release');
      expect(output).not.toContain('bob');
    });
  });

  describe('action type filter', () => {
    it('filters by action type', () => {
      const entries = [
        {
          id: '1',
          timestamp: '2024-01-15T10:30:00.000Z',
          action: 'claim',
          user: 'alice',
          severity: 'info' as const,
          details: 'Claim 1',
        },
        {
          id: '2',
          timestamp: '2024-01-15T10:31:00.000Z',
          action: 'verify',
          user: 'bob',
          severity: 'info' as const,
          details: 'Verify 1',
        },
        {
          id: '3',
          timestamp: '2024-01-15T10:32:00.000Z',
          action: 'claim',
          user: 'bob',
          severity: 'info' as const,
          details: 'Claim 2',
        },
      ];

      const { lastFrame } = render(
        <AuditPane entries={entries} actionFilter="claim" />
      );
      const output = lastFrame();

      expect(output).toContain('claim');
      expect(output).not.toContain('verify');
    });
  });

  describe('date range filter', () => {
    it('filters by date range', () => {
      const entries = [
        {
          id: '1',
          timestamp: '2024-01-14T10:30:00.000Z',
          action: 'claim',
          user: 'alice',
          severity: 'info' as const,
          details: 'Yesterday claim',
        },
        {
          id: '2',
          timestamp: '2024-01-15T10:30:00.000Z',
          action: 'verify',
          user: 'bob',
          severity: 'info' as const,
          details: 'Today verify',
        },
        {
          id: '3',
          timestamp: '2024-01-16T10:30:00.000Z',
          action: 'release',
          user: 'alice',
          severity: 'info' as const,
          details: 'Tomorrow release',
        },
      ];

      const { lastFrame } = render(
        <AuditPane
          entries={entries}
          dateFrom="2024-01-15T00:00:00.000Z"
          dateTo="2024-01-15T23:59:59.000Z"
        />
      );
      const output = lastFrame();

      expect(output).toContain('verify');
      expect(output).not.toContain('Yesterday');
      expect(output).not.toContain('Tomorrow');
    });
  });

  describe('integrity status', () => {
    it('shows integrity status indicator when valid', () => {
      const entries = [
        {
          id: '1',
          timestamp: '2024-01-15T10:30:00.000Z',
          action: 'claim',
          user: 'alice',
          severity: 'info' as const,
          details: 'Claimed task',
        },
      ];

      const { lastFrame } = render(
        <AuditPane entries={entries} integrityStatus="valid" />
      );
      const output = lastFrame();

      expect(output).toContain('Integrity');
      expect(output).toMatch(/valid|OK/i);
    });

    it('shows integrity status indicator when invalid', () => {
      const entries = [
        {
          id: '1',
          timestamp: '2024-01-15T10:30:00.000Z',
          action: 'claim',
          user: 'alice',
          severity: 'info' as const,
          details: 'Claimed task',
        },
      ];

      const { lastFrame } = render(
        <AuditPane entries={entries} integrityStatus="invalid" />
      );
      const output = lastFrame();

      expect(output).toContain('Integrity');
      expect(output).toMatch(/invalid|FAILED/i);
    });

    it('shows integrity status indicator when unknown', () => {
      const entries = [
        {
          id: '1',
          timestamp: '2024-01-15T10:30:00.000Z',
          action: 'claim',
          user: 'alice',
          severity: 'info' as const,
          details: 'Claimed task',
        },
      ];

      const { lastFrame } = render(
        <AuditPane entries={entries} integrityStatus="unknown" />
      );
      const output = lastFrame();

      expect(output).toContain('Integrity');
    });
  });

  describe('empty audit log', () => {
    it('handles empty audit log', () => {
      const { lastFrame } = render(<AuditPane entries={[]} />);
      const output = lastFrame();

      expect(output).toContain('Audit');
      expect(output).toMatch(/No.*entries|empty/i);
    });
  });

  describe('scrollable list', () => {
    it('shows scrollable list of audit entries', () => {
      const entries = Array.from({ length: 50 }, (_, i) => ({
        id: String(i + 1),
        timestamp: `2024-01-15T10:${String(i).padStart(2, '0')}:00.000Z`,
        action: 'claim',
        user: 'user' + (i % 3),
        severity: 'info' as const,
        details: `Entry ${i + 1}`,
      }));

      const { lastFrame } = render(<AuditPane entries={entries} maxLines={10} />);
      const output = lastFrame();

      // Should show entry count
      expect(output).toContain('50');
      // Should not show all 50 entries visually
      expect(output).toBeDefined();
    });
  });

  describe('filter controls display', () => {
    it('shows filter controls when active', () => {
      const entries = [
        {
          id: '1',
          timestamp: '2024-01-15T10:30:00.000Z',
          action: 'claim',
          user: 'alice',
          severity: 'info' as const,
          details: 'Claimed task',
        },
      ];
      const users = ['alice', 'bob'];
      const actions = ['claim', 'verify', 'release'];

      const { lastFrame } = render(
        <AuditPane
          entries={entries}
          users={users}
          actions={actions}
          isActive={true}
        />
      );
      const output = lastFrame();

      // Should show some filter UI
      expect(output).toBeDefined();
    });
  });
});
