import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Box, Text, useInput } from 'ink';
import { useState, useCallback } from 'react';
import Spinner from 'ink-spinner';
import { spawn } from 'child_process';
const MAX_AGENTS = 3;
export function AgentsPane({ isActive, isTTY = true, onTaskComplete }) {
    const [agents, setAgents] = useState([
        { id: 1, status: 'idle', task: null, issueNumber: null, output: [], process: null },
        { id: 2, status: 'idle', task: null, issueNumber: null, output: [], process: null },
        { id: 3, status: 'idle', task: null, issueNumber: null, output: [], process: null },
    ]);
    const assignTask = useCallback((agentId, task, issueNumber) => {
        setAgents(prev => prev.map(agent => {
            if (agent.id !== agentId)
                return agent;
            // Spawn Claude Code process for this task
            const proc = spawn('claude', ['-p', `Work on task: ${task}. When done, output TASK_COMPLETE.`], {
                cwd: process.cwd(),
                stdio: ['pipe', 'pipe', 'pipe']
            });
            const output = [];
            proc.stdout?.on('data', (data) => {
                const text = data.toString();
                output.push(text);
                // Check if task is complete
                if (text.includes('TASK_COMPLETE')) {
                    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: 'done', output } : a));
                    onTaskComplete?.(issueNumber);
                }
            });
            proc.stderr?.on('data', (data) => {
                output.push(`[ERROR] ${data.toString()}`);
            });
            proc.on('close', (code) => {
                setAgents(prev => prev.map(a => a.id === agentId ? {
                    ...a,
                    status: code === 0 ? 'done' : 'error',
                    process: null
                } : a));
            });
            return {
                ...agent,
                status: 'working',
                task,
                issueNumber,
                output: [],
                process: proc
            };
        }));
    }, [onTaskComplete]);
    const stopAgent = useCallback((agentId) => {
        setAgents(prev => prev.map(agent => {
            if (agent.id !== agentId)
                return agent;
            agent.process?.kill();
            return { ...agent, status: 'idle', task: null, issueNumber: null, process: null };
        }));
    }, []);
    useInput((input, key) => {
        if (!isActive)
            return;
        // 1, 2, 3 to select agent
        // s to stop selected agent
        const agentNum = parseInt(input);
        if (agentNum >= 1 && agentNum <= 3) {
            const agent = agents[agentNum - 1];
            if (agent.status === 'working') {
                stopAgent(agentNum);
            }
        }
    }, { isActive: isTTY });
    return (_jsxs(Box, { padding: 1, flexDirection: "column", children: [_jsx(Box, { marginBottom: 1, children: _jsxs(Text, { bold: true, children: ["Agents (", agents.filter(a => a.status === 'working').length, "/", MAX_AGENTS, " active)"] }) }), agents.map((agent) => (_jsxs(Box, { marginBottom: 1, children: [_jsxs(Text, { color: "gray", children: ["[", agent.id, "] "] }), agent.status === 'idle' && (_jsx(Text, { color: "gray", children: "Idle" })), agent.status === 'working' && (_jsxs(_Fragment, { children: [_jsx(Text, { color: "yellow", children: _jsx(Spinner, { type: "dots" }) }), _jsxs(Text, { color: "cyan", children: [" #", agent.issueNumber, ": "] }), _jsxs(Text, { children: [agent.task?.slice(0, 30), "..."] })] })), agent.status === 'done' && (_jsxs(_Fragment, { children: [_jsx(Text, { color: "green", children: "Done " }), _jsxs(Text, { color: "gray", children: ["#", agent.issueNumber] })] })), agent.status === 'error' && (_jsx(Text, { color: "red", children: "Error" }))] }, agent.id))), isActive && (_jsx(Box, { marginTop: 1, children: _jsx(Text, { dimColor: true, children: "[1-3] Stop agent" }) }))] }));
}
export function getIdleAgent(agents) {
    return agents.find(a => a.status === 'idle');
}
