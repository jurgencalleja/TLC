import React from 'react';
import { Text, Box } from 'ink';

export interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  showDot?: boolean;
  showBrackets?: boolean;
  children: React.ReactNode;
}

const variantColors = {
  success: 'green',
  warning: 'yellow',
  error: 'red',
  info: 'blue',
  neutral: 'gray',
} as const;

export function Badge({
  variant = 'neutral',
  size = 'md',
  showDot = false,
  showBrackets = true,
  children,
}: BadgeProps) {
  const color = variantColors[variant];

  return (
    <Box>
      {showBrackets && <Text color={color}>[</Text>}
      {showDot && <Text color={color}>● </Text>}
      <Text color={color} bold={size === 'md'}>
        {children}
      </Text>
      {showBrackets && <Text color={color}>]</Text>}
    </Box>
  );
}
