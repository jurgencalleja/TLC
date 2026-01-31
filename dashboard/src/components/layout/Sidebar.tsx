import React from 'react';
import { Box, Text } from 'ink';

export interface SidebarProps {
  title?: string;
  children: React.ReactNode;
}

export function Sidebar({ title, children }: SidebarProps) {
  return (
    <Box flexDirection="column" paddingY={1}>
      {title && (
        <Box marginBottom={1}>
          <Text bold color="cyan">{title}</Text>
        </Box>
      )}
      {children}
    </Box>
  );
}

export interface SidebarItemProps {
  label: string;
  icon?: string;
  active?: boolean;
  badge?: string;
  shortcut?: string;
}

export function SidebarItem({
  label,
  icon,
  active = false,
  badge,
  shortcut,
}: SidebarItemProps) {
  return (
    <Box>
      {shortcut && (
        <Text color="gray">[{shortcut}] </Text>
      )}
      {icon && <Text>{icon} </Text>}
      <Text
        bold={active}
        color={active ? 'cyan' : 'white'}
        inverse={active}
      >
        {label}
      </Text>
      {badge && (
        <Text color="yellow"> ({badge})</Text>
      )}
    </Box>
  );
}
