import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { useState, useEffect } from 'react';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
export function PhasesPane() {
    const [phases, setPhases] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        async function loadPhases() {
            const roadmapPath = join(process.cwd(), '.planning', 'ROADMAP.md');
            if (!existsSync(roadmapPath)) {
                setPhases([]);
                setLoading(false);
                return;
            }
            try {
                const content = await readFile(roadmapPath, 'utf-8');
                const parsed = parseRoadmap(content);
                setPhases(parsed);
            }
            catch (e) {
                setPhases([]);
            }
            setLoading(false);
        }
        loadPhases();
        const interval = setInterval(loadPhases, 5000);
        return () => clearInterval(interval);
    }, []);
    if (loading) {
        return (_jsx(Box, { padding: 1, children: _jsx(Text, { color: "gray", children: "Loading..." }) }));
    }
    if (phases.length === 0) {
        return (_jsxs(Box, { padding: 1, flexDirection: "column", children: [_jsx(Text, { color: "gray", children: "No roadmap found." }), _jsx(Text, { color: "gray", dimColor: true, children: "Run /tdd:new-project or /tdd:init" })] }));
    }
    return (_jsx(Box, { padding: 1, flexDirection: "column", children: phases.map((phase) => (_jsxs(Box, { children: [_jsx(Text, { color: phase.status === 'completed' ? 'green' :
                        phase.status === 'in_progress' ? 'yellow' :
                            'gray', children: phase.status === 'completed' ? ' [x] ' :
                        phase.status === 'in_progress' ? ' [>] ' :
                            ' [ ] ' }), _jsxs(Text, { color: phase.status === 'in_progress' ? 'cyan' : 'white', children: [phase.number, ". ", phase.name] })] }, phase.number))) }));
}
export function parseRoadmap(content) {
    const phases = [];
    const lines = content.split('\n');
    for (const line of lines) {
        // Match patterns like "## Phase 1: Setup" or "### 1. Auth System"
        const match = line.match(/^#+\s*(?:Phase\s+)?(\d+)[.:]?\s*(.+)/i);
        if (match) {
            const num = parseInt(match[1], 10);
            const name = match[2].replace(/\[.*?\]/g, '').trim();
            // Determine status from markers
            let status = 'pending';
            if (line.includes('[x]') || line.includes('[completed]')) {
                status = 'completed';
            }
            else if (line.includes('[>]') || line.includes('[in progress]') || line.includes('[current]')) {
                status = 'in_progress';
            }
            phases.push({ number: num, name, status });
        }
    }
    return phases;
}
