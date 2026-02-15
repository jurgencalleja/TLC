import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { BugsPage } from './BugsPage';

// Mock hooks
vi.mock('../hooks/useBugs', () => ({
  useBugs: vi.fn(),
}));

vi.mock('../stores', () => ({
  useUIStore: vi.fn((selector) => {
    const store = { setActiveView: vi.fn() };
    return selector(store);
  }),
}));

vi.mock('../stores/workspace.store', () => ({
  useWorkspaceStore: vi.fn((selector) => {
    const store = { selectedProjectId: 'proj1', selectProject: vi.fn() };
    return selector(store);
  }),
}));

import { useBugs } from '../hooks/useBugs';

const MOCK_BUGS = [
  { id: 'BUG-001', description: 'Login page crashes', severity: 'high', status: 'open', createdAt: '2026-02-10' },
  { id: 'BUG-002', description: 'Dashboard slow', severity: 'medium', status: 'fixed', createdAt: '2026-02-08' },
  { id: 'BUG-003', description: 'Button color wrong', severity: 'low', status: 'closed', createdAt: '2026-02-12' },
];

function renderPage(bugs = MOCK_BUGS, loading = false) {
  vi.mocked(useBugs).mockReturnValue({
    bugs,
    loading,
    error: null,
    fetchBugs: vi.fn(),
    createBug: vi.fn().mockResolvedValue({ bug: {} }),
    updateBugStatus: vi.fn().mockResolvedValue({ bug: {} }),
  });

  return render(
    <MemoryRouter initialEntries={['/projects/proj1/bugs']}>
      <Routes>
        <Route path="/projects/:projectId/bugs" element={<BugsPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('BugsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders bug list with correct data', () => {
    renderPage();
    expect(screen.getByText('Bugs')).toBeInTheDocument();
    const bugCards = screen.getAllByTestId('bug-card');
    expect(bugCards).toHaveLength(3);
  });

  it('shows severity badges with correct text', () => {
    renderPage();
    const severityBadges = screen.getAllByTestId('bug-severity');
    expect(severityBadges[0]).toHaveTextContent('high');
    expect(severityBadges[1]).toHaveTextContent('medium');
    expect(severityBadges[2]).toHaveTextContent('low');
  });

  it('shows open count badge', () => {
    renderPage();
    expect(screen.getByTestId('open-count')).toHaveTextContent('1 open');
  });

  it('filter toggles reduce visible bugs', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('filter-open'));
    const bugCards = screen.getAllByTestId('bug-card');
    expect(bugCards).toHaveLength(1);
  });

  it('click bug expands to show description', () => {
    renderPage();
    const bugCards = screen.getAllByTestId('bug-card');
    fireEvent.click(bugCards[0]);
    expect(screen.getByText('Login page crashes')).toBeInTheDocument();
  });

  it('Report Bug button opens form', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('report-bug-btn'));
    expect(screen.getByTestId('bug-form')).toBeInTheDocument();
  });

  it('form validates required fields', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('report-bug-btn'));
    // The submit button wraps text in a span; find the actual button element
    const submitBtn = screen.getByText('Submit Bug Report').closest('button');
    expect(submitBtn).toBeDisabled();
  });

  it('form submit calls createBug', async () => {
    renderPage();
    const mockCreateBug = vi.mocked(useBugs).mock.results[0]?.value.createBug;

    fireEvent.click(screen.getByTestId('report-bug-btn'));
    fireEvent.change(screen.getByTestId('bug-title-input'), { target: { value: 'New bug' } });
    fireEvent.change(screen.getByTestId('bug-description-input'), { target: { value: 'Steps to reproduce' } });
    fireEvent.click(screen.getByText('Submit Bug Report'));

    await waitFor(() => {
      expect(mockCreateBug).toHaveBeenCalled();
    });
  });

  it('empty state shown when no bugs', () => {
    renderPage([]);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No bugs reported yet')).toBeInTheDocument();
  });

  it('loading state shows skeletons', () => {
    renderPage([], true);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('Mark Fixed button calls updateBugStatus', () => {
    renderPage();
    // Click on the first bug ID to expand it
    const bugId = screen.getAllByTestId('bug-id')[0];
    fireEvent.click(bugId.closest('[class*="cursor-pointer"]')!);
    // Click "Mark Fixed" button (open bugs show this)
    const markFixedBtn = screen.getByText('Mark Fixed');
    fireEvent.click(markFixedBtn);
    const mockUpdateStatus = vi.mocked(useBugs).mock.results[0]?.value.updateBugStatus;
    expect(mockUpdateStatus).toHaveBeenCalledWith('BUG-001', 'fixed');
  });
});
