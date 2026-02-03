import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QATaskQueue } from './QATaskQueue';

const mockTasks = [
  {
    id: 'task1',
    type: 'verification' as const,
    title: 'Verify login flow',
    phase: 'Phase 2',
    requestedBy: 'Alice',
    createdAt: new Date().toISOString(),
    status: 'pending' as const,
  },
  {
    id: 'task2',
    type: 'test_review' as const,
    title: 'Review auth tests',
    phase: 'Phase 2',
    requestedBy: 'Bob',
    createdAt: new Date().toISOString(),
    status: 'pending' as const,
  },
  {
    id: 'task3',
    type: 'verification' as const,
    title: 'Verify dashboard',
    phase: 'Phase 3',
    requestedBy: 'Carol',
    createdAt: new Date().toISOString(),
    status: 'completed' as const,
  },
];

describe('QATaskQueue', () => {
  it('renders task queue', () => {
    render(<QATaskQueue tasks={mockTasks} onTaskSelect={() => {}} />);
    expect(screen.getByTestId('qa-task-queue')).toBeInTheDocument();
  });

  it('shows pending tasks', () => {
    render(<QATaskQueue tasks={mockTasks} onTaskSelect={() => {}} />);
    expect(screen.getByText('Verify login flow')).toBeInTheDocument();
    expect(screen.getByText('Review auth tests')).toBeInTheDocument();
  });

  it('filters by task type', () => {
    render(<QATaskQueue tasks={mockTasks} onTaskSelect={() => {}} />);

    fireEvent.click(screen.getByTestId('filter-verification'));

    expect(screen.getByText('Verify login flow')).toBeInTheDocument();
    expect(screen.queryByText('Review auth tests')).not.toBeInTheDocument();
  });

  it('filters by status', () => {
    render(<QATaskQueue tasks={mockTasks} onTaskSelect={() => {}} />);

    fireEvent.click(screen.getByTestId('filter-completed'));

    expect(screen.getByText('Verify dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Verify login flow')).not.toBeInTheDocument();
  });

  it('calls onTaskSelect when task clicked', () => {
    const handleSelect = vi.fn();
    render(<QATaskQueue tasks={mockTasks} onTaskSelect={handleSelect} />);

    fireEvent.click(screen.getByText('Verify login flow'));
    expect(handleSelect).toHaveBeenCalledWith(mockTasks[0]);
  });

  it('shows requester name', () => {
    render(<QATaskQueue tasks={mockTasks} onTaskSelect={() => {}} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('shows phase label', () => {
    render(<QATaskQueue tasks={mockTasks} onTaskSelect={() => {}} />);
    expect(screen.getAllByText('Phase 2').length).toBeGreaterThan(0);
  });

  it('shows empty state when no tasks', () => {
    render(<QATaskQueue tasks={[]} onTaskSelect={() => {}} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('shows task count', () => {
    render(<QATaskQueue tasks={mockTasks} onTaskSelect={() => {}} />);
    expect(screen.getByTestId('task-count')).toHaveTextContent('3');
  });

  it('applies custom className', () => {
    render(<QATaskQueue tasks={mockTasks} onTaskSelect={() => {}} className="custom-queue" />);
    expect(screen.getByTestId('qa-task-queue')).toHaveClass('custom-queue');
  });
});
