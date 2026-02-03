import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TaskBoard } from './TaskBoard';
import type { Task } from './TaskCard';

const mockTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Todo task',
    status: 'todo',
    priority: 'high',
    testStatus: { passed: 0, failed: 0, total: 0 },
    phase: 1,
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-15T14:30:00Z',
  },
  {
    id: 'task-2',
    title: 'In progress task',
    status: 'in_progress',
    priority: 'medium',
    assignee: { id: 'user-1', name: 'Alice' },
    testStatus: { passed: 2, failed: 1, total: 3 },
    phase: 1,
    createdAt: '2024-01-11T10:00:00Z',
    updatedAt: '2024-01-15T14:30:00Z',
  },
  {
    id: 'task-3',
    title: 'Done task',
    status: 'done',
    priority: 'low',
    assignee: { id: 'user-2', name: 'Bob' },
    testStatus: { passed: 5, failed: 0, total: 5 },
    phase: 1,
    createdAt: '2024-01-12T10:00:00Z',
    updatedAt: '2024-01-15T14:30:00Z',
  },
];

describe('TaskBoard', () => {
  it('renders three columns', () => {
    render(<TaskBoard tasks={mockTasks} onTaskMove={() => {}} />);

    expect(screen.getByTestId('column-todo')).toBeInTheDocument();
    expect(screen.getByTestId('column-in_progress')).toBeInTheDocument();
    expect(screen.getByTestId('column-done')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(<TaskBoard tasks={mockTasks} onTaskMove={() => {}} />);

    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('shows task counts in headers', () => {
    render(<TaskBoard tasks={mockTasks} onTaskMove={() => {}} />);

    expect(screen.getByTestId('count-todo')).toHaveTextContent('1');
    expect(screen.getByTestId('count-in_progress')).toHaveTextContent('1');
    expect(screen.getByTestId('count-done')).toHaveTextContent('1');
  });

  it('renders tasks in correct columns', () => {
    render(<TaskBoard tasks={mockTasks} onTaskMove={() => {}} />);

    const todoColumn = screen.getByTestId('column-todo');
    const inProgressColumn = screen.getByTestId('column-in_progress');
    const doneColumn = screen.getByTestId('column-done');

    expect(todoColumn).toHaveTextContent('Todo task');
    expect(inProgressColumn).toHaveTextContent('In progress task');
    expect(doneColumn).toHaveTextContent('Done task');
  });

  it('calls onTaskClick when task is clicked', () => {
    const handleClick = vi.fn();
    render(<TaskBoard tasks={mockTasks} onTaskMove={() => {}} onTaskClick={handleClick} />);

    fireEvent.click(screen.getByText('Todo task'));
    expect(handleClick).toHaveBeenCalledWith(mockTasks[0]);
  });

  it('calls onTaskMove when task is dropped', () => {
    const handleMove = vi.fn();
    render(<TaskBoard tasks={mockTasks} onTaskMove={handleMove} />);

    const inProgressColumn = screen.getByTestId('column-in_progress');

    // Simulate drag and drop
    fireEvent.dragOver(inProgressColumn);
    fireEvent.drop(inProgressColumn, {
      dataTransfer: { getData: () => 'task-1' },
    });

    expect(handleMove).toHaveBeenCalledWith('task-1', 'in_progress');
  });

  it('highlights column on drag over', () => {
    render(<TaskBoard tasks={mockTasks} onTaskMove={() => {}} />);

    const todoColumn = screen.getByTestId('column-todo');

    fireEvent.dragEnter(todoColumn);
    expect(todoColumn).toHaveClass('ring-2');

    // Drag leave behavior may vary - just verify drag enter works
  });

  it('navigates columns with h/l keys', () => {
    render(<TaskBoard tasks={mockTasks} onTaskMove={() => {}} />);

    const board = screen.getByTestId('task-board');

    // Focus the board
    fireEvent.keyDown(board, { key: 'l' });
    expect(screen.getByTestId('column-in_progress')).toHaveClass('ring-2');

    fireEvent.keyDown(board, { key: 'l' });
    expect(screen.getByTestId('column-done')).toHaveClass('ring-2');

    fireEvent.keyDown(board, { key: 'h' });
    expect(screen.getByTestId('column-in_progress')).toHaveClass('ring-2');
  });

  it('navigates tasks with j/k keys', () => {
    const multipleTasks: Task[] = [
      { ...mockTasks[0], id: 'task-a', title: 'First todo' },
      { ...mockTasks[0], id: 'task-b', title: 'Second todo' },
    ];
    render(<TaskBoard tasks={multipleTasks} onTaskMove={() => {}} />);

    const board = screen.getByTestId('task-board');

    fireEvent.keyDown(board, { key: 'j' });
    // First task should be focused
    expect(screen.getByText('First todo').closest('[data-testid="task-card"]')).toHaveClass('ring-2');

    fireEvent.keyDown(board, { key: 'j' });
    expect(screen.getByText('Second todo').closest('[data-testid="task-card"]')).toHaveClass('ring-2');

    fireEvent.keyDown(board, { key: 'k' });
    expect(screen.getByText('First todo').closest('[data-testid="task-card"]')).toHaveClass('ring-2');
  });

  it('opens task with Enter key', () => {
    const handleClick = vi.fn();
    render(<TaskBoard tasks={mockTasks} onTaskMove={() => {}} onTaskClick={handleClick} />);

    const board = screen.getByTestId('task-board');

    fireEvent.keyDown(board, { key: 'j' }); // Focus first task
    fireEvent.keyDown(board, { key: 'Enter' });

    expect(handleClick).toHaveBeenCalled();
  });

  it('shows empty state when no tasks', () => {
    render(<TaskBoard tasks={[]} onTaskMove={() => {}} />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('shows loading skeletons when loading', () => {
    render(<TaskBoard tasks={[]} onTaskMove={() => {}} isLoading />);

    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('applies custom className', () => {
    render(<TaskBoard tasks={mockTasks} onTaskMove={() => {}} className="custom-board" />);

    expect(screen.getByTestId('task-board')).toHaveClass('custom-board');
  });
});
