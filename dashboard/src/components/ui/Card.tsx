import React from 'react';
import { Box, Text } from 'ink';

export interface CardProps {
  variant?: 'default' | 'elevated' | 'outlined';
  title?: string;
  padding?: number;
  width?: number | string;
  children: React.ReactNode;
}

const borderStyles = {
  default: 'single',
  elevated: 'double',
  outlined: 'round',
} as const;

export function Card({
  variant = 'default',
  title,
  padding = 1,
  width,
  children,
}: CardProps) {
  const content = typeof children === 'string' ? <Text>{children}</Text> : children;

  return (
    <Box
      flexDirection="column"
      borderStyle={borderStyles[variant]}
      borderColor="gray"
      paddingX={padding}
      paddingY={padding > 0 ? 0 : 0}
      width={width}
    >
      {title && (
        <Box marginBottom={1}>
          <Text bold color="white">
            {title}
          </Text>
        </Box>
      )}
      {content}
    </Box>
  );
}

export interface CardHeaderProps {
  children: React.ReactNode;
}

export function CardHeader({ children }: CardHeaderProps) {
  return (
    <Box marginBottom={1}>
      <Text bold color="white">
        {children}
      </Text>
    </Box>
  );
}

export interface CardBodyProps {
  children: React.ReactNode;
}

export function CardBody({ children }: CardBodyProps) {
  return (
    <Box flexDirection="column">
      {typeof children === 'string' ? <Text>{children}</Text> : children}
    </Box>
  );
}

export interface CardFooterProps {
  children: React.ReactNode;
}

export function CardFooter({ children }: CardFooterProps) {
  return (
    <Box marginTop={1}>
      <Text dimColor>
        {children}
      </Text>
    </Box>
  );
}
