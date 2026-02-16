import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PhaseDetailPage } from './PhaseDetailPage';

vi.mock('../hooks', () => ({
  useRoadmap: vi.fn(),
  useTasks: vi.fn(),
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

import { useRoadmap, useTasks } from '../hooks';

const MOCK_ROADMAP = {
  milestones: [
    {
      name: 'v1.0 — Core',
      phases: [
        {
          number: 5,
          name: 'Memory Wiring',
          status: 'in_progress',
          goal: 'Wire memory API into the server',
          deliverables: [
            { text: 'Memory routes return data', done: true },
            { text: 'PhaseDetailPage works', done: false },
          ],
          taskCount: 6,
          completedTaskCount: 2,
          testCount: 15,
          testFileCount: 4,
          hasTests: true,
          verified: false,
        },
        {
          number: 6,
          name: 'Polish',
          status: 'pending',
          goal: 'UI polish pass',
          deliverables: [],
          taskCount: 3,
          completedTaskCount: 0,
          testCount: 0,
          testFileCount: 0,
          hasTests: false,
          verified: false,
        },
      ],
    },
  ],
  currentPhase: { number: 5, name: 'Memory Wiring' },
  totalPhases: 6,
  completedPhases: 4,
  testSummary: { totalFiles: 10, totalTests: 45 },
  recentCommits: [],
  projectInfo: { name: 'TLC', version: '1.2.24', description: '' },
};

const MOCK_TASKS = [
  { id: 't1', title: 'Convert memory-api to CJS', status: 'done', phase: 5, owner: null },
  { id: 't2', title: 'Create memory store adapter', status: 'in_progress', phase: 5, owner: 'alice' },
  { id: 't3', title: 'Wire into server', status: 'pending', phase: 5, owner: null },
  { id: 't4', title: 'Other phase task', status: 'pending', phase: 6, owner: null },
];

function renderPage(phaseNumber = '5', roadmap = MOCK_ROADMAP, loading = false) {
  vi.mocked(useRoadmap).mockReturnValue({
    roadmap,
    loading,
    error: null,
    refresh: vi.fn(),
  } as any);

  vi.mocked(useTasks).mockReturnValue({
    tasks: MOCK_TASKS,
    loading: false,
    error: null,
    refresh: vi.fn(),
  } as any);

  return render(
    <MemoryRouter initialEntries={[`/projects/proj1/phases/${phaseNumber}`]}>
      <Routes>
        <Route path="/projects/:projectId/phases/:phaseNumber" element={<PhaseDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PhaseDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays phase name and number', () => {
    renderPage();
    expect(screen.getByText(/Phase 5/)).toBeInTheDocument();
    expect(screen.getByText(/Memory Wiring/)).toBeInTheDocument();
  });

  it('shows status badge', () => {
    renderPage();
    expect(screen.getByTestId('phase-status-badge')).toBeInTheDocument();
  });

  it('shows goal text', () => {
    renderPage();
    expect(screen.getByText('Wire memory API into the server')).toBeInTheDocument();
  });

  it('shows deliverables with checkmarks', () => {
    renderPage();
    expect(screen.getByText('Memory routes return data')).toBeInTheDocument();
    expect(screen.getByText('PhaseDetailPage works')).toBeInTheDocument();
  });

  it('lists tasks filtered to this phase', () => {
    renderPage();
    expect(screen.getByText('Convert memory-api to CJS')).toBeInTheDocument();
    expect(screen.getByText('Create memory store adapter')).toBeInTheDocument();
    expect(screen.getByText('Wire into server')).toBeInTheDocument();
    // Phase 6 task should NOT appear
    expect(screen.queryByText('Other phase task')).not.toBeInTheDocument();
  });

  it('shows task status and assignee', () => {
    renderPage();
    // alice is the owner of the in_progress task
    expect(screen.getByText('alice')).toBeInTheDocument();
  });

  it('shows loading skeleton', () => {
    renderPage('5', MOCK_ROADMAP, true);
    expect(screen.getByTestId('phase-detail-loading')).toBeInTheDocument();
  });

  it('shows phase not found for invalid phase number', () => {
    renderPage('999');
    expect(screen.getByTestId('phase-not-found')).toBeInTheDocument();
  });

  it('has back navigation to roadmap', () => {
    renderPage();
    const backLink = screen.getByTestId('back-to-roadmap');
    expect(backLink).toBeInTheDocument();
  });
});
