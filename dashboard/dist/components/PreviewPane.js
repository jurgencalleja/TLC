import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text, useInput } from 'ink';
import { useState, useCallback } from 'react';
import Spinner from 'ink-spinner';
export function PreviewPane({ isActive, isTTY = true }) {
    const [status, setStatus] = useState('stopped');
    const [url, setUrl] = useState(null);
    const [error, setError] = useState(null);
    const startContainer = useCallback(async () => {
        setStatus('starting');
        setError(null);
        try {
            // TODO: Integrate with dockerode
            // For now, simulate container start
            await new Promise(resolve => setTimeout(resolve, 2000));
            setStatus('running');
            setUrl('http://localhost:3000');
        }
        catch (e) {
            setStatus('error');
            setError(e instanceof Error ? e.message : 'Failed to start container');
        }
    }, []);
    const stopContainer = useCallback(async () => {
        setStatus('stopped');
        setUrl(null);
    }, []);
    useInput((input, key) => {
        if (!isActive)
            return;
        if (input === 's' && status === 'stopped') {
            startContainer();
        }
        else if (input === 'x' && status === 'running') {
            stopContainer();
        }
        else if (input === 'r' && status === 'running') {
            // Restart
            stopContainer().then(startContainer);
        }
    }, { isActive: isTTY });
    return (_jsxs(Box, { padding: 1, flexDirection: "column", children: [_jsxs(Box, { children: [_jsx(Text, { children: "Status: " }), status === 'stopped' && _jsx(Text, { color: "gray", children: "Stopped" }), status === 'starting' && (_jsxs(_Fragment, { children: [_jsx(Text, { color: "yellow", children: _jsx(Spinner, { type: "dots" }) }), _jsx(Text, { color: "yellow", children: " Starting..." })] })), status === 'running' && _jsx(Text, { color: "green", children: "Running" }), status === 'error' && _jsx(Text, { color: "red", children: "Error" })] }), url && (_jsx(Box, { marginTop: 1, children: _jsx(Text, { color: "cyan", children: url }) })), error && (_jsx(Box, { marginTop: 1, children: _jsx(Text, { color: "red", children: error }) })), _jsx(Box, { marginTop: 1, flexDirection: "column", children: _jsxs(Text, { dimColor: true, children: [status === 'stopped' && isActive && '[s] Start', status === 'running' && isActive && '[x] Stop | [r] Restart', !isActive && 'Tab to this pane for controls'] }) })] }));
}
