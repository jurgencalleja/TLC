import { useEffect, useMemo } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Shell } from './components/layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CommandPalette, type Command } from './components/settings/CommandPalette';
import {
  DashboardPage,
  TasksPage,
  LogsPage,
  SettingsPage,
  ProjectsPage,
  TeamPage,
  HealthPage,
  PreviewPage,
} from './pages';
import { useUIStore } from './stores';
import { useWebSocket } from './hooks';
import { useWorkspace } from './hooks/useWorkspace';
import { api } from './api';
import { SetupScreen } from './components/workspace/SetupScreen';
import { WorkspaceToolbar } from './components/workspace/WorkspaceToolbar';
import { ProjectSelector } from './components/workspace/ProjectSelector';

const resolveWsUrl = (apiBase?: string, projectId?: string | null) => {
  const base =
    apiBase && apiBase.trim().length > 0
      ? apiBase
      : `${window.location.protocol}//${window.location.host}`;
  let resolved: URL;
  try {
    resolved = new URL(base, window.location.origin);
  } catch {
    resolved = new URL(`${window.location.protocol}//${window.location.host}`);
  }
  const protocol = resolved.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsBase = `${protocol}//${resolved.host}`;
  const wsUrl = new URL('/ws', wsBase);
  if (projectId) {
    wsUrl.searchParams.set('projectId', projectId);
  }
  return wsUrl.toString();
};

function AppContent() {
  const navigate = useNavigate();
  const { isCommandPaletteOpen, closeCommandPalette, initFromStorage, toggleTheme } = useUIStore();
  const workspace = useWorkspace();

  // Initialize theme from localStorage
  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  // Connect to WebSocket for real-time updates
  const wsUrl = useMemo(
    () => resolveWsUrl(import.meta.env.VITE_API_URL, workspace.selectedProject?.id),
    [workspace.selectedProject?.id]
  );

  useWebSocket({
    url: wsUrl,
    autoConnect: true,
    projectId: workspace.selectedProject?.id,
  });

  const pid = workspace.selectedProject?.id;
  const commands: Command[] = useMemo(() => [
    { id: 'nav-dashboard', label: 'Go to Dashboard', shortcut: 'g d', action: () => { navigate(pid ? `/projects/${pid}` : '/'); closeCommandPalette(); } },
    { id: 'nav-projects', label: 'Go to Projects', shortcut: 'g p', action: () => { navigate('/projects'); closeCommandPalette(); } },
    { id: 'nav-tasks', label: 'Go to Tasks', shortcut: 'g t', action: () => { navigate(pid ? `/projects/${pid}/tasks` : '/tasks'); closeCommandPalette(); } },
    { id: 'nav-logs', label: 'Go to Logs', shortcut: 'g l', action: () => { navigate(pid ? `/projects/${pid}/logs` : '/logs'); closeCommandPalette(); } },
    { id: 'nav-settings', label: 'Go to Settings', shortcut: 'g s', action: () => { navigate('/settings'); closeCommandPalette(); } },
    { id: 'nav-team', label: 'Go to Team', shortcut: 'g m', action: () => { navigate('/team'); closeCommandPalette(); } },
    { id: 'nav-health', label: 'Go to Health', shortcut: 'g h', action: () => { navigate('/health'); closeCommandPalette(); } },
    { id: 'nav-preview', label: 'Go to Preview', shortcut: 'g v', action: () => { navigate(pid ? `/projects/${pid}/preview` : '/preview'); closeCommandPalette(); } },
    { id: 'nav-setup', label: 'Workspace Setup', shortcut: 'g w', action: () => { navigate('/setup'); closeCommandPalette(); } },
    { id: 'toggle-theme', label: 'Toggle Theme', shortcut: 't', action: () => { toggleTheme(); closeCommandPalette(); } },
  ], [navigate, closeCommandPalette, toggleTheme, pid]);

  return (
    <>
      <Routes>
        <Route path="/setup" element={
          <SetupScreen
            onScan={async (roots) => {
              await api.workspace.setConfig(roots);
              await workspace.scan();
            }}
            onScanComplete={() => navigate('/projects')}
            isScanning={workspace.isScanning}
            error={workspace.error}
          />
        } />
        <Route path="/*" element={
          <Shell>
            <div className="flex items-center gap-4 px-6 py-3 border-b border-border bg-bg-secondary">
              {workspace.projects.length > 0 && (
                <ProjectSelector
                  projects={workspace.projects}
                  selectedProjectId={workspace.selectedProject?.id ?? null}
                  onSelect={(id) => {
                    workspace.selectProject(id);
                    navigate(`/projects/${id}`);
                  }}
                />
              )}
              <WorkspaceToolbar
                onScan={() => workspace.scan()}
                lastScan={workspace.lastScan}
                isScanning={workspace.isScanning}
                projectCount={workspace.projects.length}
                error={workspace.error}
              />
            </div>
            <Routes>
              {/* Project-scoped routes */}
              <Route path="/projects/:projectId" element={<DashboardPage />} />
              <Route path="/projects/:projectId/tasks" element={<TasksPage />} />
              <Route path="/projects/:projectId/logs" element={<LogsPage />} />
              <Route path="/projects/:projectId/preview" element={<PreviewPage />} />
              {/* Global routes */}
              <Route path="/" element={<DashboardPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/logs" element={<LogsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/team" element={<TeamPage />} />
              <Route path="/health" element={<HealthPage />} />
              <Route path="/preview" element={<PreviewPage />} />
            </Routes>
          </Shell>
        } />
      </Routes>

      <CommandPalette
        commands={commands}
        open={isCommandPaletteOpen}
        onClose={closeCommandPalette}
      />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;
