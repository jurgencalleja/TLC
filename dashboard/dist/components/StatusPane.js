import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { useState, useEffect } from 'react';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
export function StatusPane() {
    const [tests, setTests] = useState(null);
    const [lastRun, setLastRun] = useState('Never');
    useEffect(() => {
        async function checkTests() {
            try {
                // Try to detect test framework and get status
                // This is a simplified version - real implementation would parse test output
                const { stdout } = await execAsync('npm test -- --reporter=json 2>/dev/null || echo "{}"', {
                    timeout: 30000,
                    cwd: process.cwd()
                });
                // For now, show placeholder
                setTests({ total: 0, passed: 0, failed: 0, pending: 0 });
                setLastRun(new Date().toLocaleTimeString());
            }
            catch (e) {
                // Tests not configured or failed to run
                setTests(null);
            }
        }
        // Check on mount
        checkTests();
    }, []);
    return (_jsx(Box, { padding: 1, flexDirection: "column", children: tests ? (_jsxs(_Fragment, { children: [_jsxs(Box, { children: [_jsxs(Text, { color: "green", children: ["Passed: ", tests.passed] }), _jsx(Text, { children: " | " }), _jsxs(Text, { color: "red", children: ["Failed: ", tests.failed] }), _jsx(Text, { children: " | " }), _jsxs(Text, { color: "yellow", children: ["Pending: ", tests.pending] })] }), _jsx(Box, { marginTop: 1, children: _jsxs(Text, { color: "gray", children: ["Total: ", tests.total] }) }), _jsx(Box, { marginTop: 1, children: _jsxs(Text, { dimColor: true, children: ["Last run: ", lastRun] }) })] })) : (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { color: "gray", children: "No test results." }), _jsx(Text, { dimColor: true, children: "Run tests to see status." })] })) }));
}
