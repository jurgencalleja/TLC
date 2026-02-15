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

export interface RoadmapPhase {
  number: number;
  name: string;
  goal: string;
  status: 'done' | 'in_progress' | 'pending';
  deliverables: { text: string; done: boolean }[];
  taskCount: number;
  completedTaskCount: number;
  testCount: number;
  testFileCount: number;
  hasTests: boolean;
  verified: boolean;
}

export interface RoadmapMilestone {
  name: string;
  phases: RoadmapPhase[];
}

export interface RoadmapData {
  milestones: RoadmapMilestone[];
  currentPhase: { number: number; name: string } | null;
  totalPhases: number;
  completedPhases: number;
  testSummary: { totalFiles: number; totalTests: number };
  recentCommits: { hash: string; message: string; date: string; author: string }[];
  projectInfo: { name: string; version: string; description: string };
}

export interface TestInventoryGroup {
  name: string;
  fileCount: number;
  testCount: number;
  files: { relativePath: string; testCount: number }[];
}

export interface TestInventoryData {
  totalFiles: number;
  totalTests: number;
  groups: TestInventoryGroup[];
  lastRun?: { timestamp: string; passed: number; failed: number; total: number; duration: number } | null;
}

export interface WorkspaceGroup {
  name: string;
  path: string;
  repos: (WorkspaceProject & { id: string })[];
  repoCount: number;
  hasTlc: boolean;
}

export interface MemoryDecision {
  id: string;
  text: string;
  context?: string;
  timestamp?: string;
}

export interface MemoryGotcha {
  id: string;
  text: string;
  context?: string;
  timestamp?: string;
}

export interface MemoryStats {
  totalEntries: number;
  vectorCount?: number;
  decisions?: number;
  gotchas?: number;
  conversations?: number;
}

export interface ProjectFile {
  filename: string;
  content: string;
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
    getConfig(): Promise<{ roots: string[]; lastScans?: Record<string, number> }>;
    setConfig(roots: string[]): Promise<{ roots: string[] }>;
    scan(): Promise<{ projects: WorkspaceProject[]; scannedAt: number }>;
    getProjects(): Promise<WorkspaceProject[]>;
    getGroups(): Promise<WorkspaceGroup[]>;
  };
  projects: {
    getById(id: string): Promise<WorkspaceProject>;
    getStatus(id: string): Promise<ProjectStatus>;
    getTasks(id: string): Promise<Task[]>;
    getBugs(id: string): Promise<Bug[]>;
    getRoadmap(id: string): Promise<RoadmapData>;
    getTestInventory(id: string): Promise<TestInventoryData>;
    runTests(id: string): Promise<{ started: boolean; message: string }>;
    updateTaskStatus(id: string, taskNum: number, status: string, owner?: string): Promise<{ task: Task }>;
    updateTask(id: string, taskNum: number, updates: Record<string, unknown>): Promise<{ task: Task }>;
    createTask(id: string, task: Record<string, unknown>): Promise<{ task: Task }>;
    updateBugStatus(id: string, bugId: string, status: string): Promise<{ bug: Bug }>;
    updateBug(id: string, bugId: string, updates: Record<string, unknown>): Promise<{ bug: Bug }>;
    createBug(id: string, bug: Record<string, unknown>): Promise<{ bug: Bug }>;
    getMemoryDecisions(id: string): Promise<MemoryDecision[]>;
    getMemoryGotchas(id: string): Promise<MemoryGotcha[]>;
    getMemoryStats(id: string): Promise<MemoryStats>;
    getFile(id: string, filename: string): Promise<ProjectFile>;
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
        return client
          .get<{ items?: Task[] }>('/api/tasks')
          .then((res) => res.items ?? []);
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
        return client.get<{ roots: string[]; lastScans?: Record<string, number> }>(
          '/api/workspace/config'
        );
      },
      setConfig(roots: string[]) {
        return client.put<{ roots: string[] }>('/api/workspace/config', { roots });
      },
      scan() {
        return client.post<{ projects: WorkspaceProject[]; scannedAt: number }>(
          '/api/workspace/scan'
        );
      },
      async getProjects() {
        const res = await client.get<{ projects: WorkspaceProject[] }>('/api/workspace/projects');
        return res.projects;
      },
      async getGroups() {
        const res = await client.get<{ groups: WorkspaceGroup[] }>('/api/workspace/groups');
        return res.groups;
      },
    },

    projects: {
      async getById(id: string) {
        const res = await client.get<{ project: WorkspaceProject }>(`/api/projects/${id}`);
        return res.project;
      },
      async getStatus(id: string) {
        const res = await client.get<{ status: ProjectStatus }>(`/api/projects/${id}/status`);
        return res.status;
      },
      async getTasks(id: string) {
        const res = await client.get<{ tasks: Task[] }>(`/api/projects/${id}/tasks`);
        return res.tasks;
      },
      async getBugs(id: string) {
        const res = await client.get<{ bugs: Bug[] }>(`/api/projects/${id}/bugs`);
        return res.bugs;
      },
      async getRoadmap(id: string) {
        return client.get<RoadmapData>(`/api/projects/${id}/roadmap`);
      },
      async getTestInventory(id: string) {
        return client.get<TestInventoryData>(`/api/projects/${id}/tests`);
      },
      async runTests(id: string) {
        return client.post<{ started: boolean; message: string }>(`/api/projects/${id}/tests/run`);
      },
      async updateTaskStatus(id: string, taskNum: number, status: string, owner?: string) {
        return client.put<{ task: Task }>(`/api/projects/${id}/tasks/${taskNum}/status`, { status, owner });
      },
      async updateTask(id: string, taskNum: number, updates: Record<string, unknown>) {
        return client.put<{ task: Task }>(`/api/projects/${id}/tasks/${taskNum}`, updates);
      },
      async createTask(id: string, task: Record<string, unknown>) {
        return client.post<{ task: Task }>(`/api/projects/${id}/tasks`, task);
      },
      async updateBugStatus(id: string, bugId: string, status: string) {
        return client.put<{ bug: Bug }>(`/api/projects/${id}/bugs/${bugId}/status`, { status });
      },
      async updateBug(id: string, bugId: string, updates: Record<string, unknown>) {
        return client.put<{ bug: Bug }>(`/api/projects/${id}/bugs/${bugId}`, updates);
      },
      async createBug(id: string, bug: Record<string, unknown>) {
        return client.post<{ bug: Bug }>(`/api/projects/${id}/bugs`, bug);
      },
      async getMemoryDecisions(id: string) {
        const res = await client.get<{ decisions: MemoryDecision[] }>(`/api/projects/${id}/memory/decisions`);
        return res.decisions;
      },
      async getMemoryGotchas(id: string) {
        const res = await client.get<{ gotchas: MemoryGotcha[] }>(`/api/projects/${id}/memory/gotchas`);
        return res.gotchas;
      },
      async getMemoryStats(id: string) {
        return client.get<MemoryStats>(`/api/projects/${id}/memory/stats`);
      },
      async getFile(id: string, filename: string) {
        return client.get<ProjectFile>(`/api/projects/${id}/files/${filename}`);
      },
    },
  };
}
