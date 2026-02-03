import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { ProjectGrid } from './ProjectGrid';
import type { Project } from './ProjectCard';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

const mockProjects: Project[] = [
  {
    id: 'project-1',
    name: 'Alpha Project',
    description: 'First project',
    status: 'healthy',
    branch: 'main',
    tests: { passed: 50, failed: 0, total: 50 },
    coverage: 95,
    lastActivity: '2024-01-15T10:00:00Z',
  },
  {
    id: 'project-2',
    name: 'Beta Project',
    description: 'Second project',
    status: 'failing',
    branch: 'develop',
    tests: { passed: 30, failed: 5, total: 35 },
    coverage: 60,
    lastActivity: '2024-01-14T10:00:00Z',
  },
  {
    id: 'project-3',
    name: 'Gamma Project',
    description: 'Third project',
    status: 'building',
    branch: 'feature/test',
    tests: { passed: 20, failed: 0, total: 20 },
    coverage: 80,
    lastActivity: '2024-01-13T10:00:00Z',
  },
];

describe('ProjectGrid', () => {
  it('renders all projects', () => {
    renderWithRouter(<ProjectGrid projects={mockProjects} />);

    expect(screen.getByText('Alpha Project')).toBeInTheDocument();
    expect(screen.getByText('Beta Project')).toBeInTheDocument();
    expect(screen.getByText('Gamma Project')).toBeInTheDocument();
  });

  it('renders empty state when no projects', () => {
    renderWithRouter(<ProjectGrid projects={[]} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText(/no projects/i)).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderWithRouter(<ProjectGrid projects={mockProjects} />);
    expect(screen.getByPlaceholderText(/search projects/i)).toBeInTheDocument();
  });

  it('filters projects by search query', () => {
    renderWithRouter(<ProjectGrid projects={mockProjects} />);

    fireEvent.change(screen.getByPlaceholderText(/search projects/i), {
      target: { value: 'Alpha' },
    });

    expect(screen.getByText('Alpha Project')).toBeInTheDocument();
    expect(screen.queryByText('Beta Project')).not.toBeInTheDocument();
    expect(screen.queryByText('Gamma Project')).not.toBeInTheDocument();
  });

  it('filters projects by description', () => {
    renderWithRouter(<ProjectGrid projects={mockProjects} />);

    fireEvent.change(screen.getByPlaceholderText(/search projects/i), {
      target: { value: 'Second' },
    });

    expect(screen.queryByText('Alpha Project')).not.toBeInTheDocument();
    expect(screen.getByText('Beta Project')).toBeInTheDocument();
  });

  it('shows no results message when search matches nothing', () => {
    renderWithRouter(<ProjectGrid projects={mockProjects} />);

    fireEvent.change(screen.getByPlaceholderText(/search projects/i), {
      target: { value: 'nonexistent' },
    });

    expect(screen.getByText(/no projects found/i)).toBeInTheDocument();
  });

  it('renders filter dropdown', () => {
    renderWithRouter(<ProjectGrid projects={mockProjects} />);
    expect(screen.getByTestId('status-filter')).toBeInTheDocument();
  });

  it('filters by status', () => {
    renderWithRouter(<ProjectGrid projects={mockProjects} />);

    // Click the filter dropdown button
    const filterContainer = screen.getByTestId('status-filter');
    fireEvent.click(filterContainer.querySelector('button')!);

    // Find the Failing option in the dropdown menu
    const menuItems = screen.getAllByRole('menuitem');
    const failingOption = menuItems.find(item => item.textContent === 'Failing');
    fireEvent.click(failingOption!);

    expect(screen.queryByText('Alpha Project')).not.toBeInTheDocument();
    expect(screen.getByText('Beta Project')).toBeInTheDocument();
    expect(screen.queryByText('Gamma Project')).not.toBeInTheDocument();
  });

  it('renders sort dropdown', () => {
    renderWithRouter(<ProjectGrid projects={mockProjects} />);
    expect(screen.getByTestId('sort-select')).toBeInTheDocument();
  });

  it('sorts by name ascending', () => {
    renderWithRouter(<ProjectGrid projects={mockProjects} />);

    const sortContainer = screen.getByTestId('sort-select');
    fireEvent.click(sortContainer.querySelector('button')!);
    const menuItems = screen.getAllByRole('menuitem');
    const nameAscOption = menuItems.find(item => item.textContent === 'Name (A-Z)');
    fireEvent.click(nameAscOption!);

    const cards = screen.getAllByTestId('project-card');
    expect(cards[0]).toHaveTextContent('Alpha Project');
    expect(cards[1]).toHaveTextContent('Beta Project');
    expect(cards[2]).toHaveTextContent('Gamma Project');
  });

  it('sorts by name descending', () => {
    renderWithRouter(<ProjectGrid projects={mockProjects} />);

    const sortContainer = screen.getByTestId('sort-select');
    fireEvent.click(sortContainer.querySelector('button')!);
    const menuItems = screen.getAllByRole('menuitem');
    const nameDescOption = menuItems.find(item => item.textContent === 'Name (Z-A)');
    fireEvent.click(nameDescOption!);

    const cards = screen.getAllByTestId('project-card');
    expect(cards[0]).toHaveTextContent('Gamma Project');
    expect(cards[2]).toHaveTextContent('Alpha Project');
  });

  it('sorts by coverage', () => {
    renderWithRouter(<ProjectGrid projects={mockProjects} />);

    const sortContainer = screen.getByTestId('sort-select');
    fireEvent.click(sortContainer.querySelector('button')!);
    const menuItems = screen.getAllByRole('menuitem');
    const coverageOption = menuItems.find(item => item.textContent === 'Coverage');
    fireEvent.click(coverageOption!);

    const cards = screen.getAllByTestId('project-card');
    expect(cards[0]).toHaveTextContent('Alpha Project'); // 95%
    expect(cards[2]).toHaveTextContent('Beta Project'); // 60%
  });

  it('sorts by last activity', () => {
    renderWithRouter(<ProjectGrid projects={mockProjects} />);

    const sortContainer = screen.getByTestId('sort-select');
    fireEvent.click(sortContainer.querySelector('button')!);
    const menuItems = screen.getAllByRole('menuitem');
    const activityOption = menuItems.find(item => item.textContent === 'Recent Activity');
    fireEvent.click(activityOption!);

    const cards = screen.getAllByTestId('project-card');
    expect(cards[0]).toHaveTextContent('Alpha Project'); // most recent
  });

  it('renders in responsive grid', () => {
    renderWithRouter(<ProjectGrid projects={mockProjects} />);
    const grid = screen.getByTestId('project-grid');
    expect(grid).toHaveClass('grid');
  });

  it('shows loading state', () => {
    renderWithRouter(<ProjectGrid projects={[]} isLoading />);
    expect(screen.getAllByTestId('skeleton-card').length).toBeGreaterThan(0);
  });

  it('calls onProjectClick when project clicked', () => {
    const handleClick = vi.fn();
    renderWithRouter(<ProjectGrid projects={mockProjects} onProjectClick={handleClick} />);

    fireEvent.click(screen.getByText('Alpha Project'));
    expect(handleClick).toHaveBeenCalled();
  });
});
