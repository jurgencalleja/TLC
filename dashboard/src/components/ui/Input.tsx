import React from 'react';
import { Text, Box } from 'ink';
import TextInput from 'ink-text-input';

export interface InputProps {
  value?: string;
  placeholder?: string;
  label?: string;
  helperText?: string;
  error?: string;
  type?: 'text' | 'password';
  focus?: boolean;
  disabled?: boolean;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
}

export function Input({
  value = '',
  placeholder = '',
  label,
  helperText,
  error,
  type = 'text',
  focus = false,
  disabled = false,
  onChange = () => {},
  onSubmit,
}: InputProps) {
  const displayValue = type === 'password' ? '*'.repeat(value.length) : value;
  const borderColor = error ? 'red' : focus ? 'cyan' : 'gray';

  return (
    <Box flexDirection="column">
      {label && (
        <Box marginBottom={0}>
          <Text color="white" bold>
            {label}
          </Text>
        </Box>
      )}
      <Box>
        <Text color={borderColor}>[</Text>
        {disabled ? (
          <Text dimColor>{displayValue || placeholder}</Text>
        ) : focus ? (
          <TextInput
            value={value}
            placeholder={placeholder}
            onChange={onChange}
            onSubmit={onSubmit}
            mask={type === 'password' ? '*' : undefined}
          />
        ) : (
          <Text color={value ? 'white' : 'gray'}>
            {displayValue || placeholder}
          </Text>
        )}
        <Text color={borderColor}>]</Text>
      </Box>
      {error && (
        <Box>
          <Text color="red">✗ {error}</Text>
        </Box>
      )}
      {helperText && !error && (
        <Box>
          <Text dimColor>{helperText}</Text>
        </Box>
      )}
    </Box>
  );
}
