import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useState, useCallback } from 'react';
import { spawn } from 'child_process';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatPaneProps {
  isActive: boolean;
}

export function ChatPane({ isActive }: ChatPaneProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'system', content: 'TDD Dashboard ready. Type a message to start.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

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

  const handleSubmit = useCallback((value: string) => {
    sendMessage(value);
  }, [sendMessage]);

  return (
    <Box flexDirection="column" flexGrow={1} padding={1}>
      {/* Messages */}
      <Box flexDirection="column" flexGrow={1} overflowY="hidden">
        {messages.slice(-10).map((msg, i) => (
          <Box key={i} marginBottom={1}>
            <Text
              color={
                msg.role === 'user' ? 'green' :
                msg.role === 'assistant' ? 'cyan' :
                'gray'
              }
            >
              {msg.role === 'user' ? '> ' : msg.role === 'assistant' ? '  ' : '# '}
              {msg.content}
            </Text>
          </Box>
        ))}
        {isLoading && (
          <Text color="yellow">Thinking...</Text>
        )}
      </Box>

      {/* Input */}
      <Box borderStyle="round" borderColor={isActive ? 'green' : 'gray'} paddingX={1}>
        <Text color="green">{"> "}</Text>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          focus={isActive}
          placeholder="Type a message..."
        />
      </Box>
    </Box>
  );
}
