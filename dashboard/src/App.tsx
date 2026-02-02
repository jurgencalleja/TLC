import { Box, Text, useApp, useInput } from 'ink';
import { useState, useCallback, useEffect } from 'react';

// Layout components
import { Shell } from './components/layout/Shell.js';
import { Sidebar, SidebarItem } from './components/layout/Sidebar.js';
import { Header } from './components/layout/Header.js';

// Main pane components
import { ChatPane } from './components/ChatPane.js';
import { PreviewPane } from './components/PreviewPane.js';
import { AgentsPane } from './components/AgentsPane.js';
import { GitHubPane } from './components/GitHubPane.js';
import { ProjectList, Project } from './components/ProjectList.js';
import { ProjectDetail, ProjectDetailData } from './components/ProjectDetail.js';
import { TaskBoard, Task } from './components/TaskBoard.js';
import { LogsPane } from './components/LogsPane.js';
import { HealthPane } from './components/HealthPane.js';
import { ServicesPane } from './components/ServicesPane.js';
import RouterPane from './components/RouterPane.js';
import { UsagePane } from './components/UsagePane.js';
import { SettingsPanel } from './components/SettingsPanel.js';
import { AgentRegistryPane } from './components/AgentRegistryPane.js';
import { BugsPane } from './components/BugsPane.js';
import { UpdateBanner } from './components/UpdateBanner.js';

// Utility components
import { CommandPalette, Command } from './components/CommandPalette.js';
import { KeyboardHelp, Shortcut } from './components/KeyboardHelp.js';
import { StatusBar } from './components/StatusBar.js';
import { ConnectionStatus, ConnectionState } from './components/ConnectionStatus.js';

// Types
type MainView =
  | 'projects'
  | 'tasks'
  | 'chat'
  | 'agents'
  | 'preview'
  | 'logs'
  | 'github'
  | 'health'
  | 'router'
  | 'bugs'
  | 'settings';

interface AppProps {
  isTTY?: boolean;
}

// Sidebar navigation items
const navItems: { key: MainView; label: string; icon: string; shortcut: string }[] = [
  { key: 'projects', label: 'Projects', icon: '📁', shortcut: '1' },
  { key: 'tasks', label: 'Tasks', icon: '📋', shortcut: '2' },
  { key: 'chat', label: 'Chat', icon: '💬', shortcut: '3' },
  { key: 'agents', label: 'Agents', icon: '🤖', shortcut: '4' },
  { key: 'preview', label: 'Preview', icon: '👁', shortcut: '5' },
  { key: 'logs', label: 'Logs', icon: '📜', shortcut: '6' },
  { key: 'github', label: 'GitHub', icon: '🐙', shortcut: '7' },
  { key: 'health', label: 'Health', icon: '💚', shortcut: '8' },
  { key: 'router', label: 'Router', icon: '🔀', shortcut: '9' },
  { key: 'bugs', label: 'Bugs', icon: '🐛', shortcut: 'b' },
  { key: 'settings', label: 'Settings', icon: '⚙️', shortcut: '0' },
];

// Sample data for development
const sampleProjects: Project[] = [
  {
    id: '1',
    name: 'TLC',
    description: 'Test-Led Coding framework',
    phase: { current: 33, total: 40, name: 'Multi-Model Router' },
    tests: { passing: 1180, failing: 20, total: 1200 },
    coverage: 87,
    lastActivity: '2 min ago',
  },
];

const sampleProjectDetail: ProjectDetailData = {
  id: '1',
  name: 'TLC',
  description: 'Test-Led Coding framework',
  phases: [
    { number: 33, name: 'Multi-Model Router', status: 'completed' as const },
    { number: 34, name: 'API Gateway', status: 'in_progress' as const },
  ],
  tasks: [
    { id: '1', title: 'Build Router API', status: 'completed' as const },
    { id: '2', title: 'Dashboard Integration', status: 'in_progress' as const },
  ],
  tests: {
    passing: 1180,
    failing: 20,
    total: 1200,
    recentRuns: [
      { id: '1', timestamp: '2 min ago', passed: 1180, failed: 20, duration: '45s' },
      { id: '2', timestamp: '1 hour ago', passed: 1175, failed: 25, duration: '48s' },
    ],
  },
  logs: [
    { id: '1', timestamp: new Date().toISOString(), level: 'info' as const, message: 'Server started' },
    { id: '2', timestamp: new Date().toISOString(), level: 'info' as const, message: 'Dashboard ready' },
  ],
};

const sampleTasks: Task[] = [
  { id: '1', title: 'Build Router API', status: 'completed' },
  { id: '2', title: 'Dashboard Integration', status: 'in_progress' },
  { id: '3', title: 'Add E2E tests', status: 'pending' },
];

const sampleLogs = [
  { id: '1', timestamp: new Date().toISOString(), level: 'info' as const, message: 'Server started on port 5001' },
  { id: '2', timestamp: new Date().toISOString(), level: 'info' as const, message: 'Database connected' },
  { id: '3', timestamp: new Date().toISOString(), level: 'warn' as const, message: 'High memory usage detected' },
];

const sampleServices = [
  { name: 'api', type: 'server', port: 5001, state: 'running' as const },
  { name: 'dashboard', type: 'server', port: 3147, state: 'running' as const },
  { name: 'worker', type: 'worker', port: 0, state: 'stopped' as const },
];

const sampleConfig = {
  project: 'TLC',
  testFrameworks: { primary: 'vitest' as const },
  router: {
    providers: {
      claude: { type: 'cli' as const, command: 'claude' },
    },
  },
};

const commands: Command[] = [
  { id: 'view:projects', name: 'Go to Projects', description: 'View all projects', shortcut: '1', category: 'Navigation' },
  { id: 'view:tasks', name: 'Go to Tasks', description: 'View task board', shortcut: '2', category: 'Navigation' },
  { id: 'view:chat', name: 'Go to Chat', description: 'Open chat', shortcut: '3', category: 'Navigation' },
  { id: 'view:agents', name: 'Go to Agents', description: 'View agents', shortcut: '4', category: 'Navigation' },
  { id: 'view:logs', name: 'Go to Logs', description: 'View logs', shortcut: '6', category: 'Navigation' },
  { id: 'view:router', name: 'Go to Router', description: 'View model router', shortcut: '9', category: 'Navigation' },
  { id: 'view:bugs', name: 'Go to Bugs', description: 'View and submit bugs', shortcut: 'b', category: 'Navigation' },
  { id: 'cmd:run-tests', name: 'Run Tests', description: 'Run test suite', category: 'Commands' },
  { id: 'cmd:build', name: 'Build Phase', description: 'Build current phase', category: 'Commands' },
];

const shortcuts: Shortcut[] = [
  { key: '1-0', description: 'Jump to view', context: 'global' },
  { key: 'Tab', description: 'Cycle views', context: 'global' },
  { key: 'Ctrl+K', description: 'Command palette', context: 'global' },
  { key: 'Ctrl+B', description: 'Toggle sidebar', context: 'global' },
  { key: '?', description: 'Show help', context: 'global' },
  { key: 'Ctrl+Q', description: 'Quit', context: 'global' },
  { key: 'j/k', description: 'Navigate list', context: 'lists' },
  { key: 'Enter', description: 'Select item', context: 'lists' },
  { key: 'Esc', description: 'Go back / Close', context: 'global' },
];

export function App({ isTTY = true }: AppProps) {
  const { exit } = useApp();

  // Navigation state
  const [activeView, setActiveView] = useState<MainView>('projects');
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  // Data state
  const [selectedProject, setSelectedProject] = useState<ProjectDetailData | null>(null);
  const [connectionState] = useState<ConnectionState>('connected');

  // Update banner state
  const [updateInfo, setUpdateInfo] = useState<{
    current: string;
    latest: string;
    updateAvailable: boolean;
    changelog: string[];
  } | null>(null);
  const [updateDismissed, setUpdateDismissed] = useState(false);

  // Check for updates on mount
  useEffect(() => {
    async function checkUpdates() {
      try {
        const { checkForUpdates } = await import('../server/lib/version-checker.js');
        const info = await checkForUpdates();
        setUpdateInfo(info);
      } catch {
        // Silently fail if version checker not available
      }
    }
    checkUpdates();
  }, []);

  // Keyboard handling
  useInput((input, key) => {
    // Global shortcuts
    if (input === 'q' && key.ctrl) {
      exit();
      return;
    }

    if (input === 'k' && key.ctrl) {
      setShowCommandPalette(prev => !prev);
      return;
    }

    if (input === '?') {
      setShowHelp(prev => !prev);
      return;
    }

    if (input === 'b' && key.ctrl) {
      setShowSidebar(prev => !prev);
      return;
    }

    // Close overlays on Escape
    if (key.escape) {
      if (showCommandPalette) setShowCommandPalette(false);
      else if (showHelp) setShowHelp(false);
      else if (selectedProject) setSelectedProject(null);
      return;
    }

    // Number keys for main navigation (when no overlay)
    if (!showCommandPalette && !showHelp) {
      if (input === '1') setActiveView('projects');
      if (input === '2') setActiveView('tasks');
      if (input === '3') setActiveView('chat');
      if (input === '4') setActiveView('agents');
      if (input === '5') setActiveView('preview');
      if (input === '6') setActiveView('logs');
      if (input === '7') setActiveView('github');
      if (input === '8') setActiveView('health');
      if (input === '9') setActiveView('router');
      if (input === 'b') setActiveView('bugs');
      if (input === '0') setActiveView('settings');

      // Tab cycles through views
      if (key.tab) {
        const currentIndex = navItems.findIndex(item => item.key === activeView);
        const nextIndex = (currentIndex + 1) % navItems.length;
        setActiveView(navItems[nextIndex].key);
      }
    }
  }, { isActive: isTTY });

  // Handlers
  const handleProjectSelect = useCallback((_project: Project) => {
    setSelectedProject(sampleProjectDetail);
  }, []);

  const handleCommandSelect = useCallback((command: Command) => {
    setShowCommandPalette(false);
    if (command.id.startsWith('view:')) {
      const view = command.id.replace('view:', '') as MainView;
      setActiveView(view);
    }
  }, []);

  // Get current view title
  const currentNav = navItems.find(item => item.key === activeView);
  const viewTitle = currentNav ? `${currentNav.icon} ${currentNav.label}` : 'TLC';

  // Render main content based on active view
  const renderMainContent = () => {
    // Project detail view
    if (selectedProject && activeView === 'projects') {
      return (
        <ProjectDetail
          project={selectedProject}
          onBack={() => setSelectedProject(null)}
        />
      );
    }

    switch (activeView) {
      case 'projects':
        return (
          <ProjectList
            projects={sampleProjects}
            onSelect={handleProjectSelect}
          />
        );

      case 'tasks':
        return <TaskBoard tasks={sampleTasks} />;

      case 'chat':
        return <ChatPane isActive={true} isTTY={isTTY} />;

      case 'agents':
        return (
          <Box flexDirection="column" flexGrow={1}>
            <Box flexGrow={1}>
              <AgentsPane isActive={true} isTTY={isTTY} />
            </Box>
            <Box height={10} borderStyle="single" borderColor="gray" marginTop={1}>
              <AgentRegistryPane isActive={false} />
            </Box>
          </Box>
        );

      case 'preview':
        return <PreviewPane isActive={true} isTTY={isTTY} />;

      case 'logs':
        return <LogsPane logs={sampleLogs} isActive={true} />;

      case 'github':
        return <GitHubPane isActive={true} isTTY={isTTY} />;

      case 'health':
        return (
          <Box flexDirection="row" flexGrow={1}>
            <Box width="50%" flexDirection="column">
              <HealthPane />
            </Box>
            <Box width="50%" flexDirection="column" marginLeft={1}>
              <ServicesPane services={sampleServices} isActive={true} />
            </Box>
          </Box>
        );

      case 'router':
        return (
          <Box flexDirection="row" flexGrow={1}>
            <Box width="60%" flexDirection="column">
              <RouterPane />
            </Box>
            <Box width="40%" flexDirection="column" marginLeft={1}>
              <UsagePane />
            </Box>
          </Box>
        );

      case 'bugs':
        return <BugsPane isActive={true} isTTY={isTTY} />;

      case 'settings':
        return (
          <Box flexDirection="column" flexGrow={1}>
            <SettingsPanel config={sampleConfig} />
            <Box marginTop={1} borderStyle="single" borderColor="gray" padding={1}>
              <Box flexDirection="column">
                <Text bold color="cyan">Quick Links</Text>
                <Text color="gray">[U] Usage   [Q] Quality   [D] Docs   [W] Workspace   [A] Audit</Text>
              </Box>
            </Box>
          </Box>
        );

      default:
        return (
          <Box padding={1}>
            <Text color="gray">Select a view from the sidebar</Text>
          </Box>
        );
    }
  };

  // Render sidebar
  const renderSidebar = () => (
    <Sidebar title="TLC">
      {navItems.map(item => (
        <SidebarItem
          key={item.key}
          label={item.label}
          icon={item.icon}
          shortcut={item.shortcut}
          active={activeView === item.key}
        />
      ))}
      <Box marginTop={1}>
        <Text dimColor>───────────</Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Ctrl+K: Commands</Text>
      </Box>
      <Box>
        <Text dimColor>?: Help</Text>
      </Box>
    </Sidebar>
  );

  // Render header
  const renderHeader = () => (
    <Header
      title="TLC Dashboard"
      subtitle={viewTitle}
      status={connectionState === 'connected' ? 'online' : 'offline'}
      actions={
        <Box>
          <ConnectionStatus state={connectionState} />
          <Text color="gray"> | </Text>
          <Text dimColor>v1.2.24</Text>
        </Box>
      }
    />
  );

  // Render footer/status bar
  const renderFooter = () => (
    <Box justifyContent="space-between">
      <Text dimColor>
        Tab: cycle | 1-0: jump | Ctrl+B: sidebar | Ctrl+K: commands | ?: help | Ctrl+Q: quit
      </Text>
      <StatusBar />
    </Box>
  );

  return (
    <Box flexDirection="column" width="100%" height="100%">
      <Shell
        header={renderHeader()}
        footer={renderFooter()}
        sidebar={showSidebar ? renderSidebar() : undefined}
        showSidebar={showSidebar}
        sidebarWidth={20}
      >
        {/* Update banner */}
        {updateInfo && !updateDismissed && (
          <UpdateBanner
            current={updateInfo.current}
            latest={updateInfo.latest}
            updateAvailable={updateInfo.updateAvailable}
            changelog={updateInfo.changelog}
            dismissable={true}
            onDismiss={() => setUpdateDismissed(true)}
            compact={false}
            isActive={!showCommandPalette && !showHelp}
          />
        )}

        {/* Main content area */}
        <Box flexDirection="column" flexGrow={1}>
          {/* View header */}
          <Box
            borderStyle="single"
            borderColor="cyan"
            borderBottom
            borderTop={false}
            borderLeft={false}
            borderRight={false}
            paddingX={1}
            marginBottom={1}
          >
            <Text bold color="cyan">{viewTitle}</Text>
            {selectedProject && (
              <>
                <Text color="gray"> › </Text>
                <Text>{selectedProject.name}</Text>
              </>
            )}
          </Box>

          {/* Main content */}
          <Box flexGrow={1}>
            {renderMainContent()}
          </Box>
        </Box>
      </Shell>

      {/* Command Palette Overlay */}
      {showCommandPalette && (
        <Box
          position="absolute"
          width="60%"
          height="50%"
          marginLeft={10}
          marginTop={5}
          borderStyle="double"
          borderColor="cyan"
          flexDirection="column"
        >
          <CommandPalette
            commands={commands}
            onSelect={handleCommandSelect}
            onClose={() => setShowCommandPalette(false)}
          />
        </Box>
      )}

      {/* Help Overlay */}
      {showHelp && (
        <Box
          position="absolute"
          width="70%"
          height="80%"
          marginLeft={8}
          marginTop={3}
          borderStyle="double"
          borderColor="yellow"
          flexDirection="column"
        >
          <KeyboardHelp
            shortcuts={shortcuts}
            onClose={() => setShowHelp(false)}
          />
        </Box>
      )}
    </Box>
  );
}
