import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TaskDetail } from './TaskDetail';
import type { Task } from './TaskCard';

const mockTask: Task = {
  id: 'task-1',
  title: 'Implement user authentication',
  description: 'Add login and registration endpoints with JWT tokens',
  status: 'in_progress',
  priority: 'high',
  assignee: { id: 'user-1', name: 'Alice', avatar: '' },
  testStatus: { passed: 3, failed: 1, total: 4 },
  phase: 1,
  createdAt: '2024-01-10T10:00:00Z',
  updatedAt: '2024-01-15T14:30:00Z',
};

const mockAcceptanceCriteria = [
  { id: '1', text: 'User can register with email/password', completed: true },
  { id: '2', text: 'User can login and receive JWT', completed: true },
  { id: '3', text: 'JWT is validated on protected routes', completed: false },
  { id: '4', text: 'Password is hashed with bcrypt', completed: false },
];

const mockActivity = [
  { id: '1', type: 'status_change', user: 'Alice', message: 'Moved to In Progress', timestamp: '2024-01-15T14:30:00Z' },
  { id: '2', type: 'comment', user: 'Bob', message: 'Looking good so far!', timestamp: '2024-01-14T10:00:00Z' },
  { id: '3', type: 'assigned', user: 'System', message: 'Assigned to Alice', timestamp: '2024-01-10T10:00:00Z' },
];

describe('TaskDetail', () => {
  it('renders task title', () => {
    render(
      <TaskDetail
        task={mockTask}
        acceptanceCriteria={mockAcceptanceCriteria}
        activity={mockActivity}
        onClose={() => {}}
      />
    );
    expect(screen.getByText('Implement user authentication')).toBeInTheDocument();
  });

  it('renders task description', () => {
    render(
      <TaskDetail
        task={mockTask}
        acceptanceCriteria={mockAcceptanceCriteria}
        activity={mockActivity}
        onClose={() => {}}
      />
    );
    expect(screen.getByText(/Add login and registration endpoints/)).toBeInTheDocument();
  });

  it('renders status badge', () => {
    render(
      <TaskDetail
        task={mockTask}
        acceptanceCriteria={mockAcceptanceCriteria}
        activity={mockActivity}
        onClose={() => {}}
      />
    );
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('renders priority badge', () => {
    render(
      <TaskDetail
        task={mockTask}
        acceptanceCriteria={mockAcceptanceCriteria}
        activity={mockActivity}
        onClose={() => {}}
      />
    );
    expect(screen.getByText('high')).toBeInTheDocument();
  });

  it('renders assignee info', () => {
    render(
      <TaskDetail
        task={mockTask}
        acceptanceCriteria={mockAcceptanceCriteria}
        activity={mockActivity}
        onClose={() => {}}
      />
    );
    // Alice appears multiple times (assignee + activity), just check it exists
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
  });

  it('renders acceptance criteria', () => {
    render(
      <TaskDetail
        task={mockTask}
        acceptanceCriteria={mockAcceptanceCriteria}
        activity={mockActivity}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('User can register with email/password')).toBeInTheDocument();
    expect(screen.getByText('User can login and receive JWT')).toBeInTheDocument();
    expect(screen.getByText('JWT is validated on protected routes')).toBeInTheDocument();
  });

  it('shows completed criteria as checked', () => {
    render(
      <TaskDetail
        task={mockTask}
        acceptanceCriteria={mockAcceptanceCriteria}
        activity={mockActivity}
        onClose={() => {}}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).toBeChecked();
    expect(checkboxes[2]).not.toBeChecked();
  });

  it('calls onCriteriaToggle when criterion clicked', () => {
    const handleToggle = vi.fn();
    render(
      <TaskDetail
        task={mockTask}
        acceptanceCriteria={mockAcceptanceCriteria}
        activity={mockActivity}
        onClose={() => {}}
        onCriteriaToggle={handleToggle}
      />
    );

    fireEvent.click(screen.getAllByRole('checkbox')[2]);
    expect(handleToggle).toHaveBeenCalledWith('3', true);
  });

  it('renders activity feed', () => {
    render(
      <TaskDetail
        task={mockTask}
        acceptanceCriteria={mockAcceptanceCriteria}
        activity={mockActivity}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Moved to In Progress')).toBeInTheDocument();
    expect(screen.getByText('Looking good so far!')).toBeInTheDocument();
    expect(screen.getByText('Assigned to Alice')).toBeInTheDocument();
  });

  it('renders test status', () => {
    render(
      <TaskDetail
        task={mockTask}
        acceptanceCriteria={mockAcceptanceCriteria}
        activity={mockActivity}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('3 passed')).toBeInTheDocument();
    expect(screen.getByText('1 failed')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const handleClose = vi.fn();
    render(
      <TaskDetail
        task={mockTask}
        acceptanceCriteria={mockAcceptanceCriteria}
        activity={mockActivity}
        onClose={handleClose}
      />
    );

    fireEvent.click(screen.getByLabelText('Close'));
    expect(handleClose).toHaveBeenCalled();
  });

  it('calls onClaim when claim button clicked', () => {
    const unassignedTask = { ...mockTask, assignee: undefined };
    const handleClaim = vi.fn();
    render(
      <TaskDetail
        task={unassignedTask}
        acceptanceCriteria={mockAcceptanceCriteria}
        activity={mockActivity}
        onClose={() => {}}
        onClaim={handleClaim}
      />
    );

    fireEvent.click(screen.getByText('Claim Task'));
    expect(handleClaim).toHaveBeenCalledWith('task-1');
  });

  it('calls onRelease when release button clicked', () => {
    const handleRelease = vi.fn();
    render(
      <TaskDetail
        task={mockTask}
        acceptanceCriteria={mockAcceptanceCriteria}
        activity={mockActivity}
        onClose={() => {}}
        onRelease={handleRelease}
        currentUserId="user-1"
      />
    );

    fireEvent.click(screen.getByText('Release'));
    expect(handleRelease).toHaveBeenCalledWith('task-1');
  });

  it('hides release button when task assigned to another user', () => {
    render(
      <TaskDetail
        task={mockTask}
        acceptanceCriteria={mockAcceptanceCriteria}
        activity={mockActivity}
        onClose={() => {}}
        onRelease={() => {}}
        currentUserId="user-2"
      />
    );

    expect(screen.queryByText('Release')).not.toBeInTheDocument();
  });

  it('shows phase number', () => {
    render(
      <TaskDetail
        task={mockTask}
        acceptanceCriteria={mockAcceptanceCriteria}
        activity={mockActivity}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Phase 1')).toBeInTheDocument();
  });
});
