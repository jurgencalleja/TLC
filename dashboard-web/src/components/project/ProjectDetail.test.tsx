import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { ProjectDetail } from './ProjectDetail';
import type { Project } from './ProjectCard';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

const mockProject: Project = {
  id: 'test-project',
  name: 'Test Project',
  description: 'A comprehensive test project',
  status: 'healthy',
  branch: 'main',
  tests: { passed: 45, failed: 2, total: 47 },
  coverage: 78,
  lastActivity: '2024-01-15T10:30:00Z',
};

const mockBranches = [
  { name: 'main', isDefault: true, ahead: 0, behind: 0 },
  { name: 'develop', isDefault: false, ahead: 3, behind: 1 },
];

describe('ProjectDetail', () => {
  it('renders project name', () => {
    renderWithRouter(
      <ProjectDetail project={mockProject} branches={mockBranches} />
    );
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('renders project description', () => {
    renderWithRouter(
      <ProjectDetail project={mockProject} branches={mockBranches} />
    );
    expect(screen.getByText('A comprehensive test project')).toBeInTheDocument();
  });

  it('renders branch selector', () => {
    renderWithRouter(
      <ProjectDetail project={mockProject} branches={mockBranches} />
    );
    expect(screen.getByTestId('branch-selector')).toBeInTheDocument();
  });

  it('renders status badge', () => {
    renderWithRouter(
      <ProjectDetail project={mockProject} branches={mockBranches} />
    );
    expect(screen.getByTestId('status-badge')).toBeInTheDocument();
    expect(screen.getByText('Healthy')).toBeInTheDocument();
  });

  it('renders all tabs', () => {
    renderWithRouter(
      <ProjectDetail project={mockProject} branches={mockBranches} />
    );

    expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /tasks/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /tests/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /logs/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /settings/i })).toBeInTheDocument();
  });

  it('shows overview tab by default', () => {
    renderWithRouter(
      <ProjectDetail project={mockProject} branches={mockBranches} />
    );

    expect(screen.getByRole('tab', { name: /overview/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByTestId('overview-panel')).toBeInTheDocument();
  });

  it('switches to tasks tab', () => {
    renderWithRouter(
      <ProjectDetail project={mockProject} branches={mockBranches} />
    );

    fireEvent.click(screen.getByRole('tab', { name: /tasks/i }));

    expect(screen.getByRole('tab', { name: /tasks/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByTestId('tasks-panel')).toBeInTheDocument();
  });

  it('switches to tests tab', () => {
    renderWithRouter(
      <ProjectDetail project={mockProject} branches={mockBranches} />
    );

    fireEvent.click(screen.getByRole('tab', { name: /tests/i }));

    expect(screen.getByTestId('tests-panel')).toBeInTheDocument();
  });

  it('switches to logs tab', () => {
    renderWithRouter(
      <ProjectDetail project={mockProject} branches={mockBranches} />
    );

    fireEvent.click(screen.getByRole('tab', { name: /logs/i }));

    expect(screen.getByTestId('logs-panel')).toBeInTheDocument();
  });

  it('switches to settings tab', () => {
    renderWithRouter(
      <ProjectDetail project={mockProject} branches={mockBranches} />
    );

    fireEvent.click(screen.getByRole('tab', { name: /settings/i }));

    expect(screen.getByTestId('settings-panel')).toBeInTheDocument();
  });

  it('shows test stats in overview', () => {
    renderWithRouter(
      <ProjectDetail project={mockProject} branches={mockBranches} />
    );

    expect(screen.getByText('45')).toBeInTheDocument(); // passed
    expect(screen.getByText('2')).toBeInTheDocument(); // failed
  });

  it('shows coverage in overview', () => {
    renderWithRouter(
      <ProjectDetail project={mockProject} branches={mockBranches} />
    );

    expect(screen.getByText('78%')).toBeInTheDocument();
  });

  it('calls onBranchChange when branch selected', () => {
    const handleBranchChange = vi.fn();
    renderWithRouter(
      <ProjectDetail
        project={mockProject}
        branches={mockBranches}
        onBranchChange={handleBranchChange}
      />
    );

    fireEvent.click(screen.getByTestId('branch-selector'));
    fireEvent.click(screen.getByText('develop'));

    expect(handleBranchChange).toHaveBeenCalledWith('develop');
  });

  it('shows back button', () => {
    renderWithRouter(
      <ProjectDetail project={mockProject} branches={mockBranches} />
    );

    expect(screen.getByLabelText(/back/i)).toBeInTheDocument();
  });

  it('navigates with keyboard', () => {
    renderWithRouter(
      <ProjectDetail project={mockProject} branches={mockBranches} />
    );

    const tabs = screen.getAllByRole('tab');
    tabs[0].focus();

    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tabs[1]);

    fireEvent.keyDown(tabs[1], { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(tabs[0]);
  });

  it('shows loading skeleton when loading', () => {
    renderWithRouter(
      <ProjectDetail
        project={mockProject}
        branches={mockBranches}
        isLoading
      />
    );

    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('applies custom className', () => {
    renderWithRouter(
      <ProjectDetail
        project={mockProject}
        branches={mockBranches}
        className="custom-detail"
      />
    );

    expect(screen.getByTestId('project-detail')).toHaveClass('custom-detail');
  });
});
