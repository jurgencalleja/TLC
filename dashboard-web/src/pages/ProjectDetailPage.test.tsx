import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProjectDetailPage } from './ProjectDetailPage';

vi.mock('../stores/workspace.store', () => ({
  useWorkspaceStore: vi.fn((selector) => {
    const store = { selectedProjectId: 'proj1', selectProject: vi.fn() };
    return selector(store);
  }),
}));

function renderPage(path = '/projects/proj1') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/projects/:projectId/*" element={<ProjectDetailPage />}>
          <Route index element={<div data-testid="overview-content">Overview</div>} />
          <Route path="roadmap" element={<div data-testid="roadmap-content">Roadmap</div>} />
          <Route path="tasks" element={<div data-testid="tasks-content">Tasks</div>} />
          <Route path="tests" element={<div data-testid="tests-content">Tests</div>} />
          <Route path="bugs" element={<div data-testid="bugs-content">Bugs</div>} />
          <Route path="logs" element={<div data-testid="logs-content">Logs</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('ProjectDetailPage', () => {
  it('renders tab bar with all tabs', () => {
    renderPage();
    expect(screen.getByTestId('project-detail')).toBeInTheDocument();
    expect(screen.getByTestId('tab-bar')).toBeInTheDocument();
    expect(screen.getByTestId('tab-overview')).toBeInTheDocument();
    expect(screen.getByTestId('tab-roadmap')).toBeInTheDocument();
    expect(screen.getByTestId('tab-tasks')).toBeInTheDocument();
    expect(screen.getByTestId('tab-tests')).toBeInTheDocument();
    expect(screen.getByTestId('tab-bugs')).toBeInTheDocument();
    expect(screen.getByTestId('tab-logs')).toBeInTheDocument();
  });

  it('renders overview content for base path', () => {
    renderPage('/projects/proj1');
    expect(screen.getByTestId('overview-content')).toBeInTheDocument();
  });

  it('renders roadmap content for roadmap path', () => {
    renderPage('/projects/proj1/roadmap');
    expect(screen.getByTestId('roadmap-content')).toBeInTheDocument();
  });

  it('renders tasks content for tasks path', () => {
    renderPage('/projects/proj1/tasks');
    expect(screen.getByTestId('tasks-content')).toBeInTheDocument();
  });

  it('renders tests content for tests path', () => {
    renderPage('/projects/proj1/tests');
    expect(screen.getByTestId('tests-content')).toBeInTheDocument();
  });

  it('renders bugs content for bugs path', () => {
    renderPage('/projects/proj1/bugs');
    expect(screen.getByTestId('bugs-content')).toBeInTheDocument();
  });

  it('overview tab is active on base path', () => {
    renderPage('/projects/proj1');
    const tab = screen.getByTestId('tab-overview');
    expect(tab.getAttribute('aria-selected')).toBe('true');
  });

  it('tasks tab is active on tasks path', () => {
    renderPage('/projects/proj1/tasks');
    const tab = screen.getByTestId('tab-tasks');
    expect(tab.getAttribute('aria-selected')).toBe('true');
  });
});
