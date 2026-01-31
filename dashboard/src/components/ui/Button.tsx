import React from 'react';
import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  showBrackets?: boolean;
  isFocused?: boolean;
  children: React.ReactNode;
}

const variantColors = {
  primary: 'blue',
  secondary: 'white',
  ghost: 'gray',
  danger: 'red',
} as const;

export function Button({
  variant = 'primary',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  showBrackets = true,
  isFocused = false,
  children,
}: ButtonProps) {
  const color = variantColors[variant];
  const dimmed = disabled || loading;

  return (
    <Box>
      {showBrackets && (
        <Text color={isFocused ? 'cyan' : 'gray'} dimColor={dimmed}>
          [
        </Text>
      )}
      {loading && (
        <Text color={color}>
          <Spinner type="dots" />
          {' '}
        </Text>
      )}
      {leftIcon && !loading && (
        <Text color={color} dimColor={dimmed}>
          {leftIcon}{' '}
        </Text>
      )}
      <Text
        color={color}
        bold={variant === 'primary' || isFocused}
        dimColor={dimmed}
      >
        {children}
      </Text>
      {rightIcon && !loading && (
        <Text color={color} dimColor={dimmed}>
          {' '}{rightIcon}
        </Text>
      )}
      {showBrackets && (
        <Text color={isFocused ? 'cyan' : 'gray'} dimColor={dimmed}>
          ]
        </Text>
      )}
    </Box>
  );
}
