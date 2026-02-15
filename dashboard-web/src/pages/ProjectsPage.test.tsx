import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProjectsPage } from './ProjectsPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../stores', () => ({
  useUIStore: vi.fn((selector) => {
    const store = { setActiveView: vi.fn() };
    return selector(store);
  }),
}));

vi.mock('../stores/workspace.store', () => ({
  useWorkspaceStore: vi.fn((selector) => {
    const store = { selectedProjectId: null, selectProject: vi.fn() };
    return selector(store);
  }),
}));

vi.mock('../hooks/useWorkspaceGroups', () => ({
  useWorkspaceGroups: vi.fn(),
}));

import { useWorkspaceGroups } from '../hooks/useWorkspaceGroups';

const MOCK_GROUPS = [
  {
    name: 'Kasha-Platform',
    path: '/repos/Kasha-Platform',
    repoCount: 3,
    hasTlc: true,
    repos: [
      { id: 'a1', name: 'lr-admin-service', path: '/repos/Kasha-Platform/lr-admin-service', hasTlc: true, phase: 5, phaseName: 'Auth', totalPhases: 10, completedPhases: 4 },
      { id: 'a2', name: 'lr-mobile-app', path: '/repos/Kasha-Platform/lr-mobile-app', hasTlc: false },
      { id: 'a3', name: 'lr-api-gateway', path: '/repos/Kasha-Platform/lr-api-gateway', hasTlc: true, phase: 2, phaseName: 'Setup', totalPhases: 5, completedPhases: 1 },
    ],
  },
  {
    name: 'TLC',
    path: '/repos/TLC',
    repoCount: 1,
    hasTlc: true,
    repos: [
      { id: 'b1', name: 'TLC', path: '/repos/TLC/TLC', hasTlc: true, phase: 76, phaseName: 'Dashboard', totalPhases: 80, completedPhases: 75 },
    ],
  },
];

function renderPage(groups = MOCK_GROUPS, loading = false, error: string | null = null) {
  vi.mocked(useWorkspaceGroups).mockReturnValue({
    groups,
    loading,
    error,
    fetchGroups: vi.fn(),
  });

  return render(
    <MemoryRouter>
      <ProjectsPage />
    </MemoryRouter>
  );
}

describe('ProjectsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders workspace groups as cards', () => {
    renderPage();
    expect(screen.getByText('Kasha-Platform')).toBeInTheDocument();
    expect(screen.getByTestId('group-count-TLC')).toBeInTheDocument();
  });

  it('shows repo count per group', () => {
    renderPage();
    expect(screen.getByTestId('group-count-Kasha-Platform')).toHaveTextContent('3');
    expect(screen.getByTestId('group-count-TLC')).toHaveTextContent('1');
  });

  it('shows TLC badge on groups with TLC projects', () => {
    renderPage();
    const badges = screen.getAllByTestId('tlc-badge');
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it('click workspace group shows its repos', () => {
    renderPage();
    fireEvent.click(screen.getByText('Kasha-Platform'));
    // After clicking, should show individual repos
    expect(screen.getByText('lr-admin-service')).toBeInTheDocument();
    expect(screen.getByText('lr-mobile-app')).toBeInTheDocument();
    expect(screen.getByText('lr-api-gateway')).toBeInTheDocument();
  });

  it('single-repo group navigates directly to project', () => {
    renderPage();
    // TLC group has 1 repo — clicking its card should navigate directly
    const tlcCard = screen.getByTestId('group-count-TLC').closest('[class*="cursor-pointer"]')!;
    fireEvent.click(tlcCard);
    expect(mockNavigate).toHaveBeenCalledWith('/projects/b1');
  });

  it('shows search input', () => {
    renderPage();
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('search filters groups by name', () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'kasha' } });
    expect(screen.getByText('Kasha-Platform')).toBeInTheDocument();
    expect(screen.queryByTestId('group-count-TLC')).not.toBeInTheDocument();
  });

  it('shows loading skeletons', () => {
    renderPage([], true);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('shows empty state when no groups', () => {
    renderPage([]);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('shows error state', () => {
    renderPage([], false, 'Network error');
    expect(screen.getByText(/network error/i)).toBeInTheDocument();
  });

  it('back button returns from repo view to group view', () => {
    renderPage();
    // Click into multi-repo group
    fireEvent.click(screen.getByText('Kasha-Platform'));
    expect(screen.getByText('lr-admin-service')).toBeInTheDocument();
    // Click back
    fireEvent.click(screen.getByTestId('back-to-groups'));
    expect(screen.getByText('Kasha-Platform')).toBeInTheDocument();
    expect(screen.getByTestId('group-count-TLC')).toBeInTheDocument();
  });

  it('clicking a repo in expanded group navigates to project', () => {
    renderPage();
    fireEvent.click(screen.getByText('Kasha-Platform'));
    fireEvent.click(screen.getByText('lr-admin-service'));
    expect(mockNavigate).toHaveBeenCalledWith('/projects/a1');
  });
});
