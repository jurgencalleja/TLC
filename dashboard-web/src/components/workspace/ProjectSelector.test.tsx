import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProjectSelector } from './ProjectSelector';

const mockProjects = [
  { id: 'p1', name: 'Project Alpha', path: '/projects/alpha' },
  { id: 'p2', name: 'Project Beta', path: '/projects/beta' },
  { id: 'p3', name: 'Project Gamma', path: '/projects/gamma' },
];

const defaultProps = {
  projects: mockProjects,
  selectedProjectId: null as string | null,
  onSelect: vi.fn(),
};

describe('ProjectSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders dropdown with project names', () => {
    render(<ProjectSelector {...defaultProps} />);

    const select = screen.getByTestId('project-selector');
    expect(select).toBeInTheDocument();

    // All project options should exist
    mockProjects.forEach((project) => {
      expect(screen.getByText(project.name)).toBeInTheDocument();
    });
  });

  it('shows current project as selected', () => {
    render(<ProjectSelector {...defaultProps} selectedProjectId="p2" />);

    const select = screen.getByTestId('project-selector') as HTMLSelectElement;
    expect(select.value).toBe('p2');
  });

  it('clicking project calls onSelect with ID', () => {
    const onSelect = vi.fn();
    render(<ProjectSelector {...defaultProps} onSelect={onSelect} />);

    const select = screen.getByTestId('project-selector');
    fireEvent.change(select, { target: { value: 'p3' } });

    expect(onSelect).toHaveBeenCalledWith('p3');
  });

  it('shows placeholder when no project selected', () => {
    render(<ProjectSelector {...defaultProps} selectedProjectId={null} />);

    const select = screen.getByTestId('project-selector') as HTMLSelectElement;
    expect(select.value).toBe('');
    expect(screen.getByText('Select a project...')).toBeInTheDocument();
  });

  it('shows correct number of projects in list', () => {
    render(<ProjectSelector {...defaultProps} />);

    const projectCount = screen.getByTestId('project-selector-count');
    expect(projectCount).toHaveTextContent('3 projects');
  });

  it('handles empty project list', () => {
    render(<ProjectSelector {...defaultProps} projects={[]} />);

    const select = screen.getByTestId('project-selector') as HTMLSelectElement;
    // Only the placeholder option should exist
    const options = select.querySelectorAll('option');
    expect(options).toHaveLength(1); // Just the placeholder

    const projectCount = screen.getByTestId('project-selector-count');
    expect(projectCount).toHaveTextContent('0 projects');
  });
});
