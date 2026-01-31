import React from 'react';
import { Box, Text } from 'ink';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: string[];
  actions?: React.ReactNode;
  status?: 'online' | 'offline' | 'busy';
}

const statusColors = {
  online: 'green',
  offline: 'gray',
  busy: 'yellow',
} as const;

export function Header({
  title,
  subtitle,
  breadcrumbs,
  actions,
  status,
}: HeaderProps) {
  return (
    <Box justifyContent="space-between" paddingX={1}>
      <Box>
        {status && (
          <Text color={statusColors[status]}>● </Text>
        )}
        <Text bold color="cyan">{title}</Text>
        {subtitle && (
          <Text dimColor> {subtitle}</Text>
        )}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Box marginLeft={2}>
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={i}>
                {i > 0 && <Text dimColor> › </Text>}
                <Text color={i === breadcrumbs.length - 1 ? 'white' : 'gray'}>
                  {crumb}
                </Text>
              </React.Fragment>
            ))}
          </Box>
        )}
      </Box>
      {actions && (
        <Box>
          {typeof actions === 'string' ? <Text>{actions}</Text> : actions}
        </Box>
      )}
    </Box>
  );
}
