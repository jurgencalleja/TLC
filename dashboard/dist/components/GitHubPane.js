import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text, useInput } from 'ink';
import { useState, useEffect, useCallback } from 'react';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
export function GitHubPane({ isActive, isTTY = true, onAssignToAgent }) {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const fetchIssues = useCallback(async () => {
        try {
            // Use gh CLI to fetch issues
            const { stdout } = await execAsync('gh issue list --label "tdd" --state open --json number,title,state,labels,assignee --limit 20', { cwd: process.cwd() });
            const parsed = JSON.parse(stdout || '[]');
            setIssues(parsed.map((i) => ({
                number: i.number,
                title: i.title,
                state: i.state,
                labels: i.labels?.map((l) => l.name) || [],
                assignee: i.assignee?.login || null
            })));
            setError(null);
        }
        catch (e) {
            // Try without label filter
            try {
                const { stdout } = await execAsync('gh issue list --state open --json number,title,state,labels,assignee --limit 10', { cwd: process.cwd() });
                const parsed = JSON.parse(stdout || '[]');
                setIssues(parsed.map((i) => ({
                    number: i.number,
                    title: i.title,
                    state: i.state,
                    labels: i.labels?.map((l) => l.name) || [],
                    assignee: i.assignee?.login || null
                })));
                setError(null);
            }
            catch (e2) {
                setError('gh CLI not available or not in a repo');
                setIssues([]);
            }
        }
        setLoading(false);
    }, []);
    useEffect(() => {
        fetchIssues();
        const interval = setInterval(fetchIssues, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [fetchIssues]);
    const createIssue = useCallback(async (title, body) => {
        try {
            await execAsync(`gh issue create --title "${title}" --body "${body}" --label "tdd"`, { cwd: process.cwd() });
            fetchIssues();
        }
        catch (e) {
            setError('Failed to create issue');
        }
    }, [fetchIssues]);
    const closeIssue = useCallback(async (number) => {
        try {
            await execAsync(`gh issue close ${number}`, { cwd: process.cwd() });
            fetchIssues();
        }
        catch (e) {
            setError('Failed to close issue');
        }
    }, [fetchIssues]);
    useInput((input, key) => {
        if (!isActive)
            return;
        if (key.upArrow && selectedIndex > 0) {
            setSelectedIndex(prev => prev - 1);
        }
        if (key.downArrow && selectedIndex < issues.length - 1) {
            setSelectedIndex(prev => prev + 1);
        }
        if (input === 'a' && issues[selectedIndex]) {
            onAssignToAgent?.(issues[selectedIndex]);
        }
        if (input === 'c' && issues[selectedIndex]) {
            closeIssue(issues[selectedIndex].number);
        }
        if (input === 'r') {
            setLoading(true);
            fetchIssues();
        }
    }, { isActive: isTTY });
    if (loading) {
        return (_jsx(Box, { padding: 1, children: _jsx(Text, { color: "gray", children: "Loading issues..." }) }));
    }
    if (error) {
        return (_jsxs(Box, { padding: 1, flexDirection: "column", children: [_jsx(Text, { color: "red", children: error }), _jsx(Text, { dimColor: true, children: "Make sure gh CLI is installed and authenticated." })] }));
    }
    if (issues.length === 0) {
        return (_jsxs(Box, { padding: 1, flexDirection: "column", children: [_jsx(Text, { color: "gray", children: "No open issues." }), _jsx(Text, { dimColor: true, children: "Create issues with 'gh issue create'" })] }));
    }
    return (_jsxs(Box, { padding: 1, flexDirection: "column", children: [issues.slice(0, 6).map((issue, idx) => (_jsxs(Box, { children: [_jsx(Text, { color: idx === selectedIndex && isActive ? 'cyan' : 'white', children: idx === selectedIndex && isActive ? '> ' : '  ' }), _jsxs(Text, { color: "green", children: ["#", issue.number, " "] }), _jsxs(Text, { children: [issue.title.slice(0, 35), issue.title.length > 35 ? '...' : ''] }), issue.labels.includes('in-progress') && (_jsx(Text, { color: "yellow", children: " [WIP]" }))] }, issue.number))), isActive && (_jsx(Box, { marginTop: 1, flexDirection: "column", children: _jsx(Text, { dimColor: true, children: "[a] Assign to agent | [c] Close | [r] Refresh" }) }))] }));
}
// Helper to sync a task to GitHub
export async function syncTaskToGitHub(title, body) {
    try {
        const { stdout } = await promisify(exec)(`gh issue create --title "${title}" --body "${body}" --label "tdd" --json number`, { cwd: process.cwd() });
        const parsed = JSON.parse(stdout);
        return parsed.number;
    }
    catch (e) {
        return null;
    }
}
export async function markIssueComplete(number) {
    try {
        await promisify(exec)(`gh issue close ${number} --comment "Completed by TDD agent"`, {
            cwd: process.cwd()
        });
    }
    catch (e) {
        // Ignore errors
    }
}
