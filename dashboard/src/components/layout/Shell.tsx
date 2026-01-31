import React from 'react';
import { Box, Text } from 'ink';

export interface ShellProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  sidebar?: React.ReactNode;
  sidebarWidth?: number;
  showSidebar?: boolean;
  children: React.ReactNode;
}

export function Shell({
  header,
  footer,
  sidebar,
  sidebarWidth = 30,
  showSidebar = true,
  children,
}: ShellProps) {
  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Header */}
      {header && (
        <Box
          borderStyle="single"
          borderColor="gray"
          paddingX={1}
        >
          {typeof header === 'string' ? (
            <Text bold color="cyan">{header}</Text>
          ) : (
            header
          )}
        </Box>
      )}

      {/* Main content area */}
      <Box flexGrow={1} flexDirection="row">
        {/* Sidebar */}
        {sidebar && showSidebar && (
          <Box
            width={sidebarWidth}
            borderStyle="single"
            borderColor="gray"
            flexDirection="column"
            paddingX={1}
          >
            {typeof sidebar === 'string' ? <Text>{sidebar}</Text> : sidebar}
          </Box>
        )}

        {/* Main content */}
        <Box flexGrow={1} flexDirection="column" paddingX={1}>
          {typeof children === 'string' ? <Text>{children}</Text> : children}
        </Box>
      </Box>

      {/* Footer */}
      {footer && (
        <Box
          borderStyle="single"
          borderColor="gray"
          paddingX={1}
        >
          {typeof footer === 'string' ? (
            <Text dimColor>{footer}</Text>
          ) : (
            footer
          )}
        </Box>
      )}
    </Box>
  );
}
