import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createApiEndpoints, type ApiEndpoints } from './endpoints';
import { createApiClient } from './client';

vi.mock('./client', () => ({
  createApiClient: vi.fn(() => ({
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  })),
}));

describe('api/endpoints', () => {
  let endpoints: ApiEndpoints;
  let mockClient: ReturnType<typeof createApiClient>;

  beforeEach(() => {
    mockClient = createApiClient();
    endpoints = createApiEndpoints(mockClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('project', () => {
    it('getProject fetches project info', async () => {
      const projectData = { name: 'TLC', phase: 62 };
      vi.mocked(mockClient.get).mockResolvedValueOnce(projectData);

      const result = await endpoints.project.getProject();

      expect(mockClient.get).toHaveBeenCalledWith('/api/project');
      expect(result).toEqual(projectData);
    });

    it('getStatus fetches project status', async () => {
      const statusData = { testsPass: 637, testsFail: 0, coverage: 85 };
      vi.mocked(mockClient.get).mockResolvedValueOnce(statusData);

      const result = await endpoints.project.getStatus();

      expect(mockClient.get).toHaveBeenCalledWith('/api/status');
      expect(result).toEqual(statusData);
    });
  });

  describe('tasks', () => {
    it('getTasks fetches all tasks', async () => {
      const tasks = [
        { id: '1', title: 'Task 1' },
        { id: '2', title: 'Task 2' },
      ];
      vi.mocked(mockClient.get).mockResolvedValueOnce(tasks);

      const result = await endpoints.tasks.getTasks();

      expect(mockClient.get).toHaveBeenCalledWith('/api/tasks');
      expect(result).toEqual(tasks);
    });

    it('getTask fetches single task by id', async () => {
      const task = { id: '1', title: 'Task 1', status: 'pending' };
      vi.mocked(mockClient.get).mockResolvedValueOnce(task);

      const result = await endpoints.tasks.getTask('1');

      expect(mockClient.get).toHaveBeenCalledWith('/api/tasks/1');
      expect(result).toEqual(task);
    });

    it('createTask posts new task', async () => {
      const newTask = { title: 'New Task', status: 'pending' };
      const createdTask = { id: '3', ...newTask };
      vi.mocked(mockClient.post).mockResolvedValueOnce(createdTask);

      const result = await endpoints.tasks.createTask(newTask);

      expect(mockClient.post).toHaveBeenCalledWith('/api/tasks', newTask);
      expect(result).toEqual(createdTask);
    });

    it('updateTask updates existing task', async () => {
      const updates = { status: 'completed' };
      const updatedTask = { id: '1', title: 'Task 1', status: 'completed' };
      vi.mocked(mockClient.put).mockResolvedValueOnce(updatedTask);

      const result = await endpoints.tasks.updateTask('1', updates);

      expect(mockClient.put).toHaveBeenCalledWith('/api/tasks/1', updates);
      expect(result).toEqual(updatedTask);
    });

    it('deleteTask removes task', async () => {
      vi.mocked(mockClient.delete).mockResolvedValueOnce({ deleted: true });

      await endpoints.tasks.deleteTask('1');

      expect(mockClient.delete).toHaveBeenCalledWith('/api/tasks/1');
    });
  });

  describe('logs', () => {
    it('getLogs fetches logs by type', async () => {
      const logs = [
        { id: '1', text: 'Log entry', level: 'info' },
      ];
      vi.mocked(mockClient.get).mockResolvedValueOnce(logs);

      const result = await endpoints.logs.getLogs('app');

      expect(mockClient.get).toHaveBeenCalledWith('/api/logs/app');
      expect(result).toEqual(logs);
    });

    it('clearLogs clears logs by type', async () => {
      vi.mocked(mockClient.delete).mockResolvedValueOnce({ cleared: true });

      await endpoints.logs.clearLogs('test');

      expect(mockClient.delete).toHaveBeenCalledWith('/api/logs/test');
    });
  });

  describe('agents', () => {
    it('getAgents fetches all agents', async () => {
      const agents = [
        { id: 'agent-1', status: 'running', task: 'Building' },
      ];
      vi.mocked(mockClient.get).mockResolvedValueOnce(agents);

      const result = await endpoints.agents.getAgents();

      expect(mockClient.get).toHaveBeenCalledWith('/api/agents');
      expect(result).toEqual(agents);
    });

    it('getAgent fetches single agent', async () => {
      const agent = { id: 'agent-1', status: 'running' };
      vi.mocked(mockClient.get).mockResolvedValueOnce(agent);

      const result = await endpoints.agents.getAgent('agent-1');

      expect(mockClient.get).toHaveBeenCalledWith('/api/agents/agent-1');
      expect(result).toEqual(agent);
    });

    it('stopAgent stops an agent', async () => {
      vi.mocked(mockClient.post).mockResolvedValueOnce({ stopped: true });

      await endpoints.agents.stopAgent('agent-1');

      expect(mockClient.post).toHaveBeenCalledWith('/api/agents/agent-1/stop');
    });
  });

  describe('health', () => {
    it('getHealth fetches health status', async () => {
      const health = { status: 'healthy', uptime: 3600 };
      vi.mocked(mockClient.get).mockResolvedValueOnce(health);

      const result = await endpoints.health.getHealth();

      expect(mockClient.get).toHaveBeenCalledWith('/api/health');
      expect(result).toEqual(health);
    });
  });

  describe('commands', () => {
    it('runCommand executes a TLC command', async () => {
      const commandResult = { success: true, output: 'Phase 62 built' };
      vi.mocked(mockClient.post).mockResolvedValueOnce(commandResult);

      const result = await endpoints.commands.runCommand('build', { phase: 62 });

      expect(mockClient.post).toHaveBeenCalledWith('/api/commands/build', { phase: 62 });
      expect(result).toEqual(commandResult);
    });

    it('getCommandHistory fetches command history', async () => {
      const history = [
        { command: 'build', timestamp: '2024-01-01T00:00:00Z' },
      ];
      vi.mocked(mockClient.get).mockResolvedValueOnce(history);

      const result = await endpoints.commands.getHistory();

      expect(mockClient.get).toHaveBeenCalledWith('/api/commands/history');
      expect(result).toEqual(history);
    });
  });
});
