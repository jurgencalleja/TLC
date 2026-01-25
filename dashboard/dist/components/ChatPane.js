import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useState, useCallback } from 'react';
export function ChatPane({ isActive, isTTY = true }) {
    const [messages, setMessages] = useState([
        { role: 'system', content: 'TDD Dashboard ready. Type a message to start.' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const sendMessage = useCallback(async (text) => {
        if (!text.trim() || isLoading)
            return;
        // Add user message
        setMessages(prev => [...prev, { role: 'user', content: text }]);
        setInput('');
        setIsLoading(true);
        // TODO: Integrate with Claude Code CLI
        // For now, simulate a response
        setTimeout(() => {
            setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `Received: "${text}"\n\nClaude Code integration coming soon...`
                }]);
            setIsLoading(false);
        }, 500);
    }, [isLoading]);
    const handleSubmit = useCallback((value) => {
        sendMessage(value);
    }, [sendMessage]);
    return (_jsxs(Box, { flexDirection: "column", flexGrow: 1, padding: 1, children: [_jsxs(Box, { flexDirection: "column", flexGrow: 1, overflowY: "hidden", children: [messages.slice(-10).map((msg, i) => (_jsx(Box, { marginBottom: 1, children: _jsxs(Text, { color: msg.role === 'user' ? 'green' :
                                msg.role === 'assistant' ? 'cyan' :
                                    'gray', children: [msg.role === 'user' ? '> ' : msg.role === 'assistant' ? '  ' : '# ', msg.content] }) }, i))), isLoading && (_jsx(Text, { color: "yellow", children: "Thinking..." }))] }), _jsxs(Box, { borderStyle: "round", borderColor: isActive ? 'green' : 'gray', paddingX: 1, children: [_jsx(Text, { color: "green", children: "> " }), isTTY ? (_jsx(TextInput, { value: input, onChange: setInput, onSubmit: handleSubmit, focus: isActive, placeholder: "Type a message..." })) : (_jsx(Text, { color: "gray", children: "Input disabled (no TTY)" }))] })] }));
}
