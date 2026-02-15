import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProjectInfoPage } from './ProjectInfoPage';

vi.mock('../hooks/useProjectFiles', () => ({
  useProjectFiles: vi.fn(),
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

import { useProjectFiles } from '../hooks/useProjectFiles';

function renderPage({ content = '# Project\n\nThis is the project docs.', filename = 'PROJECT.md', loading = false, error = null as string | null } = {}) {
  vi.mocked(useProjectFiles).mockReturnValue({
    content,
    filename,
    loading,
    error,
    refresh: vi.fn(),
  });

  return render(
    <MemoryRouter initialEntries={['/projects/proj1/info']}>
      <Routes>
        <Route path="/projects/:projectId/info" element={<ProjectInfoPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProjectInfoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title', () => {
    renderPage();
    expect(screen.getByText('Project Info')).toBeInTheDocument();
  });

  it('renders markdown content', () => {
    renderPage({ content: '# My Project\n\nSome description here' });
    expect(screen.getByText('My Project')).toBeInTheDocument();
    expect(screen.getByText('Some description here')).toBeInTheDocument();
  });

  it('shows loading skeleton', () => {
    renderPage({ loading: true, content: null });
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('shows error message', () => {
    renderPage({ error: 'File not found', content: null });
    expect(screen.getByText(/File not found/)).toBeInTheDocument();
  });

  it('shows empty state when no content', () => {
    renderPage({ content: null, filename: null });
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('renders file selector buttons', () => {
    renderPage();
    expect(screen.getAllByText('PROJECT.md').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('ROADMAP.md')).toBeInTheDocument();
  });
});
