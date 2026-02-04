import type { ApiClient } from './client';
import type { ProjectInfo, ProjectStatus, Task, LogEntry, LogType } from '../stores';

export interface Agent {
  id: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  task?: string;
  progress?: number;
  startedAt?: string;
  completedAt?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  version?: string;
  components?: Record<string, { status: string; message?: string }>;
}

export interface CommandResult {
  success: boolean;
  output?: string;
  error?: string;
}

export interface CommandHistoryEntry {
  id: string;
  command: string;
  args?: Record<string, unknown>;
  timestamp: string;
  result?: CommandResult;
}

export interface ApiEndpoints {
  project: {
    getProject(): Promise<ProjectInfo>;
    getStatus(): Promise<ProjectStatus>;
  };
  tasks: {
    getTasks(): Promise<Task[]>;
    getTask(id: string): Promise<Task>;
    createTask(task: Partial<Task>): Promise<Task>;
    updateTask(id: string, updates: Partial<Task>): Promise<Task>;
    deleteTask(id: string): Promise<void>;
  };
  logs: {
    getLogs(type: LogType): Promise<LogEntry[]>;
    clearLogs(type: LogType): Promise<void>;
  };
  agents: {
    getAgents(): Promise<Agent[]>;
    getAgent(id: string): Promise<Agent>;
    stopAgent(id: string): Promise<void>;
  };
  health: {
    getHealth(): Promise<HealthStatus>;
  };
  commands: {
    runCommand(command: string, args?: Record<string, unknown>): Promise<CommandResult>;
    getHistory(): Promise<CommandHistoryEntry[]>;
  };
}

export function createApiEndpoints(client: ApiClient): ApiEndpoints {
  return {
    project: {
      getProject() {
        return client.get<ProjectInfo>('/api/project');
      },
      getStatus() {
        return client.get<ProjectStatus>('/api/status');
      },
    },

    tasks: {
      getTasks() {
        return client.get<Task[]>('/api/tasks');
      },
      getTask(id: string) {
        return client.get<Task>(`/api/tasks/${id}`);
      },
      createTask(task: Partial<Task>) {
        return client.post<Task>('/api/tasks', task);
      },
      updateTask(id: string, updates: Partial<Task>) {
        return client.put<Task>(`/api/tasks/${id}`, updates);
      },
      deleteTask(id: string) {
        return client.delete(`/api/tasks/${id}`);
      },
    },

    logs: {
      getLogs(type: LogType) {
        return client.get<LogEntry[]>(`/api/logs/${type}`);
      },
      clearLogs(type: LogType) {
        return client.delete(`/api/logs/${type}`);
      },
    },

    agents: {
      getAgents() {
        return client.get<Agent[]>('/api/agents');
      },
      getAgent(id: string) {
        return client.get<Agent>(`/api/agents/${id}`);
      },
      stopAgent(id: string) {
        return client.post(`/api/agents/${id}/stop`);
      },
    },

    health: {
      getHealth() {
        return client.get<HealthStatus>('/api/health');
      },
    },

    commands: {
      runCommand(command: string, args?: Record<string, unknown>) {
        return client.post<CommandResult>(`/api/commands/${command}`, args);
      },
      getHistory() {
        return client.get<CommandHistoryEntry[]>('/api/commands/history');
      },
    },
  };
}
