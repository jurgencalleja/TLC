import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TaskFilter } from './TaskFilter';

const mockAssignees = [
  { id: 'user-1', name: 'Alice' },
  { id: 'user-2', name: 'Bob' },
  { id: 'user-3', name: 'Charlie' },
];

describe('TaskFilter', () => {
  it('renders filter button', () => {
    render(<TaskFilter assignees={mockAssignees} onFilterChange={() => {}} />);
    expect(screen.getByTestId('task-filter')).toBeInTheDocument();
  });

  it('opens filter panel on click', () => {
    render(<TaskFilter assignees={mockAssignees} onFilterChange={() => {}} />);

    fireEvent.click(screen.getByTestId('task-filter'));
    expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
  });

  it('renders assignee checkboxes', () => {
    render(<TaskFilter assignees={mockAssignees} onFilterChange={() => {}} />);

    fireEvent.click(screen.getByTestId('task-filter'));

    expect(screen.getByLabelText('Alice')).toBeInTheDocument();
    expect(screen.getByLabelText('Bob')).toBeInTheDocument();
    expect(screen.getByLabelText('Charlie')).toBeInTheDocument();
  });

  it('renders priority checkboxes', () => {
    render(<TaskFilter assignees={mockAssignees} onFilterChange={() => {}} />);

    fireEvent.click(screen.getByTestId('task-filter'));

    expect(screen.getByLabelText('High')).toBeInTheDocument();
    expect(screen.getByLabelText('Medium')).toBeInTheDocument();
    expect(screen.getByLabelText('Low')).toBeInTheDocument();
  });

  it('calls onFilterChange when assignee selected', () => {
    const handleChange = vi.fn();
    render(<TaskFilter assignees={mockAssignees} onFilterChange={handleChange} />);

    fireEvent.click(screen.getByTestId('task-filter'));
    fireEvent.click(screen.getByLabelText('Alice'));

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        assignees: ['user-1'],
      })
    );
  });

  it('calls onFilterChange when priority selected', () => {
    const handleChange = vi.fn();
    render(<TaskFilter assignees={mockAssignees} onFilterChange={handleChange} />);

    fireEvent.click(screen.getByTestId('task-filter'));
    fireEvent.click(screen.getByLabelText('High'));

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        priorities: ['high'],
      })
    );
  });

  it('supports multiple selections', () => {
    const handleChange = vi.fn();
    render(<TaskFilter assignees={mockAssignees} onFilterChange={handleChange} />);

    fireEvent.click(screen.getByTestId('task-filter'));
    fireEvent.click(screen.getByLabelText('Alice'));
    fireEvent.click(screen.getByLabelText('Bob'));

    expect(handleChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        assignees: ['user-1', 'user-2'],
      })
    );
  });

  it('shows active filter count', () => {
    render(
      <TaskFilter
        assignees={mockAssignees}
        onFilterChange={() => {}}
        initialFilters={{ assignees: ['user-1'], priorities: ['high'] }}
      />
    );

    expect(screen.getByTestId('filter-count')).toHaveTextContent('2');
  });

  it('clears all filters on clear button click', () => {
    const handleChange = vi.fn();
    render(
      <TaskFilter
        assignees={mockAssignees}
        onFilterChange={handleChange}
        initialFilters={{ assignees: ['user-1'], priorities: ['high'] }}
      />
    );

    fireEvent.click(screen.getByTestId('task-filter'));
    fireEvent.click(screen.getByText('Clear all'));

    expect(handleChange).toHaveBeenCalledWith({
      assignees: [],
      priorities: [],
    });
  });

  it('renders unassigned option', () => {
    render(<TaskFilter assignees={mockAssignees} onFilterChange={() => {}} />);

    fireEvent.click(screen.getByTestId('task-filter'));

    expect(screen.getByLabelText('Unassigned')).toBeInTheDocument();
  });

  it('closes panel on outside click', () => {
    render(
      <div>
        <TaskFilter assignees={mockAssignees} onFilterChange={() => {}} />
        <button>Outside</button>
      </div>
    );

    fireEvent.click(screen.getByTestId('task-filter'));
    expect(screen.getByTestId('filter-panel')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByText('Outside'));
    expect(screen.queryByTestId('filter-panel')).not.toBeInTheDocument();
  });
});
