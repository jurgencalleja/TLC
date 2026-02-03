import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { ProjectCard } from './ProjectCard';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

const mockProject = {
  id: 'test-project',
  name: 'Test Project',
  description: 'A test project for testing',
  status: 'healthy' as const,
  branch: 'main',
  tests: { passed: 45, failed: 2, total: 47 },
  coverage: 78,
  lastActivity: '2024-01-15T10:30:00Z',
};

describe('ProjectCard', () => {
  it('renders project name', () => {
    renderWithRouter(<ProjectCard project={mockProject} />);
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('renders project description', () => {
    renderWithRouter(<ProjectCard project={mockProject} />);
    expect(screen.getByText('A test project for testing')).toBeInTheDocument();
  });

  it('renders branch name', () => {
    renderWithRouter(<ProjectCard project={mockProject} />);
    expect(screen.getByText('main')).toBeInTheDocument();
  });

  it('renders test stats', () => {
    renderWithRouter(<ProjectCard project={mockProject} />);
    expect(screen.getByText('45')).toBeInTheDocument(); // passed
    expect(screen.getByText('2')).toBeInTheDocument(); // failed
  });

  it('renders coverage percentage', () => {
    renderWithRouter(<ProjectCard project={mockProject} />);
    expect(screen.getByText('78%')).toBeInTheDocument();
  });

  it('renders healthy status indicator', () => {
    renderWithRouter(<ProjectCard project={mockProject} />);
    expect(screen.getByTestId('status-indicator')).toHaveClass('bg-success');
  });

  it('renders failing status indicator', () => {
    const failingProject = { ...mockProject, status: 'failing' as const };
    renderWithRouter(<ProjectCard project={failingProject} />);
    expect(screen.getByTestId('status-indicator')).toHaveClass('bg-error');
  });

  it('renders building status indicator', () => {
    const buildingProject = { ...mockProject, status: 'building' as const };
    renderWithRouter(<ProjectCard project={buildingProject} />);
    expect(screen.getByTestId('status-indicator')).toHaveClass('bg-warning');
  });

  it('renders unknown status indicator', () => {
    const unknownProject = { ...mockProject, status: 'unknown' as const };
    renderWithRouter(<ProjectCard project={unknownProject} />);
    expect(screen.getByTestId('status-indicator')).toHaveClass('bg-muted');
  });

  it('is clickable and navigates to project', () => {
    renderWithRouter(<ProjectCard project={mockProject} />);
    const card = screen.getByTestId('project-card');
    expect(card.closest('a')).toHaveAttribute('href', '/project/test-project');
  });

  it('calls onClick when provided', () => {
    const handleClick = vi.fn();
    renderWithRouter(<ProjectCard project={mockProject} onClick={handleClick} />);

    fireEvent.click(screen.getByTestId('project-card'));
    expect(handleClick).toHaveBeenCalledWith(mockProject);
  });

  it('shows relative time for last activity', () => {
    renderWithRouter(<ProjectCard project={mockProject} />);
    // Should show some form of relative time
    expect(screen.getByTestId('last-activity')).toBeInTheDocument();
  });

  it('shows coverage progress bar', () => {
    renderWithRouter(<ProjectCard project={mockProject} />);
    const progressBar = screen.getByTestId('coverage-bar');
    expect(progressBar).toHaveStyle({ width: '78%' });
  });

  it('applies custom className', () => {
    renderWithRouter(<ProjectCard project={mockProject} className="custom-card" />);
    expect(screen.getByTestId('project-card')).toHaveClass('custom-card');
  });

  it('shows no description placeholder when missing', () => {
    const noDescProject = { ...mockProject, description: undefined };
    renderWithRouter(<ProjectCard project={noDescProject} />);
    expect(screen.getByText('No description')).toBeInTheDocument();
  });

  it('truncates long descriptions', () => {
    const longDescProject = {
      ...mockProject,
      description: 'A'.repeat(200),
    };
    renderWithRouter(<ProjectCard project={longDescProject} />);
    const desc = screen.getByTestId('project-description');
    expect(desc).toHaveClass('line-clamp-2');
  });
});
