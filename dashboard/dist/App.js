import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text, useApp, useInput } from 'ink';
import { useState, useCallback } from 'react';
import { ChatPane } from './components/ChatPane.js';
import { PlanView } from './components/PlanView.js';
import { PreviewPane } from './components/PreviewPane.js';
import { AgentsPane } from './components/AgentsPane.js';
import { GitHubPane } from './components/GitHubPane.js';
import { markIssueComplete, markIssueInProgress } from './components/PlanSync.js';
export function App({ isTTY = true }) {
    const { exit } = useApp();
    const [activePane, setActivePane] = useState('chat');
    const [pendingTasks, setPendingTasks] = useState(new Map());
    useInput((input, key) => {
        if (input === 'q' && key.ctrl) {
            exit();
        }
        if (key.tab) {
            setActivePane(prev => {
                const panes = ['chat', 'plan', 'github', 'agents', 'preview'];
                const idx = panes.indexOf(prev);
                return panes[(idx + 1) % panes.length];
            });
        }
        // Number keys to quick-switch panes
        if (input === '1')
            setActivePane('chat');
        if (input === '2')
            setActivePane('plan');
        if (input === '3')
            setActivePane('github');
        if (input === '4')
            setActivePane('agents');
        if (input === '5')
            setActivePane('preview');
    }, { isActive: isTTY });
    const handleAssignToAgent = useCallback(async (issue) => {
        await markIssueInProgress(issue.number);
        setPendingTasks(prev => new Map(prev).set(issue.number, issue.title));
        // Agent assignment happens in AgentsPane
    }, []);
    const handleTaskComplete = useCallback(async (issueNumber) => {
        await markIssueComplete(issueNumber);
        setPendingTasks(prev => {
            const next = new Map(prev);
            next.delete(issueNumber);
            return next;
        });
    }, []);
    return (_jsxs(Box, { flexDirection: "column", width: "100%", height: "100%", children: [_jsxs(Box, { borderStyle: "single", paddingX: 1, justifyContent: "space-between", children: [_jsxs(Box, { children: [_jsx(Text, { bold: true, color: "cyan", children: "TLC Dashboard" }), _jsx(Text, { color: "gray", children: " | " }), _jsx(Text, { color: activePane === 'chat' ? 'cyan' : 'gray', children: "[1]Chat " }), _jsx(Text, { color: activePane === 'plan' ? 'cyan' : 'gray', children: "[2]Plan " }), _jsx(Text, { color: activePane === 'github' ? 'cyan' : 'gray', children: "[3]GitHub " }), _jsx(Text, { color: activePane === 'agents' ? 'cyan' : 'gray', children: "[4]Agents " }), _jsx(Text, { color: activePane === 'preview' ? 'cyan' : 'gray', children: "[5]Preview" })] }), _jsx(Box, { children: _jsx(Text, { color: "cyan", bold: true, children: "| TLC |" }) })] }), _jsxs(Box, { flexGrow: 1, flexDirection: "row", children: [_jsxs(Box, { flexDirection: "column", width: "60%", borderStyle: "single", borderColor: activePane === 'chat' ? 'cyan' : 'gray', children: [_jsx(Box, { paddingX: 1, borderStyle: "single", borderBottom: true, borderLeft: false, borderRight: false, borderTop: false, children: _jsx(Text, { bold: true, color: activePane === 'chat' ? 'cyan' : 'white', children: "Chat" }) }), _jsx(ChatPane, { isActive: activePane === 'chat', isTTY: isTTY })] }), _jsxs(Box, { flexDirection: "column", width: "40%", children: [_jsxs(Box, { flexDirection: "column", height: "30%", borderStyle: "single", borderColor: activePane === 'github' ? 'cyan' : 'gray', children: [_jsx(Box, { paddingX: 1, borderStyle: "single", borderBottom: true, borderLeft: false, borderRight: false, borderTop: false, children: _jsx(Text, { bold: true, color: activePane === 'github' ? 'cyan' : 'white', children: "GitHub Issues" }) }), _jsx(GitHubPane, { isActive: activePane === 'github', isTTY: isTTY, onAssignToAgent: handleAssignToAgent })] }), _jsxs(Box, { flexDirection: "column", height: "30%", borderStyle: "single", borderColor: activePane === 'agents' ? 'cyan' : 'gray', children: [_jsx(Box, { paddingX: 1, borderStyle: "single", borderBottom: true, borderLeft: false, borderRight: false, borderTop: false, children: _jsx(Text, { bold: true, color: activePane === 'agents' ? 'cyan' : 'white', children: "Agents" }) }), _jsx(AgentsPane, { isActive: activePane === 'agents', isTTY: isTTY, onTaskComplete: handleTaskComplete })] }), _jsxs(Box, { flexDirection: "column", height: "20%", borderStyle: "single", borderColor: activePane === 'plan' ? 'cyan' : 'gray', children: [_jsx(Box, { paddingX: 1, borderStyle: "single", borderBottom: true, borderLeft: false, borderRight: false, borderTop: false, children: _jsx(Text, { bold: true, color: activePane === 'plan' ? 'cyan' : 'white', children: "Plan" }) }), _jsx(PlanView, {})] }), _jsxs(Box, { flexDirection: "column", flexGrow: 1, borderStyle: "single", borderColor: activePane === 'preview' ? 'cyan' : 'gray', children: [_jsx(Box, { paddingX: 1, borderStyle: "single", borderBottom: true, borderLeft: false, borderRight: false, borderTop: false, children: _jsx(Text, { bold: true, color: activePane === 'preview' ? 'cyan' : 'white', children: "Preview" }) }), _jsx(PreviewPane, { isActive: activePane === 'preview', isTTY: isTTY })] })] })] }), _jsx(Box, { borderStyle: "single", paddingX: 1, children: _jsx(Text, { dimColor: true, children: "Tab: cycle panes | 1-5: jump to pane | Ctrl+Q: quit" }) })] }));
}
