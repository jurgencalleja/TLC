import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Box, Text, useApp, useInput } from 'ink';
import { useState, useCallback } from 'react';
// Layout components
import { Shell } from './components/layout/Shell.js';
import { Sidebar, SidebarItem } from './components/layout/Sidebar.js';
import { Header } from './components/layout/Header.js';
// Main pane components
import { ChatPane } from './components/ChatPane.js';
import { PreviewPane } from './components/PreviewPane.js';
import { AgentsPane } from './components/AgentsPane.js';
import { GitHubPane } from './components/GitHubPane.js';
import { ProjectList } from './components/ProjectList.js';
import { ProjectDetail } from './components/ProjectDetail.js';
import { TaskBoard } from './components/TaskBoard.js';
import { LogsPane } from './components/LogsPane.js';
import { HealthPane } from './components/HealthPane.js';
import { ServicesPane } from './components/ServicesPane.js';
import RouterPane from './components/RouterPane.js';
import { UsagePane } from './components/UsagePane.js';
import { SettingsPanel } from './components/SettingsPanel.js';
import { AgentRegistryPane } from './components/AgentRegistryPane.js';
import { BugsPane } from './components/BugsPane.js';
// Utility components
import { CommandPalette } from './components/CommandPalette.js';
import { KeyboardHelp } from './components/KeyboardHelp.js';
import { StatusBar } from './components/StatusBar.js';
import { ConnectionStatus } from './components/ConnectionStatus.js';
// Sidebar navigation items
const navItems = [
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
const sampleProjects = [
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
const sampleProjectDetail = {
    id: '1',
    name: 'TLC',
    description: 'Test-Led Coding framework',
    phases: [
        { number: 33, name: 'Multi-Model Router', status: 'completed' },
        { number: 34, name: 'API Gateway', status: 'in_progress' },
    ],
    tasks: [
        { id: '1', title: 'Build Router API', status: 'completed' },
        { id: '2', title: 'Dashboard Integration', status: 'in_progress' },
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
        { id: '1', timestamp: new Date().toISOString(), level: 'info', message: 'Server started' },
        { id: '2', timestamp: new Date().toISOString(), level: 'info', message: 'Dashboard ready' },
    ],
};
const sampleTasks = [
    { id: '1', title: 'Build Router API', status: 'completed' },
    { id: '2', title: 'Dashboard Integration', status: 'in_progress' },
    { id: '3', title: 'Add E2E tests', status: 'pending' },
];
const sampleLogs = [
    { id: '1', timestamp: new Date().toISOString(), level: 'info', message: 'Server started on port 5001' },
    { id: '2', timestamp: new Date().toISOString(), level: 'info', message: 'Database connected' },
    { id: '3', timestamp: new Date().toISOString(), level: 'warn', message: 'High memory usage detected' },
];
const sampleServices = [
    { name: 'api', type: 'server', port: 5001, state: 'running' },
    { name: 'dashboard', type: 'server', port: 3147, state: 'running' },
    { name: 'worker', type: 'worker', port: 0, state: 'stopped' },
];
const sampleConfig = {
    project: 'TLC',
    testFrameworks: { primary: 'vitest' },
    router: {
        providers: {
            claude: { type: 'cli', command: 'claude' },
        },
    },
};
const commands = [
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
const shortcuts = [
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
export function App({ isTTY = true }) {
    const { exit } = useApp();
    // Navigation state
    const [activeView, setActiveView] = useState('projects');
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);
    // Data state
    const [selectedProject, setSelectedProject] = useState(null);
    const [connectionState] = useState('connected');
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
            if (showCommandPalette)
                setShowCommandPalette(false);
            else if (showHelp)
                setShowHelp(false);
            else if (selectedProject)
                setSelectedProject(null);
            return;
        }
        // Number keys for main navigation (when no overlay)
        if (!showCommandPalette && !showHelp) {
            if (input === '1')
                setActiveView('projects');
            if (input === '2')
                setActiveView('tasks');
            if (input === '3')
                setActiveView('chat');
            if (input === '4')
                setActiveView('agents');
            if (input === '5')
                setActiveView('preview');
            if (input === '6')
                setActiveView('logs');
            if (input === '7')
                setActiveView('github');
            if (input === '8')
                setActiveView('health');
            if (input === '9')
                setActiveView('router');
            if (input === 'b')
                setActiveView('bugs');
            if (input === '0')
                setActiveView('settings');
            // Tab cycles through views
            if (key.tab) {
                const currentIndex = navItems.findIndex(item => item.key === activeView);
                const nextIndex = (currentIndex + 1) % navItems.length;
                setActiveView(navItems[nextIndex].key);
            }
        }
    }, { isActive: isTTY });
    // Handlers
    const handleProjectSelect = useCallback((_project) => {
        setSelectedProject(sampleProjectDetail);
    }, []);
    const handleCommandSelect = useCallback((command) => {
        setShowCommandPalette(false);
        if (command.id.startsWith('view:')) {
            const view = command.id.replace('view:', '');
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
            return (_jsx(ProjectDetail, { project: selectedProject, onBack: () => setSelectedProject(null) }));
        }
        switch (activeView) {
            case 'projects':
                return (_jsx(ProjectList, { projects: sampleProjects, onSelect: handleProjectSelect }));
            case 'tasks':
                return _jsx(TaskBoard, { tasks: sampleTasks });
            case 'chat':
                return _jsx(ChatPane, { isActive: true, isTTY: isTTY });
            case 'agents':
                return (_jsxs(Box, { flexDirection: "column", flexGrow: 1, children: [_jsx(Box, { flexGrow: 1, children: _jsx(AgentsPane, { isActive: true, isTTY: isTTY }) }), _jsx(Box, { height: 10, borderStyle: "single", borderColor: "gray", marginTop: 1, children: _jsx(AgentRegistryPane, { isActive: false }) })] }));
            case 'preview':
                return _jsx(PreviewPane, { isActive: true, isTTY: isTTY });
            case 'logs':
                return _jsx(LogsPane, { logs: sampleLogs, isActive: true });
            case 'github':
                return _jsx(GitHubPane, { isActive: true, isTTY: isTTY });
            case 'health':
                return (_jsxs(Box, { flexDirection: "row", flexGrow: 1, children: [_jsx(Box, { width: "50%", flexDirection: "column", children: _jsx(HealthPane, {}) }), _jsx(Box, { width: "50%", flexDirection: "column", marginLeft: 1, children: _jsx(ServicesPane, { services: sampleServices, isActive: true }) })] }));
            case 'router':
                return (_jsxs(Box, { flexDirection: "row", flexGrow: 1, children: [_jsx(Box, { width: "60%", flexDirection: "column", children: _jsx(RouterPane, {}) }), _jsx(Box, { width: "40%", flexDirection: "column", marginLeft: 1, children: _jsx(UsagePane, {}) })] }));
            case 'bugs':
                return _jsx(BugsPane, { isActive: true, isTTY: isTTY });
            case 'settings':
                return (_jsxs(Box, { flexDirection: "column", flexGrow: 1, children: [_jsx(SettingsPanel, { config: sampleConfig }), _jsx(Box, { marginTop: 1, borderStyle: "single", borderColor: "gray", padding: 1, children: _jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { bold: true, color: "cyan", children: "Quick Links" }), _jsx(Text, { color: "gray", children: "[U] Usage   [Q] Quality   [D] Docs   [W] Workspace   [A] Audit" })] }) })] }));
            default:
                return (_jsx(Box, { padding: 1, children: _jsx(Text, { color: "gray", children: "Select a view from the sidebar" }) }));
        }
    };
    // Render sidebar
    const renderSidebar = () => (_jsxs(Sidebar, { title: "TLC", children: [navItems.map(item => (_jsx(SidebarItem, { label: item.label, icon: item.icon, shortcut: item.shortcut, active: activeView === item.key }, item.key))), _jsx(Box, { marginTop: 1, children: _jsx(Text, { dimColor: true, children: "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500" }) }), _jsx(Box, { marginTop: 1, children: _jsx(Text, { dimColor: true, children: "Ctrl+K: Commands" }) }), _jsx(Box, { children: _jsx(Text, { dimColor: true, children: "?: Help" }) })] }));
    // Render header
    const renderHeader = () => (_jsx(Header, { title: "TLC Dashboard", subtitle: viewTitle, status: connectionState === 'connected' ? 'online' : 'offline', actions: _jsxs(Box, { children: [_jsx(ConnectionStatus, { state: connectionState }), _jsx(Text, { color: "gray", children: " | " }), _jsx(Text, { dimColor: true, children: "v1.2.24" })] }) }));
    // Render footer/status bar
    const renderFooter = () => (_jsxs(Box, { justifyContent: "space-between", children: [_jsx(Text, { dimColor: true, children: "Tab: cycle | 1-0: jump | Ctrl+B: sidebar | Ctrl+K: commands | ?: help | Ctrl+Q: quit" }), _jsx(StatusBar, {})] }));
    return (_jsxs(Box, { flexDirection: "column", width: "100%", height: "100%", children: [_jsx(Shell, { header: renderHeader(), footer: renderFooter(), sidebar: showSidebar ? renderSidebar() : undefined, showSidebar: showSidebar, sidebarWidth: 20, children: _jsxs(Box, { flexDirection: "column", flexGrow: 1, children: [_jsxs(Box, { borderStyle: "single", borderColor: "cyan", borderBottom: true, borderTop: false, borderLeft: false, borderRight: false, paddingX: 1, marginBottom: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: viewTitle }), selectedProject && (_jsxs(_Fragment, { children: [_jsx(Text, { color: "gray", children: " \u203A " }), _jsx(Text, { children: selectedProject.name })] }))] }), _jsx(Box, { flexGrow: 1, children: renderMainContent() })] }) }), showCommandPalette && (_jsx(Box, { position: "absolute", width: "60%", height: "50%", marginLeft: 10, marginTop: 5, borderStyle: "double", borderColor: "cyan", flexDirection: "column", children: _jsx(CommandPalette, { commands: commands, onSelect: handleCommandSelect, onClose: () => setShowCommandPalette(false) }) })), showHelp && (_jsx(Box, { position: "absolute", width: "70%", height: "80%", marginLeft: 8, marginTop: 3, borderStyle: "double", borderColor: "yellow", flexDirection: "column", children: _jsx(KeyboardHelp, { shortcuts: shortcuts, onClose: () => setShowHelp(false) }) }))] }));
}
