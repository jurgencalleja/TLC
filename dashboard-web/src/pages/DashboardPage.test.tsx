/**
 * DashboardPage Tests
 * TDD: Tests written first to define expected behavior
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { DashboardPage } from './DashboardPage';
import { useProjectStore } from '../stores/project.store';
import { useTaskStore } from '../stores/task.store';
import { useUIStore } from '../stores/ui.store';

// Mock the api module
vi.mock('../api', () => ({
  api: {
    project: {
      getProject: vi.fn().mockResolvedValue({ name: 'Test' }),
      getStatus: vi.fn().mockResolvedValue({}),
      getChangelog: vi.fn().mockResolvedValue([
        { hash: 'abc123', message: 'test commit', time: new Date().toISOString(), author: 'Dev' },
      ]),
    },
    commands: {
      runCommand: vi.fn().mockResolvedValue({ success: true }),
    },
  },
}));

// Mock the hooks
vi.mock('../hooks', () => ({
  useProject: vi.fn(() => ({
    project: null,
    status: null,
    loading: false,
    error: null,
    fetchProject: vi.fn(),
    fetchStatus: vi.fn(),
    refresh: vi.fn(),
  })),
  useTasks: vi.fn(() => ({
    tasks: [],
    fetchTasks: vi.fn(),
  })),
}));

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { useProject, useTasks } from '../hooks';

// Mock global fetch for test runner button
globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProjectStore.getState().reset();
    useTaskStore.getState().reset();
    useUIStore.getState().reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('renders loading state initially', () => {
      vi.mocked(useProject).mockReturnValue({
        project: null,
        status: null,
        loading: true,
        error: null,
        fetchProject: vi.fn(),
        fetchStatus: vi.fn(),
        refresh: vi.fn(),
      });

      renderWithRouter(<DashboardPage />);

      // Should show skeleton loaders
      expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
    });

    it('shows loading skeletons for stats cards', () => {
      vi.mocked(useProject).mockReturnValue({
        project: null,
        status: null,
        loading: true,
        error: null,
        fetchProject: vi.fn(),
        fetchStatus: vi.fn(),
        refresh: vi.fn(),
      });

      renderWithRouter(<DashboardPage />);

      // Should have skeleton placeholders for stat cards
      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Project Overview', () => {
    it('displays project name from store', () => {
      vi.mocked(useProject).mockReturnValue({
        project: {
          name: 'My Test Project',
          description: 'A test project',
          phase: 3,
          phaseName: 'Phase 3: Testing',
        },
        status: { testsPass: 10, testsFail: 2, coverage: 80 },
        loading: false,
        error: null,
        fetchProject: vi.fn(),
        fetchStatus: vi.fn(),
        refresh: vi.fn(),
      });

      vi.mocked(useTasks).mockReturnValue({
        tasks: [],
        fetchTasks: vi.fn(),
        selectedTask: null,
        filters: { status: null, assignee: null, phase: null, priority: null },
        loading: false,
        filteredTasks: [],
        tasksByStatus: { pending: [], in_progress: [], completed: [] },
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        selectTask: vi.fn(),
        setFilter: vi.fn(),
        clearFilters: vi.fn(),
      });

      renderWithRouter(<DashboardPage />);

      expect(screen.getByText('My Test Project')).toBeInTheDocument();
    });

    it('shows project status badge', () => {
      vi.mocked(useProject).mockReturnValue({
        project: {
          name: 'Test Project',
          phase: 2,
          phaseName: 'Phase 2: Development',
        },
        status: { testsPass: 5, testsFail: 0 },
        loading: false,
        error: null,
        fetchProject: vi.fn(),
        fetchStatus: vi.fn(),
        refresh: vi.fn(),
      });

      vi.mocked(useTasks).mockReturnValue({
        tasks: [],
        fetchTasks: vi.fn(),
        selectedTask: null,
        filters: { status: null, assignee: null, phase: null, priority: null },
        loading: false,
        filteredTasks: [],
        tasksByStatus: { pending: [], in_progress: [], completed: [] },
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        selectTask: vi.fn(),
        setFilter: vi.fn(),
        clearFilters: vi.fn(),
      });

      renderWithRouter(<DashboardPage />);

      // Should show phase badge (using getAllByText since phase appears in multiple places)
      const phaseElements = screen.getAllByText(/Phase 2/);
      expect(phaseElements.length).toBeGreaterThan(0);
      // Verify the badge specifically exists
      expect(screen.getByText('Phase 2: Development')).toBeInTheDocument();
    });

    it('shows branch information when available', () => {
      vi.mocked(useProject).mockReturnValue({
        project: {
          name: 'Test Project',
          phase: 1,
          branch: 'main',
        },
        status: null,
        loading: false,
        error: null,
        fetchProject: vi.fn(),
        fetchStatus: vi.fn(),
        refresh: vi.fn(),
      });

      vi.mocked(useTasks).mockReturnValue({
        tasks: [],
        fetchTasks: vi.fn(),
        selectedTask: null,
        filters: { status: null, assignee: null, phase: null, priority: null },
        loading: false,
        filteredTasks: [],
        tasksByStatus: { pending: [], in_progress: [], completed: [] },
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        selectTask: vi.fn(),
        setFilter: vi.fn(),
        clearFilters: vi.fn(),
      });

      renderWithRouter(<DashboardPage />);

      expect(screen.getByText(/main/)).toBeInTheDocument();
    });
  });

  describe('Test Status Summary', () => {
    it('shows correct test pass/fail counts', () => {
      vi.mocked(useProject).mockReturnValue({
        project: { name: 'Test Project', phase: 1 },
        status: { testsPass: 42, testsFail: 8, coverage: 85 },
        loading: false,
        error: null,
        fetchProject: vi.fn(),
        fetchStatus: vi.fn(),
        refresh: vi.fn(),
      });

      vi.mocked(useTasks).mockReturnValue({
        tasks: [],
        fetchTasks: vi.fn(),
        selectedTask: null,
        filters: { status: null, assignee: null, phase: null, priority: null },
        loading: false,
        filteredTasks: [],
        tasksByStatus: { pending: [], in_progress: [], completed: [] },
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        selectTask: vi.fn(),
        setFilter: vi.fn(),
        clearFilters: vi.fn(),
      });

      renderWithRouter(<DashboardPage />);

      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
    });

    it('shows coverage percentage', () => {
      vi.mocked(useProject).mockReturnValue({
        project: { name: 'Test Project', phase: 1 },
        status: { testsPass: 10, testsFail: 2, coverage: 75 },
        loading: false,
        error: null,
        fetchProject: vi.fn(),
        fetchStatus: vi.fn(),
        refresh: vi.fn(),
      });

      vi.mocked(useTasks).mockReturnValue({
        tasks: [],
        fetchTasks: vi.fn(),
        selectedTask: null,
        filters: { status: null, assignee: null, phase: null, priority: null },
        loading: false,
        filteredTasks: [],
        tasksByStatus: { pending: [], in_progress: [], completed: [] },
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        selectTask: vi.fn(),
        setFilter: vi.fn(),
        clearFilters: vi.fn(),
      });

      renderWithRouter(<DashboardPage />);

      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('shows total tests count', () => {
      vi.mocked(useProject).mockReturnValue({
        project: { name: 'Test Project', phase: 1 },
        status: { testsPass: 30, testsFail: 10, coverage: 80 },
        loading: false,
        error: null,
        fetchProject: vi.fn(),
        fetchStatus: vi.fn(),
        refresh: vi.fn(),
      });

      vi.mocked(useTasks).mockReturnValue({
        tasks: [],
        fetchTasks: vi.fn(),
        selectedTask: null,
        filters: { status: null, assignee: null, phase: null, priority: null },
        loading: false,
        filteredTasks: [],
        tasksByStatus: { pending: [], in_progress: [], completed: [] },
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        selectTask: vi.fn(),
        setFilter: vi.fn(),
        clearFilters: vi.fn(),
      });

      renderWithRouter(<DashboardPage />);

      // Total = 30 + 10 = 40
      expect(screen.getByText(/40.*total/i)).toBeInTheDocument();
    });
  });

  describe('Phase Progress', () => {
    it('shows phase progress bar', () => {
      vi.mocked(useProject).mockReturnValue({
        project: {
          name: 'Test Project',
          phase: 3,
          totalPhases: 5,
        },
        status: null,
        loading: false,
        error: null,
        fetchProject: vi.fn(),
        fetchStatus: vi.fn(),
        refresh: vi.fn(),
      });

      vi.mocked(useTasks).mockReturnValue({
        tasks: [],
        fetchTasks: vi.fn(),
        selectedTask: null,
        filters: { status: null, assignee: null, phase: null, priority: null },
        loading: false,
        filteredTasks: [],
        tasksByStatus: { pending: [], in_progress: [], completed: [] },
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        selectTask: vi.fn(),
        setFilter: vi.fn(),
        clearFilters: vi.fn(),
      });

      renderWithRouter(<DashboardPage />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('displays current phase / total phases', () => {
      vi.mocked(useProject).mockReturnValue({
        project: {
          name: 'Test Project',
          phase: 3,
          totalPhases: 5,
        },
        status: null,
        loading: false,
        error: null,
        fetchProject: vi.fn(),
        fetchStatus: vi.fn(),
        refresh: vi.fn(),
      });

      vi.mocked(useTasks).mockReturnValue({
        tasks: [],
        fetchTasks: vi.fn(),
        selectedTask: null,
        filters: { status: null, assignee: null, phase: null, priority: null },
        loading: false,
        filteredTasks: [],
        tasksByStatus: { pending: [], in_progress: [], completed: [] },
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        selectTask: vi.fn(),
        setFilter: vi.fn(),
        clearFilters: vi.fn(),
      });

      renderWithRouter(<DashboardPage />);

      expect(screen.getByText(/3.*of.*5/i)).toBeInTheDocument();
    });
  });

  describe('Quick Actions', () => {
    beforeEach(() => {
      vi.mocked(useProject).mockReturnValue({
        project: { name: 'Test Project', phase: 1 },
        status: { testsPass: 10, testsFail: 2 },
        loading: false,
        error: null,
        fetchProject: vi.fn(),
        fetchStatus: vi.fn(),
        refresh: vi.fn(),
      });

      vi.mocked(useTasks).mockReturnValue({
        tasks: [],
        fetchTasks: vi.fn(),
        selectedTask: null,
        filters: { status: null, assignee: null, phase: null, priority: null },
        loading: false,
        filteredTasks: [],
        tasksByStatus: { pending: [], in_progress: [], completed: [] },
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        selectTask: vi.fn(),
        setFilter: vi.fn(),
        clearFilters: vi.fn(),
      });
    });

    it('shows quick action buttons', () => {
      renderWithRouter(<DashboardPage />);

      expect(screen.getByRole('button', { name: /run tests/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /view logs/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /view tasks/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
    });

    it('View Logs navigates to logs route', () => {
      renderWithRouter(<DashboardPage />);

      fireEvent.click(screen.getByRole('button', { name: /view logs/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/logs');
    });

    it('View Tasks navigates to tasks route', () => {
      renderWithRouter(<DashboardPage />);

      fireEvent.click(screen.getByRole('button', { name: /view tasks/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/tasks');
    });

    it('Settings navigates to settings route', () => {
      renderWithRouter(<DashboardPage />);

      fireEvent.click(screen.getByRole('button', { name: /settings/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/settings');
    });
  });

  describe('Recent Activity', () => {
    it('shows recent activity feed', () => {
      vi.mocked(useProject).mockReturnValue({
        project: { name: 'Test Project', phase: 1 },
        status: null,
        loading: false,
        error: null,
        fetchProject: vi.fn(),
        fetchStatus: vi.fn(),
        refresh: vi.fn(),
      });

      vi.mocked(useTasks).mockReturnValue({
        tasks: [],
        fetchTasks: vi.fn(),
        selectedTask: null,
        filters: { status: null, assignee: null, phase: null, priority: null },
        loading: false,
        filteredTasks: [],
        tasksByStatus: { pending: [], in_progress: [], completed: [] },
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        selectTask: vi.fn(),
        setFilter: vi.fn(),
        clearFilters: vi.fn(),
      });

      renderWithRouter(<DashboardPage />);

      expect(screen.getByText(/recent activity/i)).toBeInTheDocument();
    });

    it('limits activity feed to 5 items', async () => {
      vi.mocked(useProject).mockReturnValue({
        project: { name: 'Test Project', phase: 1 },
        status: null,
        loading: false,
        error: null,
        fetchProject: vi.fn(),
        fetchStatus: vi.fn(),
        refresh: vi.fn(),
      });

      vi.mocked(useTasks).mockReturnValue({
        tasks: [],
        fetchTasks: vi.fn(),
        selectedTask: null,
        filters: { status: null, assignee: null, phase: null, priority: null },
        loading: false,
        filteredTasks: [],
        tasksByStatus: { pending: [], in_progress: [], completed: [] },
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        selectTask: vi.fn(),
        setFilter: vi.fn(),
        clearFilters: vi.fn(),
      });

      renderWithRouter(<DashboardPage />);

      // Wait for async activity fetch to complete
      await waitFor(() => {
        const activityFeed = screen.queryByTestId('activity-feed');
        expect(activityFeed).toBeInTheDocument();
      });

      // Check that we don't have more than 5 activity items
      const activityItems = screen.queryAllByTestId('activity-item');
      expect(activityItems.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no project', () => {
      vi.mocked(useProject).mockReturnValue({
        project: null,
        status: null,
        loading: false,
        error: null,
        fetchProject: vi.fn(),
        fetchStatus: vi.fn(),
        refresh: vi.fn(),
      });

      vi.mocked(useTasks).mockReturnValue({
        tasks: [],
        fetchTasks: vi.fn(),
        selectedTask: null,
        filters: { status: null, assignee: null, phase: null, priority: null },
        loading: false,
        filteredTasks: [],
        tasksByStatus: { pending: [], in_progress: [], completed: [] },
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        selectTask: vi.fn(),
        setFilter: vi.fn(),
        clearFilters: vi.fn(),
      });

      renderWithRouter(<DashboardPage />);

      expect(screen.getByText(/no project/i)).toBeInTheDocument();
    });

    it('shows call to action in empty state', () => {
      vi.mocked(useProject).mockReturnValue({
        project: null,
        status: null,
        loading: false,
        error: null,
        fetchProject: vi.fn(),
        fetchStatus: vi.fn(),
        refresh: vi.fn(),
      });

      vi.mocked(useTasks).mockReturnValue({
        tasks: [],
        fetchTasks: vi.fn(),
        selectedTask: null,
        filters: { status: null, assignee: null, phase: null, priority: null },
        loading: false,
        filteredTasks: [],
        tasksByStatus: { pending: [], in_progress: [], completed: [] },
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        selectTask: vi.fn(),
        setFilter: vi.fn(),
        clearFilters: vi.fn(),
      });

      renderWithRouter(<DashboardPage />);

      // Should show a button to select/create a project
      expect(screen.getByRole('button', { name: /select.*project|open.*project|get.*started/i })).toBeInTheDocument();
    });
  });

  describe('Task Counts', () => {
    it('shows pending tasks count', () => {
      vi.mocked(useProject).mockReturnValue({
        project: { name: 'Test Project', phase: 1 },
        status: null,
        loading: false,
        error: null,
        fetchProject: vi.fn(),
        fetchStatus: vi.fn(),
        refresh: vi.fn(),
      });

      vi.mocked(useTasks).mockReturnValue({
        tasks: [
          { id: '1', title: 'Task 1', status: 'pending', description: '', priority: 'medium', assignee: null, phase: 1, acceptanceCriteria: [], createdAt: '' },
          { id: '2', title: 'Task 2', status: 'pending', description: '', priority: 'medium', assignee: null, phase: 1, acceptanceCriteria: [], createdAt: '' },
          { id: '3', title: 'Task 3', status: 'in_progress', description: '', priority: 'medium', assignee: null, phase: 1, acceptanceCriteria: [], createdAt: '' },
        ],
        fetchTasks: vi.fn(),
        selectedTask: null,
        filters: { status: null, assignee: null, phase: null, priority: null },
        loading: false,
        filteredTasks: [],
        tasksByStatus: {
          pending: [
            { id: '1', title: 'Task 1', status: 'pending', description: '', priority: 'medium', assignee: null, phase: 1, acceptanceCriteria: [], createdAt: '' },
            { id: '2', title: 'Task 2', status: 'pending', description: '', priority: 'medium', assignee: null, phase: 1, acceptanceCriteria: [], createdAt: '' },
          ],
          in_progress: [
            { id: '3', title: 'Task 3', status: 'in_progress', description: '', priority: 'medium', assignee: null, phase: 1, acceptanceCriteria: [], createdAt: '' },
          ],
          completed: [],
        },
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        selectTask: vi.fn(),
        setFilter: vi.fn(),
        clearFilters: vi.fn(),
      });

      renderWithRouter(<DashboardPage />);

      // Find the pending badge
      const pendingSection = screen.getByText('Pending');
      expect(pendingSection).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('calls fetch functions on mount', () => {
      const mockFetchProject = vi.fn();
      const mockFetchStatus = vi.fn();
      const mockFetchTasks = vi.fn();

      vi.mocked(useProject).mockReturnValue({
        project: null,
        status: null,
        loading: false,
        error: null,
        fetchProject: mockFetchProject,
        fetchStatus: mockFetchStatus,
        refresh: vi.fn(),
      });

      vi.mocked(useTasks).mockReturnValue({
        tasks: [],
        fetchTasks: mockFetchTasks,
        selectedTask: null,
        filters: { status: null, assignee: null, phase: null, priority: null },
        loading: false,
        filteredTasks: [],
        tasksByStatus: { pending: [], in_progress: [], completed: [] },
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        selectTask: vi.fn(),
        setFilter: vi.fn(),
        clearFilters: vi.fn(),
      });

      renderWithRouter(<DashboardPage />);

      expect(mockFetchProject).toHaveBeenCalled();
      expect(mockFetchStatus).toHaveBeenCalled();
      expect(mockFetchTasks).toHaveBeenCalled();
    });

    it('sets active view to dashboard on mount', () => {
      vi.mocked(useProject).mockReturnValue({
        project: null,
        status: null,
        loading: false,
        error: null,
        fetchProject: vi.fn(),
        fetchStatus: vi.fn(),
        refresh: vi.fn(),
      });

      vi.mocked(useTasks).mockReturnValue({
        tasks: [],
        fetchTasks: vi.fn(),
        selectedTask: null,
        filters: { status: null, assignee: null, phase: null, priority: null },
        loading: false,
        filteredTasks: [],
        tasksByStatus: { pending: [], in_progress: [], completed: [] },
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        selectTask: vi.fn(),
        setFilter: vi.fn(),
        clearFilters: vi.fn(),
      });

      renderWithRouter(<DashboardPage />);

      expect(useUIStore.getState().activeView).toBe('dashboard');
    });
  });
});
