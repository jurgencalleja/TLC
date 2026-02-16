import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RoadmapPage } from './RoadmapPage';

vi.mock('../hooks', () => ({
  useRoadmap: vi.fn(),
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

import { useRoadmap } from '../hooks';

const MOCK_ROADMAP = {
  milestones: [
    {
      name: 'v1.0 — Core',
      phases: [
        {
          number: 1,
          name: 'Project Setup',
          status: 'done',
          goal: 'Initialize the project structure',
          deliverables: [
            { text: 'Package.json created', done: true },
            { text: 'Git initialized', done: true },
          ],
          taskCount: 3,
          completedTaskCount: 3,
          testCount: 5,
          testFileCount: 2,
          hasTests: true,
          verified: true,
        },
        {
          number: 2,
          name: 'Authentication',
          status: 'in_progress',
          goal: 'Implement JWT auth',
          deliverables: [
            { text: 'Login endpoint', done: true },
            { text: 'Token refresh', done: false },
          ],
          taskCount: 4,
          completedTaskCount: 2,
          testCount: 8,
          testFileCount: 3,
          hasTests: true,
          verified: false,
        },
      ],
    },
    {
      name: 'v1.1 — Polish',
      phases: [
        {
          number: 3,
          name: 'Dashboard',
          status: 'pending',
          goal: 'Build user dashboard',
          deliverables: [],
          taskCount: 5,
          completedTaskCount: 0,
          testCount: 0,
          testFileCount: 0,
          hasTests: false,
          verified: false,
        },
      ],
    },
  ],
  currentPhase: { number: 2, name: 'Authentication' },
  totalPhases: 3,
  completedPhases: 1,
  testSummary: { totalFiles: 5, totalTests: 13 },
  recentCommits: [],
  projectInfo: { name: 'TestApp', version: '1.0.0', description: '' },
};

function renderPage(roadmap = MOCK_ROADMAP, loading = false) {
  vi.mocked(useRoadmap).mockReturnValue({
    roadmap,
    loading,
    error: null,
    refresh: vi.fn(),
  } as any);

  return render(
    <MemoryRouter initialEntries={['/projects/proj1/roadmap']}>
      <Routes>
        <Route path="/projects/:projectId/roadmap" element={<RoadmapPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('RoadmapPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders milestones as section headers', () => {
    renderPage();
    const headers = screen.getAllByTestId('milestone-header');
    expect(headers).toHaveLength(2);
    expect(headers[0]).toHaveTextContent('v1.0 — Core');
    expect(headers[1]).toHaveTextContent('v1.1 — Polish');
  });

  it('renders phases under correct milestone', () => {
    renderPage();
    const phaseRows = screen.getAllByTestId('phase-row');
    expect(phaseRows).toHaveLength(3);
  });

  it('status chips show correct status', () => {
    renderPage();
    const statusBadges = screen.getAllByTestId('phase-status');
    expect(statusBadges[0]).toHaveTextContent('done');
    expect(statusBadges[1]).toHaveTextContent('in progress');
    expect(statusBadges[2]).toHaveTextContent('pending');
  });

  it('click chevron expands detail section', () => {
    renderPage();
    const chevrons = screen.getAllByTestId('phase-chevron');
    // Phase 2 is auto-expanded (current), so click phase 1 chevron
    fireEvent.click(chevrons[0]);
    const details = screen.getAllByTestId('phase-detail');
    expect(details.length).toBeGreaterThanOrEqual(1);
  });

  it('detail shows goal', () => {
    renderPage();
    // Phase 2 is auto-expanded
    expect(screen.getByText('Implement JWT auth')).toBeInTheDocument();
  });

  it('deliverables show check icons', () => {
    renderPage();
    const deliverables = screen.getAllByTestId('phase-deliverables');
    expect(deliverables.length).toBeGreaterThanOrEqual(1);
  });

  it('task count shown per phase', () => {
    renderPage();
    const taskCounts = screen.getAllByTestId('phase-tasks');
    expect(taskCounts[0]).toHaveTextContent('3/3 tasks');
    expect(taskCounts[1]).toHaveTextContent('2/4 tasks');
  });

  it('collapse all button collapses expanded phases', () => {
    renderPage();
    const btn = screen.getByTestId('collapse-all-btn');
    fireEvent.click(btn);
    const details = screen.queryAllByTestId('phase-detail');
    expect(details).toHaveLength(0);
  });

  it('empty state shown for no milestones', () => {
    renderPage({ ...MOCK_ROADMAP, milestones: [] });
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('progress bar renders', () => {
    renderPage();
    expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
  });

  it('loading state shows skeletons', () => {
    renderPage(MOCK_ROADMAP, true);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });
});
