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

const WS_URL = 'ws://localhost:3001/ws';

function AppContent() {
  const navigate = useNavigate();
  const { isCommandPaletteOpen, closeCommandPalette, initFromStorage, toggleTheme } = useUIStore();

  // Initialize theme from localStorage
  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  // Connect to WebSocket for real-time updates
  useWebSocket({
    url: WS_URL,
    autoConnect: true,
  });

  const commands: Command[] = useMemo(() => [
    { id: 'nav-dashboard', label: 'Go to Dashboard', shortcut: 'g d', action: () => { navigate('/'); closeCommandPalette(); } },
    { id: 'nav-projects', label: 'Go to Projects', shortcut: 'g p', action: () => { navigate('/projects'); closeCommandPalette(); } },
    { id: 'nav-tasks', label: 'Go to Tasks', shortcut: 'g t', action: () => { navigate('/tasks'); closeCommandPalette(); } },
    { id: 'nav-logs', label: 'Go to Logs', shortcut: 'g l', action: () => { navigate('/logs'); closeCommandPalette(); } },
    { id: 'nav-settings', label: 'Go to Settings', shortcut: 'g s', action: () => { navigate('/settings'); closeCommandPalette(); } },
    { id: 'nav-team', label: 'Go to Team', shortcut: 'g m', action: () => { navigate('/team'); closeCommandPalette(); } },
    { id: 'nav-health', label: 'Go to Health', shortcut: 'g h', action: () => { navigate('/health'); closeCommandPalette(); } },
    { id: 'nav-preview', label: 'Go to Preview', shortcut: 'g v', action: () => { navigate('/preview'); closeCommandPalette(); } },
    { id: 'toggle-theme', label: 'Toggle Theme', shortcut: 't', action: () => { toggleTheme(); closeCommandPalette(); } },
  ], [navigate, closeCommandPalette, toggleTheme]);

  return (
    <>
      <Shell>
        <Routes>
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
