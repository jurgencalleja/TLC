/**
 * DashboardPage Tests — Project Overview Page
 * TDD: Tests written first to define expected behavior (RED phase)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from './DashboardPage';

// Mock hooks
vi.mock('../hooks', () => ({
  useProject: vi.fn(),
  useTasks: vi.fn(),
  useRoadmap: vi.fn(),
}));

// Mock stores
vi.mock('../stores', () => {
  const storeData = { setActiveView: vi.fn() };
  return {
    useUIStore: vi.fn((selector?: (s: typeof storeData) => unknown) =>
      selector ? selector(storeData) : storeData
    ),
  };
});

vi.mock('../stores/workspace.store', () => {
  const storeData = { selectedProjectId: 'proj-1', selectProject: vi.fn() };
  return {
    useWorkspaceStore: vi.fn((selector?: (s: typeof storeData) => unknown) =>
      selector ? selector(storeData) : storeData
    ),
  };
});

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ projectId: 'proj-1' }),
  };
});

import { useProject, useTasks, useRoadmap } from '../hooks';

const mockRoadmap = {
  milestones: [
    {
      name: 'v1.0 - Team Release',
      phases: [
        {
          number: 1, name: 'Core Infrastructure', goal: 'Establish TLC as source of truth',
          status: 'done' as const, deliverables: [{ text: 'CLAUDE.md enforcement', done: true }],
          taskCount: 3, completedTaskCount: 3, testCount: 47, testFileCount: 3, hasTests: true, verified: true,
        },
        {
          number: 2, name: 'Test Quality', goal: 'Improve test quality',
          status: 'in_progress' as const, deliverables: [{ text: 'Quality scoring', done: true }, { text: 'Edge cases', done: false }],
          taskCount: 5, completedTaskCount: 3, testCount: 30, testFileCount: 2, hasTests: true, verified: false,
        },
      ],
    },
    {
      name: 'v2.0 - Standalone',
      phases: [
        {
          number: 3, name: 'LLM Router', goal: 'Multi-model support',
          status: 'pending' as const, deliverables: [{ text: 'Model routing', done: false }],
          taskCount: 4, completedTaskCount: 0, testCount: 0, testFileCount: 0, hasTests: false, verified: false,
        },
      ],
    },
  ],
  currentPhase: { number: 2, name: 'Test Quality' },
  totalPhases: 3,
  completedPhases: 1,
  testSummary: { totalFiles: 5, totalTests: 77 },
  recentCommits: [
    { hash: 'abc1234', message: 'feat: add quality scoring', date: '2026-02-09', author: 'Jurgen' },
    { hash: 'def5678', message: 'fix: edge case detection', date: '2026-02-08', author: 'Jurgen' },
  ],
  projectInfo: { name: 'TLC', version: '1.8.0', description: 'Test-Led Coding framework' },
};

const defaultProjectMock = {
  project: { name: 'TLC', hasTlc: true, hasPlanning: true, phase: 2, phaseName: 'Test Quality', totalPhases: 3, version: '1.8.0', path: '/projects/tlc', branch: 'main' },
  status: null,
  loading: false,
  error: null,
  fetchProject: vi.fn(),
  fetchStatus: vi.fn(),
  refresh: vi.fn(),
};

const defaultTasksMock = {
  tasks: [],
  fetchTasks: vi.fn(),
};

const defaultRoadmapMock = {
  roadmap: mockRoadmap,
  loading: false,
  error: null,
  refresh: vi.fn(),
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/projects/proj-1']}>
      <DashboardPage />
    </MemoryRouter>
  );
}

describe('DashboardPage — Project Overview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useProject).mockReturnValue(defaultProjectMock as ReturnType<typeof useProject>);
    vi.mocked(useTasks).mockReturnValue(defaultTasksMock as ReturnType<typeof useTasks>);
    vi.mocked(useRoadmap).mockReturnValue(defaultRoadmapMock);
  });

  it('renders project name and version', () => {
    renderPage();
    expect(screen.getByTestId('project-name')).toHaveTextContent('TLC');
    expect(screen.getByTestId('project-version')).toHaveTextContent('1.8.0');
  });

  it('shows stat cards with correct numbers', () => {
    renderPage();
    expect(screen.getByTestId('stat-phases')).toHaveTextContent('1/3');
    expect(screen.getByTestId('stat-tests')).toHaveTextContent('77');
    expect(screen.getByTestId('stat-files')).toHaveTextContent('5');
    expect(screen.getByTestId('stat-current-phase')).toHaveTextContent('#2');
  });

  it('milestone headers rendered', () => {
    renderPage();
    const headers = screen.getAllByTestId('milestone-header');
    expect(headers).toHaveLength(2);
    expect(headers[0]).toHaveTextContent('v1.0 - Team Release');
    expect(headers[1]).toHaveTextContent('v2.0 - Standalone');
  });

  it('phase list shows all phases with correct status chips', () => {
    renderPage();
    const rows = screen.getAllByTestId('phase-row');
    expect(rows).toHaveLength(3);

    const chips = screen.getAllByTestId('phase-status');
    expect(chips[0]).toHaveTextContent('done');
    expect(chips[1]).toHaveTextContent('in_progress');
    expect(chips[2]).toHaveTextContent('pending');

    // done = success variant (green)
    expect(chips[0].className).toMatch(/success/);
    // in_progress = primary variant (blue)
    expect(chips[1].className).toMatch(/primary/);
    // pending = neutral variant (gray)
    expect(chips[2].className).toMatch(/neutral/);
  });

  it('current phase highlighted with accent', () => {
    renderPage();
    const rows = screen.getAllByTestId('phase-row');
    // Phase 2 (index 1) is in_progress / current
    expect(rows[1].className).toMatch(/current-phase/);
    // Others should not have it
    expect(rows[0].className).not.toMatch(/current-phase/);
    expect(rows[2].className).not.toMatch(/current-phase/);
  });

  it('click phase expands to show goal and deliverables', () => {
    renderPage();
    // Initially no goal visible
    expect(screen.queryByTestId('phase-goal')).not.toBeInTheDocument();

    // Click phase 2 row (index 1)
    const rows = screen.getAllByTestId('phase-row');
    fireEvent.click(rows[1]);

    expect(screen.getByTestId('phase-goal')).toHaveTextContent('Improve test quality');
    expect(screen.getByTestId('phase-deliverables')).toBeInTheDocument();
  });

  it('deliverables show checkmark for completed items', () => {
    renderPage();
    // Expand phase 2
    const rows = screen.getAllByTestId('phase-row');
    fireEvent.click(rows[1]);

    const deliverables = screen.getByTestId('phase-deliverables');
    // Done deliverable has checkmark
    expect(deliverables.textContent).toContain('\u2713');
    expect(deliverables.textContent).toContain('Quality scoring');
    // Pending deliverable has circle
    expect(deliverables.textContent).toContain('\u25CB');
    expect(deliverables.textContent).toContain('Edge cases');
  });

  it('task count shown in phase row', () => {
    renderPage();
    const taskCounts = screen.getAllByTestId('phase-tasks');
    expect(taskCounts[0]).toHaveTextContent('3/3');
    expect(taskCounts[1]).toHaveTextContent('3/5');
    expect(taskCounts[2]).toHaveTextContent('0/4');
  });

  it('recent commits displayed with short hash and message', () => {
    renderPage();
    expect(screen.getByTestId('recent-commits')).toBeInTheDocument();
    const hashes = screen.getAllByTestId('commit-hash');
    const messages = screen.getAllByTestId('commit-message');
    expect(hashes).toHaveLength(2);
    expect(hashes[0]).toHaveTextContent('abc1234');
    expect(hashes[1]).toHaveTextContent('def5678');
    expect(messages[0]).toHaveTextContent('feat: add quality scoring');
    expect(messages[1]).toHaveTextContent('fix: edge case detection');
  });

  it('empty state shown when no project', () => {
    vi.mocked(useProject).mockReturnValue({
      ...defaultProjectMock,
      project: null,
    } as ReturnType<typeof useProject>);
    vi.mocked(useRoadmap).mockReturnValue({ roadmap: null, loading: false, error: null, refresh: vi.fn() });

    renderPage();
    expect(screen.getByText('No Project Selected')).toBeInTheDocument();
  });

  it('non-TLC banner for projects without .planning', () => {
    vi.mocked(useProject).mockReturnValue({
      ...defaultProjectMock,
      project: { name: 'Other', hasTlc: false, hasPlanning: false, phase: 0, totalPhases: 0, path: '/tmp/other', version: '0.1.0' },
    } as ReturnType<typeof useProject>);
    vi.mocked(useRoadmap).mockReturnValue({ roadmap: null, loading: false, error: null, refresh: vi.fn() });

    renderPage();
    expect(screen.getByText(/\/tlc:init/)).toBeInTheDocument();
  });

  it('loading skeleton while fetching', () => {
    vi.mocked(useProject).mockReturnValue({
      ...defaultProjectMock,
      loading: true,
      project: null,
    } as ReturnType<typeof useProject>);
    vi.mocked(useRoadmap).mockReturnValue({ roadmap: null, loading: true, error: null, refresh: vi.fn() });

    renderPage();
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
