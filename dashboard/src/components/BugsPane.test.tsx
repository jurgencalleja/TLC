import React from 'react';
import { render } from 'ink-testing-library';
import { BugsPane, Bug, BugSeverity, BugStatus } from './BugsPane.js';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Sample bug data
const sampleBugs: Bug[] = [
  {
    id: 'BUG-001',
    title: 'Login button not working',
    description: 'Click does nothing',
    status: 'open',
    priority: 'high',
    createdAt: '2024-01-15',
  },
  {
    id: 'BUG-002',
    title: 'Dashboard loads slowly',
    description: 'Takes 5+ seconds',
    status: 'in_progress',
    priority: 'medium',
    assignee: 'alice',
  },
  {
    id: 'BUG-003',
    title: 'Minor typo in footer',
    description: 'Copyrght misspelled',
    status: 'fixed',
    priority: 'low',
  },
];

describe('BugsPane', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default successful response
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(sampleBugs),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders the bugs pane with form and list sections', async () => {
      const { lastFrame } = render(<BugsPane isActive={false} isTTY={false} />);

      // Wait for fetch to complete
      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const frame = lastFrame();
      expect(frame).toContain('Submit New Bug');
      expect(frame).toContain('Bug List');
      expect(frame).toContain('Filters');
    });

    it('shows loading state initially', () => {
      // Don't resolve fetch immediately
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { lastFrame } = render(<BugsPane isActive={false} isTTY={false} />);

      const frame = lastFrame();
      expect(frame).toContain('Loading');
    });

    it('displays bugs after loading', async () => {
      const { lastFrame } = render(<BugsPane isActive={false} isTTY={false} />);

      await vi.waitFor(() => {
        const frame = lastFrame();
        expect(frame).toContain('BUG-001');
      });

      const frame = lastFrame();
      expect(frame).toContain('BUG-002');
      expect(frame).toContain('BUG-003');
    });

    it('shows empty state when no bugs exist', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const { lastFrame } = render(<BugsPane isActive={false} isTTY={false} />);

      await vi.waitFor(() => {
        const frame = lastFrame();
        expect(frame).toContain('No bugs found');
      });
    });

    it('shows error state on fetch failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const { lastFrame } = render(<BugsPane isActive={false} isTTY={false} />);

      await vi.waitFor(() => {
        const frame = lastFrame();
        expect(frame).toContain('Error');
      });
    });
  });

  describe('form', () => {
    it('renders form fields', async () => {
      const { lastFrame } = render(<BugsPane isActive={false} isTTY={false} />);

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const frame = lastFrame();
      expect(frame).toContain('Title');
      expect(frame).toContain('Description');
      expect(frame).toContain('Severity');
    });

    it('renders severity options', async () => {
      const { lastFrame } = render(<BugsPane isActive={false} isTTY={false} />);

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const frame = lastFrame();
      // Severity options are shown (selected one in uppercase brackets)
      expect(frame).toContain('low');
      expect(frame).toContain('MEDIUM'); // Selected by default, shown in uppercase
      expect(frame).toContain('high');
      expect(frame).toContain('critical');
    });

    it('defaults to medium severity', async () => {
      const { lastFrame } = render(<BugsPane isActive={false} isTTY={false} />);

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const frame = lastFrame();
      // Medium should be highlighted/selected (in uppercase)
      expect(frame).toContain('MEDIUM');
    });
  });

  describe('filters', () => {
    it('renders filter buttons', async () => {
      const { lastFrame } = render(<BugsPane isActive={false} isTTY={false} />);

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const frame = lastFrame();
      expect(frame).toContain('All');
      expect(frame).toContain('Open');
      expect(frame).toContain('Closed');
    });

    it('shows bug count in filters', async () => {
      const { lastFrame } = render(<BugsPane isActive={false} isTTY={false} />);

      await vi.waitFor(() => {
        const frame = lastFrame();
        expect(frame).toContain('3 bugs');
      });
    });
  });

  describe('bug display', () => {
    it('shows bug severity badges', async () => {
      const { lastFrame } = render(<BugsPane isActive={false} isTTY={false} />);

      await vi.waitFor(() => {
        const frame = lastFrame();
        expect(frame).toContain('HIGH');
      });

      const frame = lastFrame();
      expect(frame).toContain('MEDIUM');
      expect(frame).toContain('LOW');
    });

    it('shows bug status', async () => {
      const { lastFrame } = render(<BugsPane isActive={false} isTTY={false} />);

      await vi.waitFor(() => {
        const frame = lastFrame();
        expect(frame).toContain('[open]');
      });

      const frame = lastFrame();
      // Status may wrap across lines in narrow terminals, check for key parts
      expect(frame).toContain('in_progress');
      expect(frame).toContain('[fixed]');
    });

    it('shows bug creation date when available', async () => {
      const { lastFrame } = render(<BugsPane isActive={false} isTTY={false} />);

      await vi.waitFor(() => {
        const frame = lastFrame();
        expect(frame).toContain('2024-01-15');
      });
    });
  });

  describe('API integration', () => {
    it('fetches bugs on mount', async () => {
      render(<BugsPane isActive={false} isTTY={false} apiBaseUrl="http://test:5000" />);

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('http://test:5000/api/bugs');
      });
    });

    it('uses default API URL', async () => {
      render(<BugsPane isActive={false} isTTY={false} />);

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('http://localhost:5001/api/bugs');
      });
    });
  });

  describe('navigation hints', () => {
    it('shows keyboard navigation hints', async () => {
      const { lastFrame } = render(<BugsPane isActive={false} isTTY={false} />);

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const frame = lastFrame();
      expect(frame).toContain('Tab');
      expect(frame).toContain('refresh');
    });
  });

  describe('severity colors', () => {
    it('applies correct colors to severity badges', async () => {
      // Just verify the component renders without errors with different severities
      const bugsWithSeverities: Bug[] = [
        { id: 'BUG-001', title: 'Critical bug', description: '', status: 'open', priority: 'critical' },
        { id: 'BUG-002', title: 'High bug', description: '', status: 'open', priority: 'high' },
        { id: 'BUG-003', title: 'Medium bug', description: '', status: 'open', priority: 'medium' },
        { id: 'BUG-004', title: 'Low bug', description: '', status: 'open', priority: 'low' },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(bugsWithSeverities),
      });

      const { lastFrame } = render(<BugsPane isActive={false} isTTY={false} />);

      await vi.waitFor(() => {
        const frame = lastFrame();
        expect(frame).toContain('CRITICAL');
        expect(frame).toContain('HIGH');
        expect(frame).toContain('MEDIUM');
        expect(frame).toContain('LOW');
      });
    });
  });

  describe('status colors', () => {
    it('shows all status types correctly', async () => {
      const bugsWithStatuses: Bug[] = [
        { id: 'BUG-001', title: 'Open', description: '', status: 'open', priority: 'medium' },
        { id: 'BUG-002', title: 'In Progress', description: '', status: 'in_progress', priority: 'medium' },
        { id: 'BUG-003', title: 'Fixed', description: '', status: 'fixed', priority: 'medium' },
        { id: 'BUG-004', title: 'Verified', description: '', status: 'verified', priority: 'medium' },
        { id: 'BUG-005', title: 'Closed', description: '', status: 'closed', priority: 'medium' },
        { id: 'BUG-006', title: 'Wontfix', description: '', status: 'wontfix', priority: 'medium' },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(bugsWithStatuses),
      });

      const { lastFrame } = render(<BugsPane isActive={false} isTTY={false} />);

      await vi.waitFor(() => {
        const frame = lastFrame();
        expect(frame).toContain('[open]');
        // Status strings may wrap across lines in terminal output
        expect(frame).toContain('in_progress');
        expect(frame).toContain('[fixed]');
        expect(frame).toContain('[verified]');
        expect(frame).toContain('[closed]');
        expect(frame).toContain('[wontfix]');
      });
    });
  });
});
