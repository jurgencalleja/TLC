/**
 * TestSuitePage Tests
 * TDD: Tests written first to define expected behavior
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TestSuitePage } from './TestSuitePage';

// Mock the hooks
vi.mock('../hooks', () => ({
  useTestSuite: vi.fn(),
}));

// Mock the stores
vi.mock('../stores', () => ({
  useUIStore: vi.fn((selector: (state: { setActiveView: ReturnType<typeof vi.fn> }) => unknown) =>
    selector({ setActiveView: vi.fn() })
  ),
}));

vi.mock('../stores/workspace.store', () => ({
  useWorkspaceStore: vi.fn(
    (selector: (state: { selectedProjectId: string; selectProject: ReturnType<typeof vi.fn> }) => unknown) =>
      selector({ selectedProjectId: 'proj-1', selectProject: vi.fn() })
  ),
}));

import { useTestSuite } from '../hooks';

const mockRunTests = vi.fn();

const mockInventory = {
  totalFiles: 12,
  totalTests: 350,
  groups: [
    {
      name: 'server/lib',
      fileCount: 8,
      testCount: 280,
      files: [
        { relativePath: 'server/lib/auth.test.js', testCount: 45 },
        { relativePath: 'server/lib/tasks.test.js', testCount: 38 },
        { relativePath: 'server/lib/memory.test.js', testCount: 32 },
      ],
    },
    {
      name: 'dashboard-web/src',
      fileCount: 4,
      testCount: 70,
      files: [
        { relativePath: 'dashboard-web/src/App.test.tsx', testCount: 25 },
        { relativePath: 'dashboard-web/src/hooks/useProject.test.ts', testCount: 15 },
      ],
    },
  ],
  lastRun: {
    timestamp: '2026-02-09T10:30:00Z',
    passed: 347,
    failed: 3,
    total: 350,
    duration: 12500,
  },
};

const renderPage = (route = '/test-suite') => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/test-suite" element={<TestSuitePage />} />
        <Route path="/projects/:projectId/test-suite" element={<TestSuitePage />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('TestSuitePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTestSuite).mockReturnValue({
      inventory: mockInventory,
      loading: false,
      error: null,
      refresh: vi.fn(),
      runTests: mockRunTests,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders summary bar with totals', () => {
    renderPage();

    expect(screen.getByTestId('summary-files')).toHaveTextContent('12');
    expect(screen.getByTestId('summary-tests')).toHaveTextContent('350');
    expect(screen.getByTestId('summary-groups')).toHaveTextContent('2');
  });

  it('groups table shows directories with counts', () => {
    renderPage();

    const groupRows = screen.getAllByTestId('group-row');
    expect(groupRows).toHaveLength(2);

    const groupNames = screen.getAllByTestId('group-name');
    expect(groupNames[0]).toHaveTextContent('server/lib');
    expect(groupNames[1]).toHaveTextContent('dashboard-web/src');

    const groupFiles = screen.getAllByTestId('group-files');
    expect(groupFiles[0]).toHaveTextContent('8');
    expect(groupFiles[1]).toHaveTextContent('4');

    const groupTests = screen.getAllByTestId('group-tests');
    expect(groupTests[0]).toHaveTextContent('280');
    expect(groupTests[1]).toHaveTextContent('70');
  });

  it('click group expands to show files', () => {
    renderPage();

    // Files should not be visible initially
    expect(screen.queryAllByTestId('file-row')).toHaveLength(0);

    // Click first group to expand
    const groupRows = screen.getAllByTestId('group-row');
    fireEvent.click(groupRows[0]);

    // Now files should be visible
    const fileRows = screen.getAllByTestId('file-row');
    expect(fileRows).toHaveLength(3);

    const fileNames = screen.getAllByTestId('file-name');
    expect(fileNames[0]).toHaveTextContent('server/lib/auth.test.js');
    expect(fileNames[1]).toHaveTextContent('server/lib/tasks.test.js');
    expect(fileNames[2]).toHaveTextContent('server/lib/memory.test.js');

    const fileTests = screen.getAllByTestId('file-tests');
    expect(fileTests[0]).toHaveTextContent('45');
    expect(fileTests[1]).toHaveTextContent('38');
    expect(fileTests[2]).toHaveTextContent('32');
  });

  it('Run Tests button triggers API call', () => {
    renderPage();

    const runButton = screen.getByTestId('run-tests-btn');
    fireEvent.click(runButton);

    expect(mockRunTests).toHaveBeenCalledTimes(1);
  });

  it('empty state when no test files', () => {
    vi.mocked(useTestSuite).mockReturnValue({
      inventory: { totalFiles: 0, totalTests: 0, groups: [], lastRun: null },
      loading: false,
      error: null,
      refresh: vi.fn(),
      runTests: mockRunTests,
    });

    renderPage();

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText(/no test files found/i)).toBeInTheDocument();
  });

  it('search filters file list', () => {
    renderPage();

    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'server' } });

    // Only the server/lib group should remain
    const groupRows = screen.getAllByTestId('group-row');
    expect(groupRows).toHaveLength(1);
    expect(screen.getByTestId('group-name')).toHaveTextContent('server/lib');
  });

  it('groups sorted by test count descending', () => {
    renderPage();

    const groupTests = screen.getAllByTestId('group-tests');
    const counts = groupTests.map((el) => parseInt(el.textContent || '0', 10));

    // First group should have more tests than second
    expect(counts[0]).toBeGreaterThan(counts[1]);
  });

  it('loading state while fetching', () => {
    vi.mocked(useTestSuite).mockReturnValue({
      inventory: null,
      loading: true,
      error: null,
      refresh: vi.fn(),
      runTests: mockRunTests,
    });

    renderPage();

    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('shows last run results when available', () => {
    renderPage();

    const lastRun = screen.getByTestId('last-run');
    expect(lastRun).toHaveTextContent(/347/);
    expect(lastRun).toHaveTextContent(/3/);
    expect(lastRun).toHaveTextContent(/12\.5/);
  });

  it('per-project route scopes to project', () => {
    renderPage('/projects/proj-42/test-suite');

    // Should call useTestSuite with the URL project ID
    expect(useTestSuite).toHaveBeenCalledWith('proj-42');
  });
});
