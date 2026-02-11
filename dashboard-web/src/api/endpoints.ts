import type { ApiClient } from './client';
import type { ProjectInfo, ProjectStatus, Task, LogEntry, LogType } from '../stores';
import type { WorkspaceProject } from '../stores/workspace.store';

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

export interface BugReport {
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  url?: string;
  screenshot?: string;
}

export interface Bug {
  id: string;
  description: string;
  severity: string;
  status: string;
  createdAt: string;
}

export interface ChangelogEntry {
  hash: string;
  message: string;
  time: string;
  author?: string;
}

export interface ApiEndpoints {
  project: {
    getProject(): Promise<ProjectInfo>;
    getStatus(): Promise<ProjectStatus>;
    getChangelog(): Promise<ChangelogEntry[]>;
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
  bugs: {
    getBugs(): Promise<Bug[]>;
    createBug(bug: BugReport): Promise<{ bugId: string }>;
  };
  config: {
    getConfig(): Promise<Record<string, unknown>>;
    saveConfig(config: Record<string, unknown>): Promise<void>;
  };
  workspace: {
    getConfig(): Promise<{ roots: string[] }>;
    setConfig(roots: string[]): Promise<{ roots: string[] }>;
    scan(): Promise<{ started: boolean }>;
    getProjects(): Promise<WorkspaceProject[]>;
  };
  projects: {
    getById(id: string): Promise<WorkspaceProject>;
    getStatus(id: string): Promise<ProjectStatus>;
    getTasks(id: string): Promise<Task[]>;
    getBugs(id: string): Promise<Bug[]>;
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
      getChangelog() {
        return client.get<ChangelogEntry[]>('/api/changelog');
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
        return client.patch<Task>(`/api/tasks/${id}`, updates);
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

    bugs: {
      getBugs() {
        return client.get<Bug[]>('/api/bugs');
      },
      createBug(bug: BugReport) {
        return client.post<{ bugId: string }>('/api/bug', bug);
      },
    },

    config: {
      getConfig() {
        return client.get<Record<string, unknown>>('/api/config');
      },
      saveConfig(config: Record<string, unknown>) {
        return client.put('/api/config', config);
      },
    },

    workspace: {
      getConfig() {
        return client.get<{ roots: string[] }>('/api/workspace/config');
      },
      setConfig(roots: string[]) {
        return client.put<{ roots: string[] }>('/api/workspace/config', { roots });
      },
      scan() {
        return client.post<{ started: boolean }>('/api/workspace/scan');
      },
      getProjects() {
        return client.get<WorkspaceProject[]>('/api/workspace/projects');
      },
    },

    projects: {
      getById(id: string) {
        return client.get<WorkspaceProject>(`/api/projects/${id}`);
      },
      getStatus(id: string) {
        return client.get<ProjectStatus>(`/api/projects/${id}/status`);
      },
      getTasks(id: string) {
        return client.get<Task[]>(`/api/projects/${id}/tasks`);
      },
      getBugs(id: string) {
        return client.get<Bug[]>(`/api/projects/${id}/bugs`);
      },
    },
  };
}
