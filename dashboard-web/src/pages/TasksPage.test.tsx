import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TasksPage } from './TasksPage';

vi.mock('../hooks/useTasks', () => ({
  useTasks: vi.fn(),
}));

vi.mock('../stores', () => ({
  useUIStore: vi.fn((selector) => {
    const store = { setActiveView: vi.fn() };
    return selector(store);
  }),
}));

vi.mock('../stores/workspace.store', () => ({
  useWorkspaceStore: vi.fn((selector) => {
    const store = {
      selectedProjectId: 'proj1',
      selectProject: vi.fn(),
      projects: [{ id: 'proj1', name: 'Test Project', hasPlanning: true, hasTlc: true }],
    };
    return selector(store);
  }),
}));

import { useTasks } from '../hooks/useTasks';

const MOCK_TASKS = [
  { id: '1', title: 'Create API endpoint', subject: 'Create API endpoint', status: 'pending', owner: null, priority: 'high', phase: 76 },
  { id: '2', title: 'Write tests', subject: 'Write tests', status: 'in_progress', owner: 'alice', priority: 'medium', phase: 76 },
  { id: '3', title: 'Deploy to staging', subject: 'Deploy to staging', status: 'completed', owner: 'bob', priority: 'low', phase: 76 },
];

function renderPage(tasks = MOCK_TASKS, loading = false) {
  const mockUpdateTaskStatus = vi.fn().mockResolvedValue({});
  const mockCreateTask = vi.fn().mockResolvedValue({ task: {} });

  vi.mocked(useTasks).mockReturnValue({
    tasks,
    selectedTask: null,
    filters: {},
    loading,
    isReadOnly: false,
    filteredTasks: tasks,
    tasksByStatus: {},
    fetchTasks: vi.fn(),
    createTask: mockCreateTask,
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    selectTask: vi.fn(),
    setFilter: vi.fn(),
    clearFilters: vi.fn(),
    updateTaskStatus: mockUpdateTaskStatus,
  } as ReturnType<typeof useTasks>);

  return render(
    <MemoryRouter initialEntries={['/projects/proj1/tasks']}>
      <Routes>
        <Route path="/projects/:projectId/tasks" element={<TasksPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('TasksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders kanban with three columns', () => {
    renderPage();
    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('shows task cards with correct data', () => {
    renderPage();
    expect(screen.getByText('Create API endpoint')).toBeInTheDocument();
    expect(screen.getByText('Write tests')).toBeInTheDocument();
    expect(screen.getByText('Deploy to staging')).toBeInTheDocument();
  });

  it('click task opens detail panel', () => {
    renderPage();
    fireEvent.click(screen.getByText('Create API endpoint'));
    // Detail panel should show the task title in a heading
    const headings = screen.getAllByText('Create API endpoint');
    expect(headings.length).toBeGreaterThanOrEqual(2); // card + detail
  });

  it('Create Task button exists', () => {
    renderPage();
    expect(screen.getByTestId('create-task-btn')).toBeInTheDocument();
  });

  it('Create Task opens form', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('create-task-btn'));
    expect(screen.getByTestId('task-create-form')).toBeInTheDocument();
  });

  it('Create Task form validates title', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('create-task-btn'));
    const submitBtn = screen.getByTestId('task-submit-btn');
    expect(submitBtn).toBeDisabled();
  });

  it('Create Task form submits', async () => {
    renderPage();
    fireEvent.click(screen.getByTestId('create-task-btn'));
    fireEvent.change(screen.getByTestId('task-title-input'), { target: { value: 'New task' } });
    fireEvent.change(screen.getByTestId('task-goal-input'), { target: { value: 'Do something' } });
    fireEvent.click(screen.getByTestId('task-submit-btn'));

    const mockCreate = vi.mocked(useTasks).mock.results[0]?.value.createTask;
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
    });
  });

  it('shows empty state when no tasks', () => {
    renderPage([]);
    expect(screen.getByText('No tasks found')).toBeInTheDocument();
  });

  it('detail panel shows Claim button for unassigned tasks', () => {
    renderPage();
    // Click the unassigned task
    fireEvent.click(screen.getByText('Create API endpoint'));
    expect(screen.getByText('Claim')).toBeInTheDocument();
  });

  it('Claim button calls updateTaskStatus', async () => {
    renderPage();
    fireEvent.click(screen.getByText('Create API endpoint'));
    fireEvent.click(screen.getByText('Claim'));

    const mockUpdateStatus = vi.mocked(useTasks).mock.results[0]?.value.updateTaskStatus;
    await waitFor(() => {
      expect(mockUpdateStatus).toHaveBeenCalledWith('1', 'in_progress');
    });
  });

  it('detail panel shows Complete button for in-progress tasks', () => {
    renderPage();
    fireEvent.click(screen.getByText('Write tests'));
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });
});
