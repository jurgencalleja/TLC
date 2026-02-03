import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TaskCard } from './TaskCard';

const mockTask = {
  id: 'task-1',
  title: 'Implement user authentication',
  description: 'Add login and registration endpoints',
  status: 'in_progress' as const,
  priority: 'high' as const,
  assignee: { id: 'user-1', name: 'Alice', avatar: '' },
  testStatus: { passed: 3, failed: 1, total: 4 },
  phase: 1,
  createdAt: '2024-01-10T10:00:00Z',
  updatedAt: '2024-01-15T14:30:00Z',
};

describe('TaskCard', () => {
  it('renders task title', () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByText('Implement user authentication')).toBeInTheDocument();
  });

  it('renders task description', () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByText('Add login and registration endpoints')).toBeInTheDocument();
  });

  it('renders priority badge', () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByTestId('priority-badge')).toHaveTextContent('high');
  });

  it('renders high priority with correct color', () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByTestId('priority-badge')).toHaveClass('bg-error');
  });

  it('renders medium priority with correct color', () => {
    const mediumTask = { ...mockTask, priority: 'medium' as const };
    render(<TaskCard task={mediumTask} />);
    expect(screen.getByTestId('priority-badge')).toHaveClass('bg-warning');
  });

  it('renders low priority with correct color', () => {
    const lowTask = { ...mockTask, priority: 'low' as const };
    render(<TaskCard task={lowTask} />);
    expect(screen.getByTestId('priority-badge')).toHaveClass('bg-info');
  });

  it('renders assignee name', () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('renders assignee avatar', () => {
    const taskWithAvatar = {
      ...mockTask,
      assignee: { ...mockTask.assignee, avatar: 'https://example.com/avatar.png' },
    };
    render(<TaskCard task={taskWithAvatar} />);
    expect(screen.getByTestId('assignee-avatar')).toBeInTheDocument();
  });

  it('renders unassigned placeholder when no assignee', () => {
    const unassignedTask = { ...mockTask, assignee: undefined };
    render(<TaskCard task={unassignedTask} />);
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('renders test status', () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByTestId('test-status')).toBeInTheDocument();
    expect(screen.getByText('3/4')).toBeInTheDocument();
  });

  it('shows green test indicator when all pass', () => {
    const allPassTask = { ...mockTask, testStatus: { passed: 4, failed: 0, total: 4 } };
    render(<TaskCard task={allPassTask} />);
    expect(screen.getByTestId('test-indicator')).toHaveClass('bg-success');
  });

  it('shows red test indicator when some fail', () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByTestId('test-indicator')).toHaveClass('bg-error');
  });

  it('shows gray test indicator when no tests', () => {
    const noTestsTask = { ...mockTask, testStatus: { passed: 0, failed: 0, total: 0 } };
    render(<TaskCard task={noTestsTask} />);
    expect(screen.getByTestId('test-indicator')).toHaveClass('bg-muted');
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<TaskCard task={mockTask} onClick={handleClick} />);

    fireEvent.click(screen.getByTestId('task-card'));
    expect(handleClick).toHaveBeenCalledWith(mockTask);
  });

  it('is draggable', () => {
    render(<TaskCard task={mockTask} isDraggable />);
    expect(screen.getByTestId('task-card')).toHaveAttribute('draggable', 'true');
  });

  it('calls onDragStart when dragging begins', () => {
    const handleDragStart = vi.fn();
    render(<TaskCard task={mockTask} isDraggable onDragStart={handleDragStart} />);

    fireEvent.dragStart(screen.getByTestId('task-card'));
    expect(handleDragStart).toHaveBeenCalledWith(mockTask);
  });

  it('applies dragging class when being dragged', () => {
    render(<TaskCard task={mockTask} isDraggable isDragging />);
    expect(screen.getByTestId('task-card')).toHaveClass('opacity-50');
  });

  it('applies custom className', () => {
    render(<TaskCard task={mockTask} className="custom-task" />);
    expect(screen.getByTestId('task-card')).toHaveClass('custom-task');
  });

  it('shows phase number', () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByText('Phase 1')).toBeInTheDocument();
  });
});
